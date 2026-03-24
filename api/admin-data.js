// AUTH-001: Validates a signed HMAC-SHA256 token (issued by /api/admin-login).
// The raw admin password is never re-transmitted after login.
import { createHmac, timingSafeEqual } from 'crypto';

function verifyAdminToken(token, secret) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  // Constant-time signature verification
  const expected = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length) return false;
  if (!timingSafeEqual(expectedBuf, sigBuf)) return false;

  // Validate expiry
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return payload.admin === true && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return res.status(503).json({ error: 'Not configured' });

  // AUTH-001: Accept signed HMAC token — not raw password
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!verifyAdminToken(token, adminPassword)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: 'Supabase not configured on server' });
  }

  // SSRF-001: Validate SUPABASE_URL is a legitimate supabase.co HTTPS endpoint
  // Prevents SSRF if env var is misconfigured or set to internal network address
  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
      return res.status(503).json({ error: 'Invalid database configuration' });
    }
  } catch {
    return res.status(503).json({ error: 'Invalid database configuration' });
  }

  const headers = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  // HDR-004: Prevent caching of sensitive admin data
  res.setHeader('Cache-Control', 'no-store');

  try {
    const [profilesRes, contactRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/profiles?select=*&order=created_at.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/contact_submissions?select=*&order=created_at.desc`, { headers }),
    ]);

    const profiles = profilesRes.ok ? await profilesRes.json() : [];
    const contactSubmissions = contactRes.ok ? await contactRes.json() : [];

    res.status(200).json({ profiles, contactSubmissions });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
