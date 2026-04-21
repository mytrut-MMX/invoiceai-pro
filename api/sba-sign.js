// Public SBA countersign API. GET returns the agreement summary + signed
// PDF URL; POST calls the sign_sba_by_counterparty RPC. The signing token
// IS the auth mechanism — never echo it back, and never differentiate error
// messages between "unknown token" and "already consumed".
//
// A local rate-limit map is used (not `_lib/rate-limit.js`) because this
// endpoint needs a 15-minute window and distinct GET/POST limits.
const SBA_WINDOW_MS = 15 * 60 * 1000;
const sbaRate = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sbaRate) if (now - v.start > SBA_WINDOW_MS * 2) sbaRate.delete(k);
}, 5 * 60 * 1000);

function rateLimit(ip, tag, limit) {
  const key = `sba:${tag}:${ip}`;
  const now = Date.now();
  let e = sbaRate.get(key);
  if (!e || now - e.start > SBA_WINDOW_MS) {
    e = { count: 1, start: now };
    sbaRate.set(key, e);
    return { allowed: true, resetMs: SBA_WINDOW_MS };
  }
  e.count++;
  return { allowed: e.count <= limit, resetMs: SBA_WINDOW_MS - (now - e.start) };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

const clientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown';

const sbUrl = () => process.env.SUPABASE_URL;
function sbHeaders(prefer) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };
  if (prefer) h['Prefer'] = prefer;
  return h;
}

// Same body for unknown / wrong-status / consumed token — no leakage.
const notAvailable = (res) =>
  res.status(404).json({ error: 'This signing link is invalid or has already been used.' });

async function fetchAgreementByToken(token) {
  const cols = [
    'id,version,status,start_date,end_date,direction,terms_snapshot',
    'signed_by_us_at,signed_by_us_name,signed_by_us_role,signed_by_them_at',
    'agreement_pdf_path,user_id,supplier_id,customer_id',
  ].join(',');
  const url = `${sbUrl()}/rest/v1/self_billing_agreements`
    + `?select=${encodeURIComponent(cols)}`
    + `&signed_by_them_token=eq.${encodeURIComponent(token)}`
    + `&limit=1`;
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function fetchCounterparty(agreement) {
  const isSupplier = Boolean(agreement.supplier_id);
  const table = isSupplier ? 'suppliers' : 'customers';
  const id = isSupplier ? agreement.supplier_id : agreement.customer_id;
  if (!id) return { name: '', address: null, vat_number: null };
  const url = `${sbUrl()}/rest/v1/${table}?select=id,name,vat_number,billing_address&id=eq.${id}&limit=1`;
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) return { name: '', address: null, vat_number: null };
  const rows = await r.json();
  return rows[0] || { name: '', address: null, vat_number: null };
}

async function fetchBusinessProfile(userId) {
  const url = `${sbUrl()}/rest/v1/business_profiles?select=org_settings&user_id=eq.${userId}&limit=1`;
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) return {};
  const rows = await r.json();
  return rows[0]?.org_settings || {};
}

async function signStorageUrl(path, expiresIn = 3600) {
  if (!path) return null;
  const url = `${sbUrl()}/storage/v1/object/sign/self-billing-agreements/${encodeURI(path)}`;
  const r = await fetch(url, {
    method: 'POST', headers: sbHeaders(), body: JSON.stringify({ expiresIn }),
  });
  if (!r.ok) return null;
  const body = await r.json().catch(() => null);
  const suffix = body?.signedURL || body?.signedUrl;
  return suffix ? `${sbUrl()}/storage/v1${suffix}` : null;
}

function partyFrom(row) {
  const a = row?.billing_address || null;
  return {
    name: row?.name || '',
    address: a ? [a.street || a.street1, [a.city, a.postcode || a.zip].filter(Boolean).join(' '), a.country].filter(Boolean).join('\n') : '',
    vat: row?.vat_number || null,
  };
}

function resolveSelfBillerBillee(agreement, us, them) {
  // direction='issued'  → user is Self-Biller, counterparty is Self-Billee
  // direction='received'→ counterparty is Self-Biller, user is Self-Billee
  return agreement.direction === 'received'
    ? { selfBiller: them, selfBillee: us }
    : { selfBiller: us, selfBillee: them };
}

async function handleGet(req, res) {
  const token = String(req.query?.token || '').trim();
  if (!token) return notAvailable(res);

  const agreement = await fetchAgreementByToken(token);
  if (!agreement || agreement.status !== 'pending_countersign') return notAvailable(res);

  const [counterparty, orgSettings] = await Promise.all([
    fetchCounterparty(agreement),
    fetchBusinessProfile(agreement.user_id),
  ]);

  const us = {
    name: orgSettings?.orgName || 'Business',
    address: [orgSettings?.street, [orgSettings?.city, orgSettings?.postcode].filter(Boolean).join(' '), orgSettings?.country].filter(Boolean).join('\n'),
    vat: orgSettings?.vatReg === 'Yes' ? (orgSettings?.vatNum || null) : null,
  };
  const them = partyFrom(counterparty);
  const { selfBiller, selfBillee } = resolveSelfBillerBillee(agreement, us, them);
  const pdfUrl = await signStorageUrl(agreement.agreement_pdf_path, 3600);

  return res.status(200).json({
    agreement: {
      id: agreement.id,
      version: agreement.version,
      status: agreement.status,
      start_date: agreement.start_date,
      end_date: agreement.end_date,
      direction: agreement.direction,
      signed_by_us_name: agreement.signed_by_us_name,
      signed_by_us_role: agreement.signed_by_us_role,
      signed_by_us_at:   agreement.signed_by_us_at,
    },
    parties: { selfBiller, selfBillee },
    pdfUrl,
  });
}

async function handlePost(req, res) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const token = String(body?.token || '').trim();
  const name  = String(body?.name  || '').trim();
  if (!token || name.length < 2 || name.length > 200) {
    return res.status(400).json({ error: 'Signing failed. The link may be invalid or already used.' });
  }

  const ip = clientIp(req);
  const r = await fetch(`${sbUrl()}/rest/v1/rpc/sign_sba_by_counterparty`, {
    method: 'POST',
    headers: sbHeaders('return=representation'),
    body: JSON.stringify({ p_token: token, p_name: name, p_ip: ip === 'unknown' ? null : ip }),
  });
  if (!r.ok) {
    // Same generic message regardless of ERRCODE — no token-state leak.
    return res.status(400).json({ error: 'Signing failed. The link may be invalid or already used.' });
  }
  const result = await r.json().catch(() => null);
  const row = Array.isArray(result) ? result[0] : result;
  return res.status(200).json({ success: true, signedAt: row?.signed_by_them_at || new Date().toISOString() });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const ip = clientIp(req);

  if (req.method === 'GET') {
    const rl = rateLimit(ip, 'get', 30);
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(rl.resetMs / 1000)));
    if (!rl.allowed) return res.status(429).json({ error: 'Too many requests. Please wait and try again.', retryAfter: Math.ceil(rl.resetMs / 1000) });
    return handleGet(req, res);
  }

  if (req.method === 'POST') {
    const rl = rateLimit(ip, 'post', 5);
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(rl.resetMs / 1000)));
    if (!rl.allowed) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.', retryAfter: Math.ceil(rl.resetMs / 1000) });
    return handlePost(req, res);
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ error: 'Method not allowed' });
}
