import { supabase } from '../supabase.js';
import { SelfBillingError } from './errors.js';
import {
  SBA_STATUS,
  SB_DIRECTION,
  SBA_MAX_DURATION_MONTHS,
} from '../../constants/selfBilling.js';

const TABLE = 'self_billing_agreements';
const SELECT_WITH_PARTIES =
  '*, supplier:suppliers(id,name), customer:customers(id,name)';

// ─── Internal helpers ────────────────────────────────────────────────────────
function _throw(code, ctx) {
  throw new SelfBillingError(code, ctx);
}

function _today() {
  return new Date().toISOString().slice(0, 10);
}

function _validateDateRange(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || !(s < e)) {
    _throw('SBA_INVALID_DATES', { maxMonths: SBA_MAX_DURATION_MONTHS, reason: 'end_not_after_start' });
  }
  const cap = new Date(s);
  cap.setMonth(cap.getMonth() + SBA_MAX_DURATION_MONTHS);
  if (e > cap) {
    _throw('SBA_INVALID_DATES', { maxMonths: SBA_MAX_DURATION_MONTHS, reason: 'over_max_duration' });
  }
}

function _validateCounterparty({ supplierId, customerId, direction }) {
  const hasS = Boolean(supplierId);
  const hasC = Boolean(customerId);
  if (hasS === hasC) {
    _throw('SBA_INVALID_COUNTERPARTY', { reason: 'both_or_neither' });
  }
  if (direction === SB_DIRECTION.ISSUED && !hasS) {
    _throw('SBA_INVALID_COUNTERPARTY', { reason: 'issued_requires_supplier' });
  }
  if (direction === SB_DIRECTION.RECEIVED && !hasC) {
    _throw('SBA_INVALID_COUNTERPARTY', { reason: 'received_requires_customer' });
  }
}

function _generateCountersignToken() {
  const c = globalThis.crypto;
  return c.randomUUID().replace(/-/g, '') + c.randomUUID().replace(/-/g, '');
}

async function _fetchSbaOwned(userId, sbaId) {
  const { data, error } = await supabase
    .from(TABLE).select('*')
    .eq('user_id', userId).eq('id', sbaId)
    .maybeSingle();
  if (error) _throw('SBA_NOT_ACTIVE', { reason: error.message });
  if (!data)  _throw('SBA_NOT_ACTIVE', { reason: 'not_found' });
  return data;
}

// ─── Public API ──────────────────────────────────────────────────────────────
export async function createDraftSba({
  userId, supplierId, customerId, direction,
  startDate, endDate, termsSnapshot, supersedesId,
}) {
  _validateCounterparty({ supplierId, customerId, direction });
  _validateDateRange(startDate, endDate);

  const existing = direction === SB_DIRECTION.ISSUED
    ? await getActiveSbaForSupplier({ userId, supplierId })
    : await getActiveSbaForCustomer({ userId, customerId });
  if (existing) {
    _throw('SBA_OVERLAP', {
      counterpartyName: existing.supplier?.name || existing.customer?.name || '',
      existingStart: existing.start_date,
      existingEnd: existing.end_date,
    });
  }

  let version = 1;
  if (supersedesId) {
    const prev = await _fetchSbaOwned(userId, supersedesId);
    version = (prev.version || 1) + 1;
  }

  const payload = {
    user_id: userId,
    supplier_id: supplierId || null,
    customer_id: customerId || null,
    direction,
    start_date: startDate,
    end_date: endDate,
    terms_snapshot: termsSnapshot || {},
    version,
    supersedes_id: supersedesId || null,
    status: SBA_STATUS.DRAFT,
  };
  const { data, error } = await supabase
    .from(TABLE).insert(payload).select().single();
  if (error) _throw('SBA_OVERLAP', { reason: error.message });
  return data;
}

export async function signBySender({ userId, sbaId, signedByName, signedByRole, ip }) {
  const cur = await _fetchSbaOwned(userId, sbaId);
  if (cur.status !== SBA_STATUS.DRAFT) {
    _throw('SBA_NOT_ACTIVE', { status: cur.status });
  }
  const token = _generateCountersignToken();
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      signed_by_us_at: new Date().toISOString(),
      signed_by_us_name: signedByName,
      signed_by_us_role: signedByRole,
      signed_by_us_ip: ip || null,
      signed_by_them_token: token,
      status: SBA_STATUS.PENDING_COUNTERSIGN,
    })
    .eq('user_id', userId).eq('id', sbaId)
    .select().single();
  if (error) _throw('SBA_NOT_ACTIVE', { reason: error.message });
  return data;
}

export async function signByCounterparty({ token, signedByName, ip }) {
  if (!token) _throw('SBA_NOT_SIGNED', { reason: 'missing_token' });
  const { data, error } = await supabase.rpc('sign_sba_by_counterparty', {
    p_token: token,
    p_name: signedByName,
    p_ip: ip || null,
  });
  if (error) _throw('SBA_NOT_SIGNED', { reason: error.message });
  return data;
}

export async function terminateSba({ userId, sbaId, reason }) {
  if (!reason || reason.trim().length < 10) {
    _throw('SBA_INVALID_REASON', { minChars: 10, reason: 'too_short' });
  }
  const cur = await _fetchSbaOwned(userId, sbaId);
  const allowed = [SBA_STATUS.ACTIVE, SBA_STATUS.PENDING_COUNTERSIGN];
  if (!allowed.includes(cur.status)) {
    _throw('SBA_NOT_ACTIVE', { status: cur.status });
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: SBA_STATUS.TERMINATED,
      terminated_at: new Date().toISOString(),
      terminated_reason: reason.trim(),
    })
    .eq('user_id', userId).eq('id', sbaId)
    .select().single();
  if (error) _throw('SBA_NOT_ACTIVE', { reason: error.message });
  return data;
}

export async function supersedeAndRenew({
  userId, sbaId, newStartDate, newEndDate, newTermsSnapshot,
}) {
  _validateDateRange(newStartDate, newEndDate);
  const { data, error } = await supabase.rpc('supersede_and_renew_sba', {
    p_user_id: userId,
    p_old_id: sbaId,
    p_start_date: newStartDate,
    p_end_date: newEndDate,
    p_terms_snapshot: newTermsSnapshot || {},
  });
  if (error) _throw('SBA_NOT_ACTIVE', { reason: error.message });
  return data;
}

export async function listActiveSbas({ userId, direction } = {}) {
  let q = supabase
    .from(TABLE).select(SELECT_WITH_PARTIES)
    .eq('user_id', userId)
    .eq('status', SBA_STATUS.ACTIVE)
    .gt('end_date', _today());
  if (direction) q = q.eq('direction', direction);
  const { data, error } = await q.order('end_date', { ascending: true });
  if (error) _throw('SBA_NOT_ACTIVE', { reason: error.message });
  return data || [];
}

export async function getSbaById({ userId, sbaId }) {
  const { data, error } = await supabase
    .from(TABLE).select(SELECT_WITH_PARTIES)
    .eq('user_id', userId).eq('id', sbaId)
    .maybeSingle();
  if (error) _throw('SBA_NOT_ACTIVE', { reason: error.message });
  if (!data)  _throw('SBA_NOT_ACTIVE', { reason: 'not_found' });
  return data;
}

export async function getActiveSbaForSupplier({ userId, supplierId }) {
  if (!supplierId) return null;
  const { data, error } = await supabase
    .from(TABLE).select(SELECT_WITH_PARTIES)
    .eq('user_id', userId)
    .eq('supplier_id', supplierId)
    .eq('direction', SB_DIRECTION.ISSUED)
    .eq('status', SBA_STATUS.ACTIVE)
    .gt('end_date', _today())
    .maybeSingle();
  if (error) _throw('SBA_NOT_ACTIVE', { reason: error.message });
  return data || null;
}

export async function getActiveSbaForCustomer({ userId, customerId }) {
  if (!customerId) return null;
  const { data, error } = await supabase
    .from(TABLE).select(SELECT_WITH_PARTIES)
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .eq('direction', SB_DIRECTION.RECEIVED)
    .eq('status', SBA_STATUS.ACTIVE)
    .gt('end_date', _today())
    .maybeSingle();
  if (error) _throw('SBA_NOT_ACTIVE', { reason: error.message });
  return data || null;
}

export async function expireStaleSbas({ userId }) {
  const { data, error, count } = await supabase
    .from(TABLE)
    .update({ status: SBA_STATUS.EXPIRED }, { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', SBA_STATUS.ACTIVE)
    .lt('end_date', _today())
    .select('id');
  if (error) _throw('SBA_NOT_ACTIVE', { reason: error.message });
  return count ?? (Array.isArray(data) ? data.length : 0);
}