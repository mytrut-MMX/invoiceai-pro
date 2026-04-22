// handleSendInvoice — client-built email path. Mirrors the original
// api/send-document.js behaviour exactly: caller supplies to/subject/htmlBody
// and (optionally) a base64 PDF attachment + display-name override.
//
// ctx: { userId, payload, resendKey } — dispatcher has already authenticated,
// parsed the body, and populated env. This handler never touches env itself.

import {
  isValidEmail, stripDangerousHtml, validateFromName, sendResendEmail,
} from './send-shared.js';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export async function handleSendInvoice(req, res, ctx) {
  const payload = ctx.payload;
  if (!payload) return res.status(400).json({ error: 'Invalid JSON request body' });

  const {
    to, cc, subject, htmlBody, documentType, documentNumber,
    replyTo, fromName, attachmentBase64, attachmentFilename,
  } = payload;

  if (!to || !subject || !htmlBody) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, htmlBody' });
  }
  if (!isValidEmail(to)) {
    return res.status(400).json({ error: 'Invalid recipient email address' });
  }

  const nameCheck = validateFromName(fromName);
  if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error });

  if (attachmentBase64 || attachmentFilename) {
    if (typeof attachmentFilename !== 'string' || !/\.pdf$/i.test(attachmentFilename)) {
      return res.status(400).json({ error: 'Only PDF attachments are allowed' });
    }
    if (typeof attachmentBase64 !== 'string') {
      return res.status(400).json({ error: 'Invalid attachment encoding' });
    }
    let attachmentBytes;
    try { attachmentBytes = Buffer.from(attachmentBase64, 'base64').length; }
    catch { return res.status(400).json({ error: 'Invalid attachment encoding' }); }
    if (attachmentBytes > MAX_ATTACHMENT_BYTES) {
      return res.status(400).json({ error: 'Attachment too large (5MB max)' });
    }
  }

  const senderName = nameCheck.value || 'InvoiceSaga';
  const resendPayload = {
    from: `${senderName} <noreply@invoicesaga.com>`,
    to: [to],
    subject,
    html: stripDangerousHtml(htmlBody),
  };
  if (cc && isValidEmail(cc)) resendPayload.cc = [cc];
  if (replyTo && isValidEmail(replyTo)) resendPayload.reply_to = replyTo;
  if (attachmentBase64 && attachmentFilename) {
    resendPayload.attachments = [{ filename: attachmentFilename, content: attachmentBase64 }];
  }

  const { ok, status, data } = await sendResendEmail(ctx.resendKey, resendPayload);
  if (!ok) {
    const apiError = data?.error?.message || data?.message || 'Failed to send email via Resend';
    return res.status(status).json({ error: apiError });
  }

  return res.status(200).json({
    ok: true,
    emailId: data?.id,
    documentType,
    documentNumber,
  });
}
