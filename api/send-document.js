import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }
  
  const resend = new Resend(process.env.RESEND_API_KEY);

  const {
    to,
    cc,
    subject,
    htmlBody,
    documentType,
    documentNumber,
    replyTo,
  } = req.body;

  if (!to || !subject || !htmlBody) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, htmlBody' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: 'Invalid recipient email address' });
  }

  try {
    const emailOptions = {
      from: 'InvoiceSaga <noreply@invoicesaga.com>',
      to: [to],
      subject,
      html: htmlBody,
    };

    if (cc && emailRegex.test(cc)) {
      emailOptions.cc = [cc];
    }

    if (replyTo && emailRegex.test(replyTo)) {
      emailOptions.reply_to = replyTo;
    }

    const result = await resend.emails.send(emailOptions);

    return res.status(200).json({
      ok: true,
      emailId: result.id,
      documentType,
      documentNumber,
    });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message,
    });
  }
}
