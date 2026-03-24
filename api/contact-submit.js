// SEC-009: In-memory rate limiter (per IP, max 5 requests per 10 minutes)
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.reset) {
    entry.count = 1;
    entry.reset = now + RATE_LIMIT_WINDOW_MS;
  } else {
    entry.count += 1;
  }
  rateLimitMap.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

// SEC-013: Allowed subject values (enum)
const ALLOWED_SUBJECTS = ['Feedback', 'Bug Report', 'Complaint', 'Billing', 'General Inquiry', 'Other', 'General'];

// SEC-013: Simple email format validation
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // HDR-004: Prevent caching of API responses
  res.setHeader('Cache-Control', 'no-store');

  // SEC-009: Rate limiting by IP
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { name, email, subject, message } = req.body || {};

  // SEC-013: Server-side input validation
  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > 5000) {
    return res.status(400).json({ error: 'Message must be between 1 and 5000 characters.' });
  }
  if (name && (typeof name !== 'string' || name.length > 100)) {
    return res.status(400).json({ error: 'Name must be 100 characters or fewer.' });
  }

  // SEC-013: Enforce subject enum
  const safeSubject = ALLOWED_SUBJECTS.includes(subject) ? subject : 'General';

  const supabaseUrl = process.env.SUPABASE_URL || 'https://oecvlkllkpyfpgczqwii.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(503).json({ error: 'Server not configured.' });
  }

  // SSRF-001: Validate SUPABASE_URL is a legitimate supabase.co HTTPS endpoint
  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
      return res.status(503).json({ error: 'Server not configured.' });
    }
  } catch {
    return res.status(503).json({ error: 'Server not configured.' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/contact_submissions`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        name: name ? name.trim().slice(0, 100) : null,
        email: email.toLowerCase().trim(),
        subject: safeSubject,
        message: message.trim(),
      }),
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to save message.' });
    }

    res.status(200).json({ success: true });
  } catch {
    // SEC-015: Do not expose internal error details
    res.status(500).json({ error: 'Internal server error' });
  }
}
