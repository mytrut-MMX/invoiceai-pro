import { supabase, supabaseReady } from '../../lib/supabase.js';

const MS_PER_DAY = 86400000;
const SSP_WEEKLY_RATE = 116.75;
const SSP_WAITING_DAYS = 3;
const SSP_MAX_PAID_DAYS = 140;
const DEFAULT_ANNUAL_ENTITLEMENT = 28;
const DEFAULT_SICK_ENTITLEMENT = 140;

function parseDate(str) {
  return new Date(str + 'T00:00:00');
}

function deriveTaxYear(dateStr) {
  const d = parseDate(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const startYear = (month > 4 || (month === 4 && day >= 6)) ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

function taxYearBounds(taxYear) {
  const startYear = parseInt(taxYear.split('-')[0], 10);
  return {
    start: parseDate(`${startYear}-04-06`),
    end: parseDate(`${startYear + 1}-04-05`),
  };
}

function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

function prorateAnnualEntitlement(fullEntitlement, employeeStartDateStr, taxYear) {
  const { start: tyStart, end: tyEnd } = taxYearBounds(taxYear);
  const empStart = parseDate(employeeStartDateStr);
  if (empStart <= tyStart) return fullEntitlement;
  if (empStart > tyEnd) return 0;
  const remainingDays = Math.floor((tyEnd - empStart) / MS_PER_DAY) + 1;
  const remainingWeeks = Math.floor(remainingDays / 7);
  return roundHalf(fullEntitlement * remainingWeeks / 52);
}

export function countWorkingDays(startDateStr, endDateStr) {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  if (end < start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = cursor.getDay();
    if (dow >= 1 && dow <= 5) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function calculateSSP(startDateStr, endDateStr) {
  const qualifyingDays = countWorkingDays(startDateStr, endDateStr);
  const waitingDays = Math.min(SSP_WAITING_DAYS, qualifyingDays);
  const capped = Math.min(qualifyingDays, SSP_MAX_PAID_DAYS);
  const payableDays = Math.max(0, capped - waitingDays);
  const totalSSP = Math.round(payableDays * (SSP_WEEKLY_RATE / 5) * 100) / 100;
  return { qualifyingDays, waitingDays, payableDays, weeklyRate: SSP_WEEKLY_RATE, totalSSP };
}

export async function getLeaveBalances(employeeId, taxYear) {
  if (!supabaseReady) return [];

  const { data: existing, error: fetchErr } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('tax_year', taxYear);
  if (fetchErr) throw fetchErr;
  if (existing && existing.length > 0) return existing;

  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('start_date')
    .eq('id', employeeId)
    .single();
  if (empErr) throw empErr;

  const annualDays = prorateAnnualEntitlement(DEFAULT_ANNUAL_ENTITLEMENT, emp.start_date, taxYear);

  const toInsert = [
    { employee_id: employeeId, tax_year: taxYear, leave_type: 'annual', entitlement_days: annualDays },
    { employee_id: employeeId, tax_year: taxYear, leave_type: 'sick', entitlement_days: DEFAULT_SICK_ENTITLEMENT },
  ];

  const { data: inserted, error: insErr } = await supabase
    .from('leave_balances')
    .insert(toInsert)
    .select();
  if (insErr) throw insErr;
  return inserted;
}

export async function getLeaveRequests(employeeId, taxYear) {
  if (!supabaseReady) return [];
  let query = supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false });
  if (taxYear) {
    const { start, end } = taxYearBounds(taxYear);
    query = query
      .gte('start_date', start.toISOString().slice(0, 10))
      .lte('start_date', end.toISOString().slice(0, 10));
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createLeaveRequest({ employeeId, leaveType, startDate, endDate, reason }) {
  if (!supabaseReady) return { request: null, error: 'Supabase not configured' };
  if (!employeeId || !leaveType || !startDate || !endDate) {
    return { request: null, error: 'employeeId, leaveType, startDate, endDate are required' };
  }
  if (parseDate(endDate) < parseDate(startDate)) {
    return { request: null, error: 'endDate must be on or after startDate' };
  }

  const days = countWorkingDays(startDate, endDate);
  if (days <= 0) return { request: null, error: 'No working days in selected range' };

  const taxYear = deriveTaxYear(startDate);
  const balances = await getLeaveBalances(employeeId, taxYear);
  const balance = balances.find(b => b.leave_type === leaveType);
  if (!balance) return { request: null, error: `No ${leaveType} balance for ${taxYear}` };

  const remaining = Number(balance.entitlement_days) + Number(balance.carried_over || 0) - Number(balance.used_days || 0);
  if (days > remaining) {
    return { request: null, error: `Insufficient balance: ${remaining} days available, ${days} requested` };
  }

  const { data: inserted, error: insErr } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: employeeId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days,
      status: 'approved',
      reason: reason || null,
    })
    .select()
    .single();
  if (insErr) return { request: null, error: insErr.message };

  const newUsed = Number(balance.used_days || 0) + days;
  const { error: updErr } = await supabase
    .from('leave_balances')
    .update({ used_days: newUsed })
    .eq('id', balance.id);
  if (updErr) return { request: inserted, error: updErr.message };

  return { request: inserted, error: null };
}

export async function cancelLeaveRequest(requestId) {
  if (!supabaseReady) return { request: null, error: 'Supabase not configured' };

  const { data: existing, error: fetchErr } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (fetchErr) return { request: null, error: fetchErr.message };
  if (existing.status === 'cancelled') return { request: existing, error: null };

  const { data: updated, error: updErr } = await supabase
    .from('leave_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .select()
    .single();
  if (updErr) return { request: null, error: updErr.message };

  const taxYear = deriveTaxYear(existing.start_date);
  const { data: balance, error: balErr } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', existing.employee_id)
    .eq('tax_year', taxYear)
    .eq('leave_type', existing.leave_type)
    .single();
  if (balErr) return { request: updated, error: balErr.message };

  const newUsed = Math.max(0, Number(balance.used_days || 0) - Number(existing.days));
  const { error: updBalErr } = await supabase
    .from('leave_balances')
    .update({ used_days: newUsed })
    .eq('id', balance.id);
  if (updBalErr) return { request: updated, error: updBalErr.message };

  return { request: updated, error: null };
}
