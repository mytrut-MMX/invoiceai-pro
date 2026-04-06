/**
 * Unified HMRC MTD endpoint — OAuth + VAT operations.
 *
 * Replaces:  hmrc-auth.js (OAuth flow)
 *            hmrc-vat.js  (VAT obligations, submission, retrieval)
 *
 * Old URLs (/api/hmrc-auth, /api/hmrc-vat) preserved via vercel.json rewrites.
 *
 * Auth actions:
 *   GET  (no action)           → HMRC authorise URL
 *   POST action=callback       → exchange code for tokens
 *   POST action=refresh        → refresh expired token
 *
 * VAT actions:
 *   GET  action=obligations    → list VAT periods
 *   POST action=submit         → submit 9-box return
 *   GET  action=return         → retrieve submitted return
 */

import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';
import { withRateLimit } from './_lib/with-rate-limit.js';
import { buildFraudPreventionHeaders } from './_lib/hmrc-headers.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const HMRC_BASE = () => process.env.HMRC_BASE_URL || 'https://test-api.service.hmrc.gov.uk';
const HMRC_SCOPES = 'read:vat write:vat';
const ALGO = 'aes-256-gcm';

// ─── Encryption ─────────────────────────────────────────────────────────────

function deriveKey(secret) {
  return createHmac('sha256', secret).update('hmrc-token-key').digest();
}

function encrypt(plaintext, secret) {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

function decrypt(encoded, secret) {
  const key = deriveKey(secret);
  const [ivHex, encHex, tagHex] = encoded.split(':');
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(encHex, 'hex', 'utf8') + decipher.final('utf8');
}

// ─── Supabase helpers ───────────────────────────────────────────────────────

function sbUrl() { return process.env.SUPABASE_URL; }

function sbHeaders(prefer) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };
  if (prefer) h['Prefer'] = prefer;
  return h;
}

async function verifyUser(token) {
  const res = await fetch(`${sbUrl()}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!res.ok) return null;
  return res.json();
}

// ─── Token management ───────────────────────────────────────────────────────

async function fetchStoredTokens(userId) {
  const res = await fetch(
    `${sbUrl()}/rest/v1/hmrc_tokens?user_id=eq.${userId}&select=*&limit=1`,
    { headers: sbHeaders() },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

async function refreshAccessToken(stored) {
  const secret = process.env.HMRC_TOKEN_SECRET;
  let refreshToken;
  try { refreshToken = decrypt(stored.refresh_token, secret); } catch { return null; }

  const tokenRes = await fetch(`${HMRC_BASE()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token', refresh_token: refreshToken,
      client_id: process.env.HMRC_CLIENT_ID, client_secret: process.env.HMRC_CLIENT_SECRET,
    }).toString(),
  });
  if (!tokenRes.ok) return null;
  const data = await tokenRes.json();
  const expiresAt = new Date(Date.now() + (data.expires_in || 14400) * 1000).toISOString();

  await fetch(`${sbUrl()}/rest/v1/hmrc_tokens?user_id=eq.${stored.user_id}`, {
    method: 'PATCH', headers: sbHeaders(),
    body: JSON.stringify({
      access_token: encrypt(data.access_token, secret),
      refresh_token: encrypt(data.refresh_token || refreshToken, secret),
      expires_at: expiresAt, updated_at: new Date().toISOString(),
    }),
  });
  return data.access_token;
}

async function getAccessToken(userId) {
  const stored = await fetchStoredTokens(userId);
  if (!stored) return { token: null, error: 'No HMRC connection found. Please connect your HMRC account first.' };
  const secret = process.env.HMRC_TOKEN_SECRET;
  if (new Date(stored.expires_at) > new Date()) {
    try { return { token: decrypt(stored.access_token, secret) }; }
    catch { return { token: null, error: 'Token decryption failed — please reconnect HMRC.' }; }
  }
  const newToken = await refreshAccessToken(stored);
  if (!newToken) return { token: null, error: 'HMRC token refresh failed — please reconnect your HMRC account.' };
  return { token: newToken };
}

// ─── HMRC error mapping ────────────────────────────────────────────────────

const HMRC_ERROR_MAP = {
  INVALID_REQUEST:          'The request to HMRC was invalid. Please check your data and try again.',
  VRN_NOT_FOUND:            'VAT Registration Number not found. Please check your VRN in settings.',
  INVALID_VRN:              'The VAT Registration Number format is invalid.',
  TAX_PERIOD_NOT_FOUND:     'The specified VAT period was not found at HMRC.',
  DUPLICATE_SUBMISSION:     'A return for this period has already been submitted.',
  NOT_FINALISED:            'The return must be finalised before submission.',
  INVALID_MONETARY_AMOUNT:  'One or more box values contain an invalid amount.',
  INVALID_DATE_RANGE:       'The date range for obligations is invalid.',
  CLIENT_OR_AGENT_NOT_AUTHORISED: 'You are not authorised for this VRN. Please reconnect HMRC.',
  FORBIDDEN:                'Access denied by HMRC. Check your authorisation.',
  MATCHING_RESOURCE_NOT_FOUND:    'No matching resource found at HMRC.',
  INTERNAL_SERVER_ERROR:    'HMRC is experiencing issues. Please try again later.',
  SERVICE_UNAVAILABLE:      'HMRC service is temporarily unavailable. Please try again later.',
  SERVER_ERROR:             'HMRC returned an unexpected error. Please try again later.',
};

function friendlyError(hmrcBody) {
  if (!hmrcBody) return 'Unexpected error from HMRC.';
  const code = hmrcBody.code || hmrcBody.errors?.[0]?.code || '';
  return HMRC_ERROR_MAP[code] || hmrcBody.message || `HMRC error: ${code || 'unknown'}`;
}

// ─── Audit logging ──────────────────────────────────────────────────────────

async function logApiCall(userId, { endpoint, method, requestBody, responseCode, responseBody, errorMessage, durationMs }) {
  await fetch(`${sbUrl()}/rest/v1/hmrc_api_log`, {
    method: 'POST', headers: sbHeaders('return=minimal'),
    body: JSON.stringify({
      user_id: userId, endpoint, method,
      request_body: requestBody || null, response_code: responseCode || null,
      response_body: responseBody || null, error_message: errorMessage || null,
      duration_ms: durationMs || null,
    }),
  }).catch(err => console.error('Audit log write failed:', err));
}

// ─── HMRC API caller ────────────────────────────────────────────────────────

async function callHmrc(userId, accessToken, { method, path, body, fraudCtx }) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.hmrc.1.0+json',
    'Content-Type': 'application/json',
    ...buildFraudPreventionHeaders(fraudCtx || {}),
  };
  const url = `${HMRC_BASE()}${path}`;
  const start = Date.now();
  let hmrcRes, hmrcData;
  try {
    hmrcRes = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    hmrcData = await hmrcRes.json().catch(() => null);
  } catch (err) {
    const durationMs = Date.now() - start;
    await logApiCall(userId, { endpoint: `${method} ${path}`, method, requestBody: body, responseCode: null, responseBody: null, errorMessage: `Network error: ${err.message}`, durationMs });
    return { ok: false, status: 502, data: null, userError: 'Failed to contact HMRC. Please try again.' };
  }
  const durationMs = Date.now() - start;
  await logApiCall(userId, { endpoint: `${method} ${path}`, method, requestBody: body, responseCode: hmrcRes.status, responseBody: hmrcData, durationMs, errorMessage: hmrcRes.ok ? null : friendlyError(hmrcData) });
  if (!hmrcRes.ok) return { ok: false, status: hmrcRes.status, data: hmrcData, userError: friendlyError(hmrcData) };
  return { ok: true, status: hmrcRes.status, data: hmrcData };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidVrn(vrn) { return typeof vrn === 'string' && /^\d{9}$/.test(vrn); }

function setCors(res) {
  const origin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}

function envOk() {
  return process.env.HMRC_CLIENT_ID && process.env.HMRC_CLIENT_SECRET
    && process.env.HMRC_TOKEN_SECRET && process.env.SUPABASE_URL
    && process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function fraudCtxFromReq(req) {
  const body = req.body || {};
  return {
    userAgent: req.headers['user-agent'] || body.userAgent || '',
    timezone: body.timezone || 'UTC+00:00',
    windowSize: body.windowSize || '',
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || '',
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Handler
// ═════════════════════════════════════════════════════════════════════════════

async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!envOk()) return res.status(503).json({ error: 'HMRC integration not configured' });

  // Authenticate user
  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!userToken) return res.status(401).json({ error: 'Authentication required' });

  const user = await verifyUser(userToken);
  if (!user) return res.status(401).json({ error: 'Invalid or expired session' });

  const action = req.query?.action || req.body?.action;

  // ─── AUTH: GET authorize URL ──────────────────────────────────────────────
  if (req.method === 'GET' && !action) {
    const statePayload = `${user.id}.${randomBytes(16).toString('hex')}`;
    const stateSig = createHmac('sha256', process.env.HMRC_TOKEN_SECRET).update(statePayload).digest('hex');
    const state = `${statePayload}.${stateSig}`;
    const origin = process.env.ALLOWED_ORIGIN || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const redirectUri = `${origin}/api/hmrc-auth?action=callback`;
    const params = new URLSearchParams({
      response_type: 'code', client_id: process.env.HMRC_CLIENT_ID,
      scope: HMRC_SCOPES, redirect_uri: redirectUri, state,
    });
    return res.status(200).json({ authorizeUrl: `${HMRC_BASE()}/oauth/authorize?${params.toString()}`, state });
  }

  // ─── AUTH: Exchange code for tokens ───────────────────────────────────────
  if (req.method === 'POST' && action === 'callback') {
    const { code, state, vrn } = req.body || {};
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Authorization code is required' });
    if (!state || typeof state !== 'string') return res.status(400).json({ error: 'State parameter is required' });

    const parts = state.split('.');
    if (parts.length !== 3) return res.status(400).json({ error: 'Invalid state' });
    const [userId, nonce, sig] = parts;
    const expectedSig = createHmac('sha256', process.env.HMRC_TOKEN_SECRET).update(`${userId}.${nonce}`).digest('hex');
    if (sig !== expectedSig) return res.status(400).json({ error: 'Invalid state signature' });
    if (user.id !== userId) return res.status(401).json({ error: 'State/user mismatch' });

    const origin = process.env.ALLOWED_ORIGIN || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const redirectUri = `${origin}/api/hmrc-auth?action=callback`;

    let tokenData;
    try {
      const tokenRes = await fetch(`${HMRC_BASE()}/oauth/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code', code,
          client_id: process.env.HMRC_CLIENT_ID, client_secret: process.env.HMRC_CLIENT_SECRET,
          redirect_uri: redirectUri,
        }).toString(),
      });
      if (!tokenRes.ok) { console.error('HMRC token exchange failed:', tokenRes.status, await tokenRes.text()); return res.status(502).json({ error: 'HMRC token exchange failed' }); }
      tokenData = await tokenRes.json();
    } catch (err) { console.error('HMRC token exchange error:', err); return res.status(502).json({ error: 'Failed to contact HMRC' }); }

    const secret = process.env.HMRC_TOKEN_SECRET;
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 14400) * 1000).toISOString();

    const upsertRes = await fetch(`${sbUrl()}/rest/v1/hmrc_tokens?on_conflict=user_id`, {
      method: 'POST', headers: { ...sbHeaders(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        user_id: user.id, access_token: encrypt(tokenData.access_token, secret),
        refresh_token: encrypt(tokenData.refresh_token, secret), expires_at: expiresAt,
        vrn: (vrn || '').slice(0, 20) || null, scope: tokenData.scope || HMRC_SCOPES,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!upsertRes.ok) { console.error('Supabase upsert failed:', await upsertRes.text()); return res.status(500).json({ error: 'Failed to store tokens' }); }
    return res.status(200).json({ success: true, expiresAt, scope: tokenData.scope || HMRC_SCOPES });
  }

  // ─── AUTH: Refresh token ──────────────────────────────────────────────────
  if (req.method === 'POST' && action === 'refresh') {
    const stored = await fetchStoredTokens(user.id);
    if (!stored) return res.status(404).json({ error: 'No HMRC connection found' });
    const secret = process.env.HMRC_TOKEN_SECRET;
    let refreshToken;
    try { refreshToken = decrypt(stored.refresh_token, secret); } catch { return res.status(500).json({ error: 'Token decryption failed — reconnect HMRC' }); }

    let tokenData;
    try {
      const refreshRes = await fetch(`${HMRC_BASE()}/oauth/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token', refresh_token: refreshToken,
          client_id: process.env.HMRC_CLIENT_ID, client_secret: process.env.HMRC_CLIENT_SECRET,
        }).toString(),
      });
      if (!refreshRes.ok) { console.error('HMRC refresh failed:', refreshRes.status, await refreshRes.text()); return res.status(502).json({ error: 'HMRC token refresh failed — reconnect required' }); }
      tokenData = await refreshRes.json();
    } catch (err) { console.error('HMRC refresh error:', err); return res.status(502).json({ error: 'Failed to contact HMRC' }); }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 14400) * 1000).toISOString();
    const updateRes = await fetch(`${sbUrl()}/rest/v1/hmrc_tokens?user_id=eq.${user.id}`, {
      method: 'PATCH', headers: sbHeaders(),
      body: JSON.stringify({
        access_token: encrypt(tokenData.access_token, secret),
        refresh_token: encrypt(tokenData.refresh_token || refreshToken, secret),
        expires_at: expiresAt, scope: tokenData.scope || stored.scope, updated_at: new Date().toISOString(),
      }),
    });
    if (!updateRes.ok) { console.error('Token update failed:', await updateRes.text()); return res.status(500).json({ error: 'Failed to update tokens' }); }
    return res.status(200).json({ success: true, expiresAt });
  }

  // ─── VAT: Obligations ─────────────────────────────────────────────────────
  if (req.method === 'GET' && action === 'obligations') {
    const vrn = req.query?.vrn;
    if (!isValidVrn(vrn)) return res.status(400).json({ error: 'Invalid VRN. Must be 9 digits.' });
    const from = req.query?.from || ''; const to = req.query?.to || ''; const statusFilter = req.query?.status || '';
    let qs = '';
    if (from && to) qs += `?from=${from}&to=${to}`;
    if (statusFilter) qs += `${qs ? '&' : '?'}status=${statusFilter}`;

    const { token: accessToken, error: tokenError } = await getAccessToken(user.id);
    if (!accessToken) return res.status(401).json({ error: tokenError });

    const result = await callHmrc(user.id, accessToken, { method: 'GET', path: `/organisations/vat/${vrn}/obligations${qs}`, fraudCtx: fraudCtxFromReq(req) });
    if (!result.ok) return res.status(result.status).json({ error: result.userError });
    return res.status(200).json(result.data);
  }

  // ─── VAT: Submit return ───────────────────────────────────────────────────
  if (req.method === 'POST' && action === 'submit') {
    const { vrn, periodKey, finalised } = req.body || {};
    if (!isValidVrn(vrn)) return res.status(400).json({ error: 'Invalid VRN. Must be 9 digits.' });
    if (!periodKey || typeof periodKey !== 'string') return res.status(400).json({ error: 'periodKey is required (e.g. "#001").' });
    if (finalised !== true) return res.status(400).json({ error: 'You must confirm finalisation (finalised: true) before submitting.' });

    const boxes = {};
    for (const key of ['box1','box2','box3','box4','box5','box6','box7','box8','box9']) {
      const val = Number(req.body[key]);
      if (isNaN(val)) return res.status(400).json({ error: `${key} must be a valid number.` });
      boxes[key] = Math.round(val * 100) / 100;
    }

    const expectedBox3 = Math.round((boxes.box1 + boxes.box2) * 100) / 100;
    if (boxes.box3 !== expectedBox3) return res.status(400).json({ error: `Box 3 must equal Box 1 + Box 2. Expected ${expectedBox3}, got ${boxes.box3}.` });
    const expectedBox5 = Math.round((boxes.box3 - boxes.box4) * 100) / 100;
    if (boxes.box5 !== expectedBox5) return res.status(400).json({ error: `Box 5 must equal Box 3 - Box 4. Expected ${expectedBox5}, got ${boxes.box5}.` });

    const hmrcPayload = {
      periodKey, vatDueSales: boxes.box1, vatDueAcquisitions: boxes.box2,
      totalVatDue: boxes.box3, vatReclaimedCurrPeriod: boxes.box4,
      netVatDue: Math.abs(boxes.box5), totalValueSalesExVAT: Math.round(boxes.box6),
      totalValuePurchasesExVAT: Math.round(boxes.box7),
      totalValueGoodsSuppliedExVAT: Math.round(boxes.box8),
      totalAcquisitionsExVAT: Math.round(boxes.box9), finalised: true,
    };

    const { token: accessToken, error: tokenError } = await getAccessToken(user.id);
    if (!accessToken) return res.status(401).json({ error: tokenError });

    const result = await callHmrc(user.id, accessToken, { method: 'POST', path: `/organisations/vat/${vrn}/returns`, body: hmrcPayload, fraudCtx: fraudCtxFromReq(req) });
    if (!result.ok) return res.status(result.status).json({ error: result.userError });

    const periodStart = req.body.periodStart; const periodEnd = req.body.periodEnd;
    if (periodStart && periodEnd) {
      const periodUpsert = await fetch(`${sbUrl()}/rest/v1/vat_periods?on_conflict=user_id,period_start`, {
        method: 'POST', headers: sbHeaders('resolution=merge-duplicates,return=representation'),
        body: JSON.stringify({ user_id: user.id, period_start: periodStart, period_end: periodEnd, due_date: req.body.dueDate || periodEnd, status: 'submitted', submitted_at: new Date().toISOString(), hmrc_receipt_id: result.data?.formBundleNumber || null, locked: true }),
      });
      let periodRow; if (periodUpsert.ok) { const rows = await periodUpsert.json(); periodRow = Array.isArray(rows) ? rows[0] : rows; }
      if (periodRow?.id) {
        await fetch(`${sbUrl()}/rest/v1/vat_return_submissions`, { method: 'POST', headers: sbHeaders('return=minimal'),
          body: JSON.stringify({ user_id: user.id, vat_period_id: periodRow.id, ...boxes, flat_rate_turnover: req.body.flatRateTurnover ?? null, flat_rate_pct: req.body.flatRatePct ?? null, status: 'submitted', payload_sent: hmrcPayload, hmrc_response: result.data, submitted_at: new Date().toISOString() }),
        });
      }
    }
    return res.status(200).json({ success: true, formBundleNumber: result.data?.formBundleNumber || null, paymentIndicator: result.data?.paymentIndicator || null, chargeRefNumber: result.data?.chargeRefNumber || null });
  }

  // ─── VAT: Get return ──────────────────────────────────────────────────────
  if (req.method === 'GET' && action === 'return') {
    const vrn = req.query?.vrn; const periodKey = req.query?.periodKey;
    if (!isValidVrn(vrn)) return res.status(400).json({ error: 'Invalid VRN. Must be 9 digits.' });
    if (!periodKey) return res.status(400).json({ error: 'periodKey query parameter is required.' });

    const { token: accessToken, error: tokenError } = await getAccessToken(user.id);
    if (!accessToken) return res.status(401).json({ error: tokenError });

    const result = await callHmrc(user.id, accessToken, { method: 'GET', path: `/organisations/vat/${vrn}/returns/${encodeURIComponent(periodKey)}`, fraudCtx: fraudCtxFromReq(req) });
    if (!result.ok) return res.status(result.status).json({ error: result.userError });
    return res.status(200).json(result.data);
  }

  return res.status(400).json({ error: 'Unknown action. Use callback, refresh, obligations, submit, or return.' });
}

export default withRateLimit(handler, { limit: 10, prefix: 'hmrc' });
