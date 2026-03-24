// AUTH-001: Admin login endpoint — validates password, issues a signed HMAC-SHA256 session token.
// Subsequent requests to /api/admin-data use the token, not the raw password.
import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_SECONDS = 3600; // 1 hour

function createAdminToken(secret) {
  const payload = JSON.stringify({
    admin: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) return res.status(503).json({ error: 'Not configured' });
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password required' });
  }

  // AUTH-001: Constant-time comparison to prevent timing attacks
  const pwBuf = Buffer.from(password);
  const secretBuf = Buffer.from(adminPassword);
  const isValid = pwBuf.length === secretBuf.length &&
    timingSafeEqual(pwBuf, secretBuf);

  if (!isValid) {
    // Generic delay to slow down brute-force
    await new Promise(r => setTimeout(r, 300));
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = createAdminToken(adminPassword);
  res.status(200).json({ token });
}
