function parseRequestBody(body) {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body;
}

  function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    }

    const payload = parseRequestBody(req.body);
    if (!payload) {
      return res.status(400).json({ error: 'Invalid JSON request body' });
    }

  const { to, cc, subject, htmlBody, documentType, documentNumber, replyTo, fromName, attachmentBase64, attachmentFilename } = payload;

    if (!to || !subject || !htmlBody) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, htmlBody' });
    }

    if (!isValidEmail(to)) {
      return res.status(400).json({ error: 'Invalid recipient email address' });
    }

    const senderName = (fromName && fromName.trim()) ? fromName.trim() : "InvoiceSaga";
    const resendPayload = {
      from: `${senderName} <noreply@invoicesaga.com>`,
      to: [to],
      subject,
      html: htmlBody,
    };

    if (cc && isValidEmail(cc)) {
      resendPayload.cc = [cc];
    }

    if (replyTo && isValidEmail(replyTo)) {
      resendPayload.reply_to = replyTo;
    }

    if (attachmentBase64 && attachmentFilename) {
      resendPayload.attachments = [{
        filename: attachmentFilename,
        content: attachmentBase64,
      }];
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      const apiError = result?.error?.message || result?.message || 'Failed to send email via Resend';
      return res.status(response.status).json({ error: apiError });
    }

    return res.status(200).json({
      ok: true,
      emailId: result?.id,
      documentType,
      documentNumber,
    });
  } catch (error) {
    console.error('send-document function error:', error);
    return res.status(500).json({
      error: 'A server error has occurred while sending email',
      details: error.message,
    });
  }
}
