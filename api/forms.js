/**
 * Unified form submissions — contact + feedback.
 *
 * Replaces:  contact-submit.js  (POST /api/contact-submit)
 *            feedback-submit.js (POST /api/feedback-submit)
 *
 * Dispatch:  by URL path via vercel.json rewrites.
 *            Falls back to body.type ('contact' | 'feedback').
 */
import { withRateLimit } from './_lib/with-rate-limit.js';

const ALLOWED_SUBJECTS = ['Feedback', 'Bug Report', 'Complaint', 'Billing', 'General Inquiry', 'Other', 'General'];
const ALLOWED_CATEGORIES = ['Feature Request', 'Bug Report', 'Complaint', 'Billing Issue', 'General Feedback', 'General'];

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function detectFormType(req) {
  const url = req.url || '';
  if (url.includes('feedback')) return 'feedback';
  if (url.includes('contact')) return 'contact';
  return req.body?.type || 'contact';
}

function validateSupabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch { return false; }
}

// ─── Contact handler ────────────────────────────────────────────────────────

async function handleContact(req, res, supabaseUrl, serviceRoleKey) {
  const { name, email, subject, message } = req.body || {};

  if (!email || typeof email !== 'string' || !message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Email and message are required.' });
  }
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });
  if (typeof name === 'string' && name.length > 200) return res.status(400).json({ error: 'Name too long (max 200 chars).' });
  if (typeof subject === 'string' && subject.length > 500) return res.status(400).json({ error: 'Subject too long (max 500 chars).' });
  if (message.trim().length === 0 || message.length > 5000) return res.status(400).json({ error: 'Message too long (max 5000 chars).' });

  const sanitized = {
    name: typeof name === 'string' ? name.trim().slice(0, 200) : null,
    email: email.trim().toLowerCase().slice(0, 254),
    subject: ALLOWED_SUBJECTS.includes(subject) ? subject : 'General',
    message: message.trim().slice(0, 5000),
  };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/contact_submissions`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
      },
      body: JSON.stringify(sanitized),
    });
    if (!response.ok) return res.status(500).json({ error: 'Failed to save message.' });
    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── Feedback handler ───────────────────────────────────────────────────────

async function handleFeedback(req, res, supabaseUrl, serviceRoleKey) {
  const { name, email, category, subject, message } = req.body || {};

  if (!email || typeof email !== 'string' || !message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Email and message are required.' });
  }
  if (!category || typeof category !== 'string') return res.status(400).json({ error: 'Category is required.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });
  if (typeof name === 'string' && name.length > 200) return res.status(400).json({ error: 'Name too long (max 200 chars).' });
  if (typeof subject === 'string' && subject.length > 200) return res.status(400).json({ error: 'Subject too long (max 200 chars).' });
  if (message.trim().length === 0 || message.length > 4000) return res.status(400).json({ error: 'Message must be between 1 and 4000 characters.' });

  const sanitized = {
    name: typeof name === 'string' ? name.trim().slice(0, 200) : null,
    email: email.trim().toLowerCase().slice(0, 254),
    category: ALLOWED_CATEGORIES.includes(category) ? category : 'General Feedback',
    subject: typeof subject === 'string' ? subject.trim().slice(0, 200) : null,
    message: message.trim().slice(0, 4000),
  };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/feedback_submissions`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
      },
      body: JSON.stringify(sanitized),
    });
    if (!response.ok) return res.status(500).json({ error: 'Failed to save message.' });

    // Email notification (best-effort)
    const resendKey = process.env.RESEND_API_KEY;
    const feedbackEmail = process.env.FEEDBACK_EMAIL || 'mytrut@gmail.com';
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: 'InvoiceSaga Feedback <noreply@invoicesaga.com>',
            to: [feedbackEmail],
            reply_to: sanitized.email,
            subject: `[${sanitized.category}] ${sanitized.subject || 'New feedback'}`,
            html: [
              `<h2 style="margin:0 0 12px">New feedback submission</h2>`,
              `<p><strong>From:</strong> ${sanitized.name || 'Anonymous'} &lt;${sanitized.email}&gt;</p>`,
              `<p><strong>Category:</strong> ${sanitized.category}</p>`,
              sanitized.subject ? `<p><strong>Subject:</strong> ${sanitized.subject}</p>` : '',
              `<hr style="border:none;border-top:1px solid #eee;margin:16px 0">`,
              `<p style="white-space:pre-wrap">${sanitized.message}</p>`,
            ].join(''),
          }),
        });
      } catch { /* email is best-effort */ }
    }

    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────

async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');

  const supabaseUrl = process.env.SUPABASE_URL || 'https://oecvlkllkpyfpgczqwii.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return res.status(503).json({ error: 'Server not configured.' });
  if (!validateSupabaseUrl(supabaseUrl)) return res.status(503).json({ error: 'Server not configured.' });

  const formType = detectFormType(req);

  if (formType === 'feedback') return handleFeedback(req, res, supabaseUrl, serviceRoleKey);
  return handleContact(req, res, supabaseUrl, serviceRoleKey);
}

export default withRateLimit(handler, { limit: 60, prefix: 'forms' });
