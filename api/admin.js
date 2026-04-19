/**
 * Unified admin endpoint — login + data retrieval.
 *
 * Replaces:  admin-login.js (POST /api/admin-login)
 *            admin-data.js  (GET  /api/admin-data)
 *
 * Dispatch:  POST → login,  GET → data
 * Old URLs are preserved via vercel.json rewrites.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { withRateLimit } from './_lib/with-rate-limit.js';

const TOKEN_TTL_SECONDS = 3600; // 1 hour

// ─── Shared helpers ─────────────────────────────────────────────────────────

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

function verifyAdminToken(token, secret) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length) return false;
  if (!timingSafeEqual(expectedBuf, sigBuf)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return payload.admin === true && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────

async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword) return res.status(503).json({ error: 'Not configured' });

  // ── POST: Login ─────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { password } = req.body || {};
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password required' });
    }

    const pwBuf = Buffer.from(password.slice(0, 1000));
    const secretBuf = Buffer.from(adminPassword);
    const isValid = pwBuf.length === secretBuf.length &&
      timingSafeEqual(pwBuf, secretBuf);

    if (!isValid) {
      await new Promise(r => setTimeout(r, 300));
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = createAdminToken(adminPassword);
    return res.status(200).json({ token });
  }

  // ── GET: Data ───────────────────────────────────────────────────────────
  if (req.method === 'GET') {
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

      return res.status(200).json({ profiles, contactSubmissions, agentObjectives, agentTasks });
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── DELETE: Remove objective(s) ─────────────────────────────────────────
  if (req.method === 'DELETE') {
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

    const { objectiveId, all } = req.body || {};
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let logsUrl, specsUrl, objectivesUrl;
    if (all === true) {
      logsUrl       = `${supabaseUrl}/rest/v1/agent_logs?id=not.is.null`;
      specsUrl      = `${supabaseUrl}/rest/v1/agent_task_specs?id=not.is.null`;
      objectivesUrl = `${supabaseUrl}/rest/v1/agent_objectives?id=not.is.null`;
    } else if (typeof objectiveId === 'string' && UUID_RE.test(objectiveId)) {
      logsUrl       = `${supabaseUrl}/rest/v1/agent_logs?objective_id=eq.${objectiveId}`;
      specsUrl      = `${supabaseUrl}/rest/v1/agent_task_specs?objective_id=eq.${objectiveId}`;
      objectivesUrl = `${supabaseUrl}/rest/v1/agent_objectives?id=eq.${objectiveId}`;
    } else {
      return res.status(400).json({ error: 'Provide objectiveId (uuid) or all:true' });
    }

    const headers = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'return=minimal',
    };

    try {
      const logsRes = await fetch(logsUrl, { method: 'DELETE', headers });
      if (!logsRes.ok && logsRes.status !== 404) {
        return res.status(500).json({ error: 'Failed to delete logs' });
      }
      const specsRes = await fetch(specsUrl, { method: 'DELETE', headers });
      if (!specsRes.ok && specsRes.status !== 404) {
        return res.status(500).json({ error: 'Failed to delete specs' });
      }
      const objRes = await fetch(objectivesUrl, { method: 'DELETE', headers });
      if (!objRes.ok) {
        return res.status(500).json({ error: 'Failed to delete objective' });
      }
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withRateLimit(handler, { limit: 30, prefix: 'admin' });
