/**
 * HMRC OAuth 2.0 Authorization Code flow for MTD for VAT.
 *
 * GET  /api/hmrc-auth              → redirects to HMRC authorisation page
 * POST /api/hmrc-auth?action=callback  → exchanges auth code for tokens
 * POST /api/hmrc-auth?action=refresh   → refreshes an expired access token
 *
 * Tokens are encrypted with AES-256-GCM before storage in Supabase.
 *
 * Environment variables:
 *   HMRC_CLIENT_ID, HMRC_CLIENT_SECRET, HMRC_TOKEN_SECRET
 *   HMRC_BASE_URL (default: https://test-api.service.hmrc.gov.uk)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';
import { withRateLimit } from './lib/with-rate-limit.js';
import { buildFraudPreventionHeaders } from './lib/hmrc-headers.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const HMRC_BASE = () => process.env.HMRC_BASE_URL || 'https://test-api.service.hmrc.gov.uk';
const HMRC_SCOPES = 'read:vat write:vat';
const ALGO = 'aes-256-gcm';

// ─── Encryption helpers ─────────────────────────────────────────────────────

/** Derive a 32-byte key from the token secret via HMAC-SHA256. */
function deriveKey(secret) {
  return createHmac('sha256', secret).update('hmrc-token-key').digest();
}

/** Encrypt a plaintext string → "iv:ciphertext:tag" (hex-encoded). */
function encrypt(plaintext, secret) {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

/** Decrypt an "iv:ciphertext:tag" string back to plaintext. */
function decrypt(encoded, secret) {
  const key = deriveKey(secret);
  const [ivHex, encHex, tagHex] = encoded.split(':');
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(encHex, 'hex', 'utf8') + decipher.final('utf8');
}

// ─── Supabase helpers ───────────────────────────────────────────────────────

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

function supabaseUrl() {
  return process.env.SUPABASE_URL;
}

/** Verify the caller's Supabase JWT and return the user object. */
async function verifyUser(token) {
  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

// ─── CORS boilerplate ───────────────────────────────────────────────────────

function setCors(res) {
  const origin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}

// ─── Validate env ───────────────────────────────────────────────────────────

function envOk() {
  return process.env.HMRC_CLIENT_ID
    && process.env.HMRC_CLIENT_SECRET
    && process.env.HMRC_TOKEN_SECRET
    && process.env.SUPABASE_URL
    && process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// ─── Handler ────────────────────────────────────────────────────────────────

async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!envOk()) return res.status(503).json({ error: 'HMRC integration not configured' });

  const action = req.query?.action || req.body?.action;

  // ── GET: Redirect to HMRC authorisation ─────────────────────────────────
  if (req.method === 'GET' && !action) {
    const authHeader = req.headers['authorization'] || '';
    const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!userToken) return res.status(401).json({ error: 'Authentication required' });

    const user = await verifyUser(userToken);
    if (!user) return res.status(401).json({ error: 'Invalid or expired session' });

    // Generate CSRF state token: userId.random.hmac
    const statePayload = `${user.id}.${randomBytes(16).toString('hex')}`;
    const stateSig = createHmac('sha256', process.env.HMRC_TOKEN_SECRET)
      .update(statePayload).digest('hex');
    const state = `${statePayload}.${stateSig}`;

    const origin = process.env.ALLOWED_ORIGIN || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const redirectUri = `${origin}/api/hmrc-auth?action=callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.HMRC_CLIENT_ID,
      scope: HMRC_SCOPES,
      redirect_uri: redirectUri,
      state,
    });

    return res.status(200).json({
      authorizeUrl: `${HMRC_BASE()}/oauth/authorize?${params.toString()}`,
      state,
    });
  }

  // ── POST: Exchange auth code for tokens ────────────────────────────────
  if (req.method === 'POST' && action === 'callback') {
    const { code, state, vrn } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'State parameter is required' });
    }

    // Verify CSRF state
    const parts = state.split('.');
    if (parts.length !== 3) return res.status(400).json({ error: 'Invalid state' });
    const [userId, nonce, sig] = parts;
    const expectedSig = createHmac('sha256', process.env.HMRC_TOKEN_SECRET)
      .update(`${userId}.${nonce}`).digest('hex');
    if (sig !== expectedSig) {
      return res.status(400).json({ error: 'Invalid state signature' });
    }

    // Also verify the caller is the same user
    const authHeader = req.headers['authorization'] || '';
    const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!userToken) return res.status(401).json({ error: 'Authentication required' });

    const user = await verifyUser(userToken);
    if (!user || user.id !== userId) {
      return res.status(401).json({ error: 'State/user mismatch' });
    }

    const origin = process.env.ALLOWED_ORIGIN || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const redirectUri = `${origin}/api/hmrc-auth?action=callback`;

    // Exchange code for tokens
    let tokenData;
    try {
      const tokenRes = await fetch(`${HMRC_BASE()}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: process.env.HMRC_CLIENT_ID,
          client_secret: process.env.HMRC_CLIENT_SECRET,
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error('HMRC token exchange failed:', tokenRes.status, err);
        return res.status(502).json({ error: 'HMRC token exchange failed' });
      }

      tokenData = await tokenRes.json();
    } catch (err) {
      console.error('HMRC token exchange error:', err);
      return res.status(502).json({ error: 'Failed to contact HMRC' });
    }

    // Encrypt tokens before storage
    const secret = process.env.HMRC_TOKEN_SECRET;
    const encAccessToken = encrypt(tokenData.access_token, secret);
    const encRefreshToken = encrypt(tokenData.refresh_token, secret);
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 14400) * 1000).toISOString();

    // Upsert into hmrc_tokens
    const upsertRes = await fetch(
      `${supabaseUrl()}/rest/v1/hmrc_tokens?on_conflict=user_id`,
      {
        method: 'POST',
        headers: { ...supabaseHeaders(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          user_id: user.id,
          access_token: encAccessToken,
          refresh_token: encRefreshToken,
          expires_at: expiresAt,
          vrn: (vrn || '').slice(0, 20) || null,
          scope: tokenData.scope || HMRC_SCOPES,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!upsertRes.ok) {
      console.error('Supabase upsert failed:', await upsertRes.text());
      return res.status(500).json({ error: 'Failed to store tokens' });
    }

    return res.status(200).json({
      success: true,
      expiresAt,
      scope: tokenData.scope || HMRC_SCOPES,
    });
  }

  // ── POST: Refresh expired token ────────────────────────────────────────
  if (req.method === 'POST' && action === 'refresh') {
    const authHeader = req.headers['authorization'] || '';
    const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!userToken) return res.status(401).json({ error: 'Authentication required' });

    const user = await verifyUser(userToken);
    if (!user) return res.status(401).json({ error: 'Invalid or expired session' });

    // Fetch stored tokens
    const tokensRes = await fetch(
      `${supabaseUrl()}/rest/v1/hmrc_tokens?user_id=eq.${user.id}&select=*&limit=1`,
      { headers: supabaseHeaders() }
    );

    if (!tokensRes.ok) return res.status(500).json({ error: 'Failed to fetch tokens' });
    const tokens = await tokensRes.json();
    if (!tokens.length) return res.status(404).json({ error: 'No HMRC connection found' });

    const stored = tokens[0];
    const secret = process.env.HMRC_TOKEN_SECRET;

    let refreshToken;
    try {
      refreshToken = decrypt(stored.refresh_token, secret);
    } catch {
      return res.status(500).json({ error: 'Token decryption failed — reconnect HMRC' });
    }

    // Call HMRC refresh endpoint
    let tokenData;
    try {
      const refreshRes = await fetch(`${HMRC_BASE()}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.HMRC_CLIENT_ID,
          client_secret: process.env.HMRC_CLIENT_SECRET,
        }).toString(),
      });

      if (!refreshRes.ok) {
        const err = await refreshRes.text();
        console.error('HMRC refresh failed:', refreshRes.status, err);
        return res.status(502).json({ error: 'HMRC token refresh failed — reconnect required' });
      }

      tokenData = await refreshRes.json();
    } catch (err) {
      console.error('HMRC refresh error:', err);
      return res.status(502).json({ error: 'Failed to contact HMRC' });
    }

    // Update stored tokens
    const encAccessToken = encrypt(tokenData.access_token, secret);
    const encRefreshToken = encrypt(tokenData.refresh_token || refreshToken, secret);
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 14400) * 1000).toISOString();

    const updateRes = await fetch(
      `${supabaseUrl()}/rest/v1/hmrc_tokens?user_id=eq.${user.id}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders(),
        body: JSON.stringify({
          access_token: encAccessToken,
          refresh_token: encRefreshToken,
          expires_at: expiresAt,
          scope: tokenData.scope || stored.scope,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateRes.ok) {
      console.error('Token update failed:', await updateRes.text());
      return res.status(500).json({ error: 'Failed to update tokens' });
    }

    return res.status(200).json({
      success: true,
      expiresAt,
    });
  }

  // ── Unsupported ────────────────────────────────────────────────────────
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withRateLimit(handler, { limit: 10, prefix: 'hmrc-auth' });
