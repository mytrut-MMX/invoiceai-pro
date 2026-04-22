// handleSendSelfbill — emails a self-billed invoice PDF to the supplier.
// Unlike the invoice handler, the attachment is fetched server-side from the
// self-billing-invoices bucket so the audit trail (pdf_sha256 +
// pdf_storage_path on the emission_log row) is authoritative — the email row
// reuses exactly the same bytes a download row points at.
//
// ctx: { userId, payload, supabaseUrl, serviceKey, resendKey } — dispatcher
// has authenticated and populated env.

import { isValidEmail, stripDangerousHtml, sanitizeServerSideName, sendResendEmail, sb } from './send-shared.js';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export async function handleSendSelfbill(req, res, ctx) {
  const { userId, payload, supabaseUrl, serviceKey, resendKey } = ctx;
  const { billId, recipientEmail, ccEmails = [], subject: subjectIn, message } = payload || {};

  if (!billId || !recipientEmail) {
    return res.status(400).json({ error: 'Missing required fields: billId, recipientEmail' });
  }
  if (!isValidEmail(recipientEmail)) {
    return res.status(400).json({ error: 'Invalid recipient email' });
  }
  const ccList = Array.isArray(ccEmails) ? ccEmails.filter(isValidEmail) : [];

  // Bill + user_id guard — prevents cross-tenant sends even if the dispatcher
  // auth were somehow bypassed.
  const billQ = await sb({ supabaseUrl, serviceKey, path:
    `/rest/v1/bills?id=eq.${encodeURIComponent(billId)}&user_id=eq.${encodeURIComponent(userId)}&select=id,self_bill_invoice_number,self_billing_agreement_id,supplier_id,supplier_name,is_self_billed&limit=1` });
  if (!billQ.ok || !billQ.data?.length) return res.status(404).json({ error: 'Bill not found' });
  const bill = billQ.data[0];
  if (!bill.is_self_billed) return res.status(400).json({ error: 'Bill is not a self-billed invoice' });

  // Supplier + business_profile + newest emission_log row, parallel.
  const [supQ, bpQ, logQ] = await Promise.all([
    sb({ supabaseUrl, serviceKey, path:
      `/rest/v1/suppliers?id=eq.${encodeURIComponent(bill.supplier_id)}&select=id,name,email&limit=1` }),
    sb({ supabaseUrl, serviceKey, path:
      `/rest/v1/business_profiles?user_id=eq.${encodeURIComponent(userId)}&select=org_name,reply_email,email&limit=1` }),
    sb({ supabaseUrl, serviceKey, path:
      `/rest/v1/self_billing_emission_log?bill_id=eq.${encodeURIComponent(billId)}&pdf_storage_path=not.is.null&order=created_at.desc&limit=1&select=pdf_storage_path,pdf_sha256,snapshot,agreement_id` }),
  ]);
  const biz = bpQ.data?.[0] || {};
  const source = logQ.data?.[0];
  if (!source?.pdf_storage_path) {
    return res.status(404).json({ error: 'No PDF on file for this self-bill — generate one first' });
  }

  // Storage-signed URL → fetch bytes server-side. Reject if > 5MB.
  const signQ = await sb({
    supabaseUrl, serviceKey, method: 'POST',
    path: `/storage/v1/object/sign/self-billing-invoices/${source.pdf_storage_path}`,
    body: { expiresIn: 3600 },
  });
  if (!signQ.ok || !signQ.data?.signedURL) {
    return res.status(500).json({ error: 'Could not sign PDF URL' });
  }
  const pdfRes = await fetch(`${supabaseUrl}/storage/v1${signQ.data.signedURL}`);
  if (!pdfRes.ok) return res.status(502).json({ error: 'Could not fetch PDF from storage' });
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  if (pdfBuf.length > MAX_ATTACHMENT_BYTES) {
    return res.status(413).json({ error: 'PDF attachment exceeds 5MB cap' });
  }
  const pdfBase64 = pdfBuf.toString('base64');

  const senderName = sanitizeServerSideName(biz.org_name);
  const subject = subjectIn || `Self-billed invoice ${bill.self_bill_invoice_number} from ${senderName}`;
  const htmlBody = stripDangerousHtml(message || `<p>Please find attached self-billed invoice <strong>${bill.self_bill_invoice_number}</strong> issued on your behalf under our self-billing agreement.</p>`);

  const resendPayload = {
    from: `${senderName} <noreply@invoicesaga.com>`,
    to: [recipientEmail],
    subject,
    html: htmlBody,
    attachments: [{ filename: `${bill.self_bill_invoice_number}.pdf`, content: pdfBase64 }],
  };
  if (ccList.length > 0) resendPayload.cc = ccList;
  if (biz.reply_email && isValidEmail(biz.reply_email)) resendPayload.reply_to = biz.reply_email;
  else if (biz.email && isValidEmail(biz.email)) resendPayload.reply_to = biz.email;

  const { ok, status, data: resendJson } = await sendResendEmail(resendKey, resendPayload);
  if (!ok) {
    const apiError = resendJson?.error?.message || resendJson?.message || 'Failed to send email';
    return res.status(status).json({ error: apiError });
  }

  // Append emission_log row reusing source pdf_sha256 + snapshot so the email
  // entry points at exactly the same bytes the downloader got.
  const logInsert = await sb({
    supabaseUrl, serviceKey, method: 'POST', path: '/rest/v1/self_billing_emission_log',
    body: [{
      user_id: userId, bill_id: billId, supplier_id: bill.supplier_id,
      agreement_id: source.agreement_id || bill.self_billing_agreement_id,
      self_bill_number: bill.self_bill_invoice_number,
      emission_type: 'email',
      email_sent_to: recipientEmail, email_resend_id: resendJson?.id || null,
      pdf_storage_path: source.pdf_storage_path, pdf_sha256: source.pdf_sha256,
      snapshot: source.snapshot,
    }],
  });

  // Audit log is non-rollbackable (the email has already left Resend). If
  // the insert fails we still report success for the email but flag the
  // missing audit row via HTTP 207 Multi-Status + a `warning` field. The
  // client surfaces an amber toast so the user can open a support ticket
  // with the Resend ID before it drops out of the Resend retention window.
  if (!logInsert.ok) {
    console.error('[send-selfbill] audit log insert failed',
      logInsert.status, JSON.stringify(logInsert.data));
    return res.status(207).json({
      success: true,
      emissionLogId: null,
      resendId: resendJson?.id || null,
      warning: 'email_sent_but_audit_log_failed',
    });
  }

  const emissionLogId = logInsert.data?.[0]?.id || null;
  return res.status(200).json({
    success: true,
    emissionLogId,
    resendId: resendJson?.id || null,
  });
}
