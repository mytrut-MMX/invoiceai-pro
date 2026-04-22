// handleVatVerify — HMRC public VAT number lookup. Uses the unauthenticated
// endpoint (GET /organisations/vat/check-vat-number/lookup/{vrn}) so we don't
// need OAuth — just fraud-prevention headers.
//
// Dispatcher (api/hmrc.js) has already authenticated the caller via Supabase
// and applied the hmrc rate limit (10/min/IP). We do NOT write to Supabase —
// the client receives the status and updates the suppliers row itself.

import { buildFraudPreventionHeaders } from './hmrc-headers.js';

const HMRC_BASE = () => process.env.HMRC_BASE_URL || 'https://test-api.service.hmrc.gov.uk';

// Normalise an incoming VRN. Accepts "GB123456789", "gb123456789", "123 456 789"
// etc. and strips everything to the 9-digit number HMRC expects. Returns null
// for anything else — caller returns 400.
function normaliseVrn(input) {
  if (input == null) return null;
  const stripped = String(input).toUpperCase().replace(/^GB/, '').replace(/\s+/g, '');
  return /^\d{9}$/.test(stripped) ? stripped : null;
}

function fraudCtxFromReq(req) {
  const body = req.body || {};
  return {
    userAgent:  req.headers['user-agent'] || body.userAgent || '',
    timezone:   body.timezone   || 'UTC+00:00',
    windowSize: body.windowSize || '',
    ip:         req.headers['x-forwarded-for']?.split(',')[0]?.trim()
              || req.headers['x-real-ip'] || '',
  };
}

// HMRC returns the VAT holder's trading name + primary address when valid.
// We forward a trimmed shape so the client doesn't have to know the HMRC JSON.
function mapHmrcResponse(body) {
  const target = body?.target || {};
  const addr = target.address || {};
  const addressLines = [addr.line1, addr.line2, addr.line3, addr.line4, addr.postcode, addr.countryCode]
    .filter(Boolean).join(', ');
  return {
    name: target.name || null,
    address: addressLines || null,
  };
}

// ctx is ignored — the public HMRC endpoint doesn't need user context;
// the parameter is kept only to match the dispatcher's call signature.
// eslint-disable-next-line no-unused-vars
export async function handleVatVerify(req, res, ctx) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vrn: rawVrn } = req.body || {};
  const vrn = normaliseVrn(rawVrn);
  if (!vrn) {
    return res.status(400).json({ error: 'Invalid VRN. Must be 9 digits (with optional GB prefix).' });
  }

  const url = `${HMRC_BASE()}/organisations/vat/check-vat-number/lookup/${vrn}`;
  const headers = {
    Accept: 'application/vnd.hmrc.1.0+json',
    ...buildFraudPreventionHeaders(fraudCtxFromReq(req)),
  };

  let hmrcRes, hmrcBody;
  try {
    hmrcRes = await fetch(url, { method: 'GET', headers });
    hmrcBody = await hmrcRes.json().catch(() => null);
  } catch (err) {
    console.error('[vat-verify] HMRC fetch failed:', err?.message || err);
    return res.status(502).json({ status: 'error', error: 'Failed to contact HMRC' });
  }

  if (hmrcRes.status === 200) {
    return res.status(200).json({ status: 'valid', vrn, ...mapHmrcResponse(hmrcBody) });
  }

  if (hmrcRes.status === 404) {
    return res.status(200).json({ status: 'invalid', vrn });
  }

  if (hmrcRes.status === 400) {
    // HMRC's own "invalid VRN" path — e.g. malformed input they don't like.
    // Safe to surface as invalid; caller can inspect vrn if needed.
    return res.status(200).json({ status: 'invalid', vrn, reason: hmrcBody?.code || 'hmrc_rejected' });
  }

  if (hmrcRes.status >= 500) {
    return res.status(200).json({
      status: 'error', vrn,
      error: 'HMRC service is temporarily unavailable. Please try again shortly.',
      hmrcStatus: hmrcRes.status,
    });
  }

  // Unexpected status — propagate a generic error without leaking HMRC specifics.
  return res.status(200).json({
    status: 'error', vrn,
    error: 'Unexpected response from HMRC.',
    hmrcStatus: hmrcRes.status,
  });
}
