/**
 * Feedback form submission endpoint — validates input, applies rate limiting,
 * and persists to Supabase feedback_submissions.
 * SUPABASE_URL is validated to be a legitimate supabase.co HTTPS endpoint before use.
 */
import { withRateLimit } from './lib/with-rate-limit.js';

const ALLOWED_CATEGORIES = [
  'Feature Request', 'Bug Report', 'Complaint',
  'Billing Issue', 'General Feedback', 'General',
];

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');

  const { name, email, category, subject, message } = req.body || {};

  // Required fields
  if (!email || typeof email !== 'string' || !message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Email and message are required.' });
  }

  if (!category || typeof category !== 'string') {
    return res.status(400).json({ error: 'Category is required.' });
  }

  // Email format validation
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Length limits
  if (typeof name === 'string' && name.length > 200) {
    return res.status(400).json({ error: 'Name too long (max 200 chars).' });
  }
  if (typeof subject === 'string' && subject.length > 200) {
    return res.status(400).json({ error: 'Subject too long (max 200 chars).' });
  }
  if (message.trim().length === 0 || message.length > 4000) {
    return res.status(400).json({ error: 'Message must be between 1 and 4000 characters.' });
  }

  // Sanitize
  const sanitized = {
    name: typeof name === 'string' ? name.trim().slice(0, 200) : null,
    email: email.trim().toLowerCase().slice(0, 254),
    category: ALLOWED_CATEGORIES.includes(category) ? category : 'General Feedback',
    subject: typeof subject === 'string' ? subject.trim().slice(0, 200) : null,
    message: message.trim().slice(0, 4000),
  };

  const supabaseUrl = process.env.SUPABASE_URL || 'https://oecvlkllkpyfpgczqwii.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(503).json({ error: 'Server not configured.' });
  }

  // Validate SUPABASE_URL before use
  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
      return res.status(503).json({ error: 'Server not configured.' });
    }
  } catch {
    return res.status(503).json({ error: 'Server not configured.' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/feedback_submissions`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(sanitized),
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to save message.' });
    }

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withRateLimit(handler, { limit: 10, prefix: 'feedback' });
