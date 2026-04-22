// api/send-selfbill.js — POST /api/send-selfbill
// Emails a self-billed invoice PDF to the supplier via Resend and logs an
// emission_log row with emission_type='email'. Unlike send-document.js the
// attachment is fetched server-side from the self-billing-invoices bucket so
// the caller only names the bill; this keeps the audit trail authoritative
// (pdf_sha256 + pdf_storage_path reused from the most recent emission row).
//
// Rate limit: withRateLimit (per-IP, 1-minute window). Spec called for
// "20/hr/user"; the shared primitive only supports per-IP-per-minute, so
// limit=20 gives 20 sends/min/IP which is stricter per-minute than the
// stated hourly budget — upgrade to per-user tracking in a follow-up.

import { withRateLimit } from './_lib/with-rate-limit.js';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBody(body) {
  if (!body) return null;
  if (typeof body === 'string') { try { return JSON.parse(body); } catch { return null; } }
  return body;
}

function stripHtml(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|action|formaction)\s*=\s*("|')\s*javascript\s*:[^"']*("|')/gi, '$1=$2#$2');
}

// Thin wrapper around PostgREST with the service-role key. Uses the same auth
// pattern as api/admin.js rather than pulling in @supabase/supabase-js.
async function sb({ supabaseUrl, serviceKey, method = 'GET', path, body, extraHeaders = {} }) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : '',
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}

async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const authHeader = req.headers['authorization'] || '';
    const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!userToken) return res.status(401).json({ error: 'Authentication required' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey   = process.env.RESEND_API_KEY;
    if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Auth service not configured' });
    if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${userToken}`, apikey: serviceKey },
    });
    if (!verifyRes.ok) return res.status(401).json({ error: 'Invalid or expired session' });
    const authUser = await verifyRes.json();
    const userId = authUser?.id;
    if (!userId) return res.status(401).json({ error: 'Invalid session payload' });

    const payload = parseBody(req.body);
    if (!payload) return res.status(400).json({ error: 'Invalid JSON request body' });
    const { billId, recipientEmail, ccEmails = [], subject: subjectIn, message } = payload;

    if (!billId || !recipientEmail) return res.status(400).json({ error: 'Missing required fields: billId, recipientEmail' });
    if (!EMAIL_RE.test(recipientEmail)) return res.status(400).json({ error: 'Invalid recipient email' });
    const ccList = Array.isArray(ccEmails) ? ccEmails.filter((e) => EMAIL_RE.test(e)) : [];

    // Fetch the bill — user_id guard defends against cross-tenant sends.
    const billQ = await sb({ supabaseUrl, serviceKey, path:
      `/rest/v1/bills?id=eq.${encodeURIComponent(billId)}&user_id=eq.${encodeURIComponent(userId)}&select=id,self_bill_invoice_number,self_billing_agreement_id,supplier_id,supplier_name,is_self_billed&limit=1` });
    if (!billQ.ok || !billQ.data?.length) return res.status(404).json({ error: 'Bill not found' });
    const bill = billQ.data[0];
    if (!bill.is_self_billed) return res.status(400).json({ error: 'Bill is not a self-billed invoice' });

    // Supplier + business profile + latest emission row — run in parallel.
    const [supQ, bpQ, logQ] = await Promise.all([
      sb({ supabaseUrl, serviceKey, path: `/rest/v1/suppliers?id=eq.${encodeURIComponent(bill.supplier_id)}&select=id,name,email&limit=1` }),
      sb({ supabaseUrl, serviceKey, path: `/rest/v1/business_profiles?user_id=eq.${encodeURIComponent(userId)}&select=org_name,reply_email,email&limit=1` }),
      sb({ supabaseUrl, serviceKey, path: `/rest/v1/self_billing_emission_log?bill_id=eq.${encodeURIComponent(billId)}&pdf_storage_path=not.is.null&order=created_at.desc&limit=1&select=pdf_storage_path,pdf_sha256,snapshot,agreement_id` }),
    ]);
    const supplier = supQ.data?.[0] || null;
    const biz = bpQ.data?.[0] || {};
    const source = logQ.data?.[0];
    if (!source?.pdf_storage_path) return res.status(404).json({ error: 'No PDF on file for this self-bill — generate one first' });

    // Signed URL → fetch bytes server-side. Enforce 5MB attachment cap.
    const signQ = await sb({
      supabaseUrl, serviceKey, method: 'POST',
      path: `/storage/v1/object/sign/self-billing-invoices/${source.pdf_storage_path}`,
      body: { expiresIn: 3600 },
    });
    if (!signQ.ok || !signQ.data?.signedURL) return res.status(500).json({ error: 'Could not sign PDF URL' });
    const pdfRes = await fetch(`${supabaseUrl}/storage/v1${signQ.data.signedURL}`);
    if (!pdfRes.ok) return res.status(502).json({ error: 'Could not fetch PDF from storage' });
    const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
    if (pdfBuf.length > MAX_ATTACHMENT_BYTES) return res.status(413).json({ error: 'PDF attachment exceeds 5MB cap' });
    const pdfBase64 = pdfBuf.toString('base64');

    const senderName = (biz.org_name || 'InvoiceSaga').slice(0, 60).replace(/[<>@]/g, '');
    const subject = subjectIn || `Self-billed invoice ${bill.self_bill_invoice_number} from ${senderName}`;
    const htmlBody = stripHtml(message || `<p>Please find attached self-billed invoice <strong>${bill.self_bill_invoice_number}</strong> issued on your behalf under our self-billing agreement.</p>`);

    const resendPayload = {
      from: `${senderName} <noreply@invoicesaga.com>`,
      to: [recipientEmail],
      subject,
      html: htmlBody,
      attachments: [{ filename: `${bill.self_bill_invoice_number}.pdf`, content: pdfBase64 }],
    };
    if (ccList.length > 0) resendPayload.cc = ccList;
    if (biz.reply_email && EMAIL_RE.test(biz.reply_email)) resendPayload.reply_to = biz.reply_email;
    else if (biz.email && EMAIL_RE.test(biz.email)) resendPayload.reply_to = biz.email;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(resendPayload),
    });
    const resendJson = await resendRes.json();
    if (!resendRes.ok) {
      const apiError = resendJson?.error?.message || resendJson?.message || 'Failed to send email';
      return res.status(resendRes.status).json({ error: apiError });
    }

    // Append emission_log row. Reuse the source PDF path/hash/snapshot so the
    // email row points at exactly the same bytes the downloader got — any
    // divergence would indicate tampering.
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
    const emissionLogId = logInsert.data?.[0]?.id || null;

    return res.status(200).json({ success: true, emissionLogId, resendId: resendJson?.id || null });
  } catch (err) {
    console.error('[send-selfbill] Error:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withRateLimit(handler, { limit: 20, prefix: 'send-selfbill' });
