/**
 * HMRC MTD ITSA endpoint — quarterly updates and obligations.
 *
 * Endpoints:
 *   GET  ?action=obligations&nino={nino}   → list ITSA obligations (which quarters are due)
 *   POST  action=submit                    → submit quarterly update to HMRC
 *   GET  ?action=status&nino={nino}        → check submission status
 *
 * Uses the same HMRC OAuth token infrastructure as VAT, but requires
 * the read:self-assessment and write:self-assessment scopes.
 *
 * Rate limit: 5 requests / minute per authenticated user.
 */

import { createHmac, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { buildFraudPreventionHeaders } from './_lib/hmrc-headers.js';
import { checkRateLimit } from './_lib/rate-limit.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const HMRC_BASE = () => process.env.HMRC_BASE_URL || 'https://test-api.service.hmrc.gov.uk';
const ALGO = 'aes-256-gcm';
const USER_RATE_LIMIT = 5;

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
  MATCHING_RESOURCE_NOT_FOUND: 'No matching resource found at HMRC.',
  NINO_NOT_FOUND:           'National Insurance Number not found at HMRC. Check your details.',
  NINO_INVALID:             'The National Insurance Number format is invalid.',
  TAX_YEAR_NOT_ENDED:       'The tax year has not yet ended — final declaration not available.',
  RULE_ALREADY_SUBMITTED:   'A quarterly update for this period has already been submitted.',
  CLIENT_OR_AGENT_NOT_AUTHORISED: 'You are not authorised for ITSA. Please reconnect HMRC.',
  FORBIDDEN:                'Access denied by HMRC. Check your authorisation.',
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
    'Accept': 'application/vnd.hmrc.2.0+json',
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

/** Validate UK National Insurance Number format (e.g. QQ123456C). */
function isValidNino(nino) {
  return typeof nino === 'string' && /^[A-Z]{2}\d{6}[A-D]$/i.test(nino.trim());
}

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

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!envOk()) return res.status(503).json({ error: 'HMRC integration not configured' });

  // Authenticate user
  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!userToken) return res.status(401).json({ error: 'Authentication required' });

  const user = await verifyUser(userToken);
  if (!user) return res.status(401).json({ error: 'Invalid or expired session' });

  // Per-user rate limit: 5 requests / minute
  const rl = checkRateLimit(`hmrc-itsa:${user.id}`, USER_RATE_LIMIT);
  res.setHeader('X-RateLimit-Limit', String(USER_RATE_LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(rl.resetMs / 1000)));
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.', retryAfter: Math.ceil(rl.resetMs / 1000) });
  }

  const action = req.query?.action || req.body?.action;

  // ─── Obligations: which quarters need submission ──────────────────────────
  if (req.method === 'GET' && action === 'obligations') {
    const nino = req.query?.nino;
    if (!isValidNino(nino)) return res.status(400).json({ error: 'Invalid NINO format. Expected e.g. QQ123456C.' });

    const { token: accessToken, error: tokenError } = await getAccessToken(user.id);
    if (!accessToken) return res.status(401).json({ error: tokenError });

    // ITSA obligations endpoint
    let qs = '';
    const from = req.query?.from || '';
    const to = req.query?.to || '';
    if (from && to) qs = `?from=${from}&to=${to}`;

    const result = await callHmrc(user.id, accessToken, {
      method: 'GET',
      path: `/individuals/business/property/${nino.toUpperCase()}/period${qs}`,
      fraudCtx: fraudCtxFromReq(req),
    });
    if (!result.ok) return res.status(result.status).json({ error: result.userError });
    return res.status(200).json(result.data);
  }

  // ─── Submit quarterly update ──────────────────────────────────────────────
  if (req.method === 'POST' && action === 'submit') {
    const { nino, taxYear, quarter, totalIncome, totalExpenses, expenseBreakdown, accountingBasis } = req.body || {};

    if (!isValidNino(nino)) return res.status(400).json({ error: 'Invalid NINO format. Expected e.g. QQ123456C.' });
    if (!taxYear || !/^\d{4}-\d{2}$/.test(taxYear)) return res.status(400).json({ error: 'Invalid tax year format. Expected e.g. 2026-27.' });
    if (!['Q1','Q2','Q3','Q4'].includes(quarter)) return res.status(400).json({ error: 'Invalid quarter. Must be Q1, Q2, Q3, or Q4.' });

    const income = Number(totalIncome);
    const expenses = Number(totalExpenses);
    if (isNaN(income) || income < 0) return res.status(400).json({ error: 'totalIncome must be a non-negative number.' });
    if (isNaN(expenses) || expenses < 0) return res.status(400).json({ error: 'totalExpenses must be a non-negative number.' });

    const basis = accountingBasis === 'accrual' ? 'accrual' : 'cash';

    // Build HMRC ITSA payload
    const hmrcPayload = {
      selfEmploymentId: nino.toUpperCase(),
      accountingPeriod: { startDate: req.body.periodStart, endDate: req.body.periodEnd },
      incomes: { turnover: Math.round(income * 100) / 100 },
      deductions: expenseBreakdown || {},
      accountingBasis: basis === 'cash' ? 'CASH' : 'ACCRUAL',
    };

    const { token: accessToken, error: tokenError } = await getAccessToken(user.id);
    if (!accessToken) return res.status(401).json({ error: tokenError });

    const result = await callHmrc(user.id, accessToken, {
      method: 'POST',
      path: `/individuals/business/self-employment/${nino.toUpperCase()}/period`,
      body: hmrcPayload,
      fraudCtx: fraudCtxFromReq(req),
    });
    if (!result.ok) return res.status(result.status).json({ error: result.userError });

    // Store in database
    const periodStart = req.body.periodStart;
    const periodEnd = req.body.periodEnd;
    const submissionDeadline = req.body.submissionDeadline;

    if (periodStart && periodEnd) {
      // Upsert itsa_periods → status=submitted, locked=true
      const periodUpsert = await fetch(`${sbUrl()}/rest/v1/itsa_periods?on_conflict=user_id,tax_year,quarter`, {
        method: 'POST',
        headers: sbHeaders('resolution=merge-duplicates,return=representation'),
        body: JSON.stringify({
          user_id: user.id,
          tax_year: taxYear,
          quarter,
          period_start: periodStart,
          period_end: periodEnd,
          submission_deadline: submissionDeadline || periodEnd,
          status: 'submitted',
          locked: true,
          updated_at: new Date().toISOString(),
        }),
      });

      let periodRow;
      if (periodUpsert.ok) {
        const rows = await periodUpsert.json();
        periodRow = Array.isArray(rows) ? rows[0] : rows;
      }

      // Record quarterly update
      if (periodRow?.id) {
        await fetch(`${sbUrl()}/rest/v1/itsa_quarterly_updates`, {
          method: 'POST',
          headers: sbHeaders('return=minimal'),
          body: JSON.stringify({
            user_id: user.id,
            period_id: periodRow.id,
            total_income: income,
            total_expenses: expenses,
            expense_breakdown: expenseBreakdown || null,
            accounting_basis: basis,
            payload_sent: hmrcPayload,
            hmrc_response: result.data,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          }),
        });
      }
    }

    return res.status(200).json({
      success: true,
      obligationId: result.data?.obligationId || null,
      transactionId: result.data?.transactionId || null,
    });
  }

  // ─── Check submission status ──────────────────────────────────────────────
  if (req.method === 'GET' && action === 'status') {
    const nino = req.query?.nino;
    if (!isValidNino(nino)) return res.status(400).json({ error: 'Invalid NINO format. Expected e.g. QQ123456C.' });

    const taxYear = req.query?.taxYear;
    if (!taxYear) return res.status(400).json({ error: 'taxYear query parameter is required.' });

    const { token: accessToken, error: tokenError } = await getAccessToken(user.id);
    if (!accessToken) return res.status(401).json({ error: tokenError });

    const result = await callHmrc(user.id, accessToken, {
      method: 'GET',
      path: `/individuals/business/self-employment/${nino.toUpperCase()}/period?taxYear=${encodeURIComponent(taxYear)}`,
      fraudCtx: fraudCtxFromReq(req),
    });
    if (!result.ok) return res.status(result.status).json({ error: result.userError });
    return res.status(200).json(result.data);
  }

  return res.status(400).json({ error: 'Unknown action. Use obligations, submit, or status.' });
}
