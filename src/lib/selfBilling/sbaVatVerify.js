// Supplier VAT-number verification helpers.
//
// - isVerificationStale / shouldAutoVerify are pure predicates used by the
//   self-bill form to decide whether to fire a background check.
// - verifySupplierVat calls /api/hmrc?service=vat-verify and, on receipt,
//   writes the result back to the supplier row (vat_verified_at +
//   vat_verification_status + vat_verification_name). Fresh-cache
//   short-circuit is in this client helper, not the API, so bounce-back
//   re-opens of the form don't burn a rate-limit token per open.

import { supabase } from '../supabase.js';
import { VAT_VERIFICATION_STALE_DAYS } from '../../constants/selfBilling.js';

const MS_PER_DAY = 86400000;

export function isVerificationStale(supplier) {
  if (!supplier) return true;
  if (!supplier.vat_verified_at) return true;
  const then = new Date(supplier.vat_verified_at).getTime();
  if (Number.isNaN(then)) return true;
  const ageDays = (Date.now() - then) / MS_PER_DAY;
  return ageDays > VAT_VERIFICATION_STALE_DAYS;
}

export function shouldAutoVerify(supplier) {
  if (!supplier) return false;
  if (supplier.is_vat_registered !== true) return false;
  if (!supplier.vat_number) return false;
  return isVerificationStale(supplier);
}

async function fetchSupplierRow(userId, supplierId) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id,vat_number,is_vat_registered,vat_verified_at,vat_verification_status,vat_verification_name')
    .eq('id', supplierId).eq('user_id', userId).maybeSingle();
  if (error) return { error };
  return { data };
}

function toCachedResult(row) {
  return {
    status: row.vat_verification_status || 'unchecked',
    name: row.vat_verification_name || null,
    cached: true,
    verifiedAt: row.vat_verified_at || null,
  };
}

/**
 * Verify a supplier's VAT number against HMRC's public lookup.
 *
 * Parameters:
 *   userId     — owning user (RLS boundary).
 *   supplierId — row to verify + update.
 *   force      — if false, skip the API call when the cached row is fresh.
 *   supplier   — optional: pass the loaded supplier row to avoid a re-fetch.
 *
 * Returns { status, name?, cached, verifiedAt, reason? } where:
 *   status ∈ 'valid' | 'invalid' | 'error' | 'unchecked'
 *   cached is true when the result came from the supplier row rather than HMRC.
 */
export async function verifySupplierVat({ userId, supplierId, force = false, supplier = null }) {
  if (!userId || !supplierId) return { status: 'error', reason: 'missing_args' };

  let sup = supplier;
  if (!sup) {
    const { data, error } = await fetchSupplierRow(userId, supplierId);
    if (error) return { status: 'error', reason: error.message };
    if (!data) return { status: 'error', reason: 'supplier_not_found' };
    sup = data;
  }

  if (!sup.vat_number) return { status: 'unchecked', reason: 'no_vrn', cached: true };
  if (sup.is_vat_registered !== true) return { status: 'unchecked', reason: 'not_vat_registered', cached: true };

  // Fresh-cache short-circuit — saves a rate-limited HMRC call on every
  // re-open of the form when the supplier was recently verified.
  if (!force && !isVerificationStale(sup) && sup.vat_verification_status) {
    return toCachedResult(sup);
  }

  const sessionRes = await supabase.auth.getSession();
  const token = sessionRes?.data?.session?.access_token;
  if (!token) return { status: 'error', reason: 'no_session' };

  let res, body;
  try {
    res = await fetch('/api/hmrc?service=vat-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vrn: sup.vat_number }),
    });
    body = await res.json().catch(() => ({}));
  } catch (err) {
    return { status: 'error', reason: err?.message || 'network_error' };
  }

  // 5xx or thrown → don't overwrite the cache (we can't tell valid from
  // transient error). The caller shows amber "re-checking" until the next
  // successful attempt.
  if (!res.ok || body?.status === 'error') {
    return { status: 'error', reason: body?.error || `http_${res.status}`, cached: false };
  }

  const status = body?.status === 'valid' ? 'valid' : 'invalid';
  const name = body?.name || null;
  const verifiedAt = new Date().toISOString();

  const { error: updErr } = await supabase
    .from('suppliers')
    .update({
      vat_verified_at: verifiedAt,
      vat_verification_status: status,
      vat_verification_name: name,
    })
    .eq('id', supplierId).eq('user_id', userId);
  if (updErr) {
    console.error('[sbaVatVerify] supplier row update failed:', updErr.message || updErr);
  }

  return { status, name, cached: false, verifiedAt };
}
