// Shared helpers for api/send-document.js and its action handlers.
// Extracted from the inlined versions in send-document.js and send-selfbill.js
// so both action handlers reuse exactly the same auth + sanitisation path.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FROM_NAME_LEN = 60;

export function parseBody(body) {
  if (!body) return null;
  if (typeof body === 'string') { try { return JSON.parse(body); } catch { return null; } }
  return body;
}

export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value);
}

// SEC-003: defense-in-depth strip of dangerous tags / event handlers / URI
// schemes. Not a full sanitiser — server-side DOMPurify needs jsdom which is
// not a runtime dep. Auth gate via Supabase JWT is the primary defence.
export function stripDangerousHtml(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|action|formaction)\s*=\s*("|')\s*javascript\s*:[^"']*("|')/gi, '$1=$2#$2');
}

// Reject display-name spoofing. Returns the clean name, or null if invalid
// (so the caller can 400 rather than silently truncating).
export function validateFromName(fromName) {
  if (fromName == null) return { ok: true, value: null };
  if (typeof fromName !== 'string' || /[<>@]/.test(fromName) || fromName.length > MAX_FROM_NAME_LEN) {
    return { ok: false, error: 'Invalid fromName' };
  }
  return { ok: true, value: fromName.trim() || null };
}

// Sender name for payloads built server-side (e.g. from DB org_name). Strips
// rather than rejects, since the caller didn't supply it.
export function sanitizeServerSideName(name, fallback = 'InvoiceSaga') {
  return String(name || fallback).slice(0, MAX_FROM_NAME_LEN).replace(/[<>@]/g, '').trim() || fallback;
}

// Verifies the request's Bearer token against Supabase /auth/v1/user and
// returns { userId, supabaseUrl, serviceKey } on success, or { error, status }
// on failure. Keeps the auth dance in one place so both handlers stay thin.
export async function verifyAuth(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { error: 'Authentication required', status: 401 };
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { error: 'Auth service not configured', status: 503 };
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    if (!res.ok) return { error: 'Invalid or expired session', status: 401 };
    const user = await res.json();
    return { userId: user?.id || null, supabaseUrl, serviceKey };
  } catch {
    return { error: 'Authentication check failed', status: 500 };
  }
}

// Thin Resend wrapper so handlers don't each inline the fetch boilerplate.
export async function sendResendEmail(resendKey, resendPayload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(resendPayload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Thin PostgREST wrapper matching the style of api/admin.js — no
// @supabase/supabase-js dependency at the edge. Used by send-selfbill-handler
// for bill + supplier + emission_log lookups.
export async function sb({ supabaseUrl, serviceKey, method = 'GET', path, body, extraHeaders = {} }) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : '',
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}
