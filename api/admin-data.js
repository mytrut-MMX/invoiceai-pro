/**
 * Admin data endpoint — requires a valid session token from /api/admin-login.
 * Fetches profiles and contact submissions from Supabase using the service role key.
 * Token is verified with constant-time HMAC-SHA256 comparison; SUPABASE_URL is
 * validated to be a legitimate supabase.co HTTPS endpoint before any fetch.
 */
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

  // ADMIN_PASSWORD is used both as the password and as the HMAC secret
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword) return res.status(503).json({ error: 'Not configured' });

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!verifyAdminToken(token, adminPassword)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://oecvlkllkpyfpgczqwii.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(503).json({ error: 'Supabase not configured on server' });
  }

  // Validate SUPABASE_URL before use
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

  res.setHeader('Cache-Control', 'no-store');

  try {
    const [profilesRes, contactRes, objectivesRes, tasksRes] = await Promise.all([
  fetch(`${supabaseUrl}/rest/v1/profiles?select=*&order=created_at.desc`, { headers }),
  fetch(`${supabaseUrl}/rest/v1/contact_submissions?select=*&order=created_at.desc`, { headers }),
  fetch(`${supabaseUrl}/rest/v1/agent_objectives?select=*&order=created_at.desc`, { headers }),
  fetch(`${supabaseUrl}/rest/v1/agent_tasks?select=objective_id&id`, { headers }),
]);

    const profiles = profilesRes.ok ? await profilesRes.json() : [];
const contactSubmissions = contactRes.ok ? await contactRes.json() : [];
const agentObjectives = objectivesRes.ok ? await objectivesRes.json() : [];
const agentTasks = tasksRes.ok ? await tasksRes.json() : [];

res.status(200).json({
  profiles,
  contactSubmissions,
  agentObjectives,
  agentTasks
});
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
