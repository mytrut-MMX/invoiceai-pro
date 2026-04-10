import { supabase } from "./supabase";

// ─── Constants ──────────────────────────────────────────────────────────────
// HMRC 2025/26 rates. Update these annually as new tax years come into force.
export const EA_ANNUAL_LIMIT_2025_26 = 10500;
export const SECONDARY_THRESHOLD_2025_26 = 5000;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Derive UK tax year string from a date.
 * UK tax year runs 6 April to 5 April.
 * Duplicated from payrollService.js to keep this module self-contained.
 *
 * @param {Date} [date] - defaults to today
 * @returns {string} e.g. '2026-27'
 */
export function getCurrentTaxYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const startYear = (month > 4 || (month === 4 && day >= 6)) ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/**
 * Convert annual salary to a per-period equivalent for threshold comparison.
 * For hourly workers we cannot reliably compute annual without timesheet data,
 * so we conservatively assume they DO cross the threshold (return true).
 */
function isAboveSecondaryThreshold(employee) {
  if (employee.salary_type === "hourly") {
    // Cannot determine without timesheet data; assume yes for eligibility purposes
    return true;
  }
  const annual = Number(employee.salary_amount || 0);
  return annual >= SECONDARY_THRESHOLD_2025_26;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch the EA usage record for a user + tax year.
 * Returns null if no record exists (i.e. user has never claimed for this year).
 *
 * @param {string} userId
 * @param {string} taxYear - e.g. '2026-27'
 * @returns {Promise<{id, user_id, tax_year, enabled, annual_limit, used_amount, claimed_at, disabled_at, created_at, updated_at} | null>}
 */
export async function getEAStatus(userId, taxYear) {
  if (!userId || !taxYear) throw new Error("getEAStatus: userId and taxYear required");
  if (!supabase) throw new Error("getEAStatus: Supabase client not available");

  const { data, error } = await supabase
    .from("employment_allowance_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("tax_year", taxYear)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/**
 * Enable Employment Allowance for a user + tax year.
 * Creates a row if none exists, or updates existing row to enabled=true.
 * Idempotent: calling twice is safe.
 *
 * @param {string} userId
 * @param {string} taxYear - must be the current tax year (no backdating)
 * @returns {Promise<object>} the upserted row
 */
export async function enableEA(userId, taxYear) {
  if (!userId || !taxYear) throw new Error("enableEA: userId and taxYear required");
  if (taxYear !== getCurrentTaxYear()) {
    throw new Error("Backdated claims not yet supported. Contact support.");
  }
  if (!supabase) throw new Error("enableEA: Supabase client not available");

  const now = new Date().toISOString();

  // Try to find existing row
  const existing = await getEAStatus(userId, taxYear);

  if (existing) {
    const { data, error } = await supabase
      .from("employment_allowance_usage")
      .update({
        enabled: true,
        claimed_at: existing.claimed_at || now,
        disabled_at: null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Insert new row
  const { data, error } = await supabase
    .from("employment_allowance_usage")
    .insert({
      user_id: userId,
      tax_year: taxYear,
      enabled: true,
      annual_limit: EA_ANNUAL_LIMIT_2025_26,
      used_amount: 0,
      claimed_at: now,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Disable Employment Allowance for a user + tax year.
 * Sets enabled=false and disabled_at=now. Preserves used_amount and claimed_at
 * for audit trail.
 *
 * @param {string} userId
 * @param {string} taxYear
 * @returns {Promise<object>} the updated row
 */
export async function disableEA(userId, taxYear) {
  if (!userId || !taxYear) throw new Error("disableEA: userId and taxYear required");
  if (!supabase) throw new Error("disableEA: Supabase client not available");

  const existing = await getEAStatus(userId, taxYear);
  if (!existing) {
    throw new Error("Cannot disable: no Employment Allowance record exists for this tax year");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("employment_allowance_usage")
    .update({
      enabled: false,
      disabled_at: now,
      updated_at: now,
    })
    .eq("id", existing.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Check Employment Allowance eligibility for a user.
 * Reads `employees` to determine single-director status.
 * Reads `payroll_runs` to compute cumulative employer NI YTD.
 *
 * @param {string} userId
 * @param {string} taxYear
 * @returns {Promise<{
 *   activeEmployeeCount: number,
 *   activeDirectorCount: number,
 *   employeesAboveThreshold: number,
 *   directorsAboveThreshold: number,
 *   singleDirectorViolation: boolean,
 *   noEmployees: boolean,
 *   cumulativeEmployerNi: number,
 *   eligible: boolean,
 * }>}
 */
export async function getEAEligibility(userId, taxYear) {
  if (!userId || !taxYear) throw new Error("getEAEligibility: userId and taxYear required");
  if (!supabase) throw new Error("getEAEligibility: Supabase client not available");

  // Fetch active employees
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id, salary_type, salary_amount, is_director, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (empError) throw empError;

  const active = employees || [];
  const activeEmployeeCount = active.length;
  const activeDirectorCount = active.filter(e => e.is_director).length;

  // Determine which active employees are above secondary threshold
  const aboveThreshold = active.filter(isAboveSecondaryThreshold);
  const employeesAboveThreshold = aboveThreshold.length;
  const directorsAboveThreshold = aboveThreshold.filter(e => e.is_director).length;

  // Single-director violation: exactly 1 employee above ST AND that one is a director
  const singleDirectorViolation =
    employeesAboveThreshold === 1 && directorsAboveThreshold === 1;

  const noEmployees = activeEmployeeCount === 0;

  // Cumulative employer NI YTD: sum of total_ni_employer from submitted/paid payroll runs in this tax year
  const { data: runs, error: runsError } = await supabase
    .from("payroll_runs")
    .select("total_ni_employer")
    .eq("user_id", userId)
    .eq("tax_year", taxYear)
    .in("status", ["submitted", "paid"]);

  if (runsError) throw runsError;

  const cumulativeEmployerNi = (runs || []).reduce(
    (sum, r) => sum + Number(r.total_ni_employer || 0),
    0
  );

  const eligible = !noEmployees && !singleDirectorViolation;

  return {
    activeEmployeeCount,
    activeDirectorCount,
    employeesAboveThreshold,
    directorsAboveThreshold,
    singleDirectorViolation,
    noEmployees,
    cumulativeEmployerNi,
    eligible,
  };
}

// ─── EA Absorption (EA-3a) ──────────────────────────────────────────────────

/**
 * Compute how much employer NI can be absorbed by Employment Allowance for a single run.
 * Pure function — no DB, no side effects. Caller passes the EA state it already fetched.
 *
 * @param {object} params
 * @param {boolean} params.enabled         - from employment_allowance_usage.enabled
 * @param {number}  params.annualLimit     - e.g. 10500
 * @param {number}  params.usedAmount      - current used_amount for the tax year
 * @param {number}  params.niEmployer      - employer NI for THIS run (payroll_runs.total_ni_employer)
 * @returns {{ absorbed: number, remaining: number }}
 *          absorbed  = amount to absorb against this run (0 if EA disabled/exhausted)
 *          remaining = EA remaining AFTER this absorption (for logging/debugging)
 */
export function computeEAAbsorption({ enabled, annualLimit, usedAmount, niEmployer }) {
  if (!enabled) return { absorbed: 0, remaining: Math.max(0, annualLimit - usedAmount) };
  if (niEmployer <= 0) return { absorbed: 0, remaining: Math.max(0, annualLimit - usedAmount) };

  const remainingBefore = Math.max(0, annualLimit - usedAmount);
  const absorbed = Math.min(niEmployer, remainingBefore);
  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

  return {
    absorbed: round2(absorbed),
    remaining: round2(remainingBefore - absorbed),
  };
}

/**
 * Atomically consume EA capacity for a payroll run.
 *
 * Uses a conditional UPDATE (WHERE used_amount + $amount <= annual_limit) so two
 * concurrent payroll submissions cannot over-claim. If the primary update returns
 * no rows (cap would be breached), re-reads current state, computes actual
 * remaining, and retries once with the capped amount. Logs a warning on race.
 *
 * Returns the amount actually absorbed — may be less than `requestedAmount`.
 * Callers MUST use the returned `absorbed` value when posting the journal and bill,
 * not the originally requested amount.
 *
 * @param {string} userId
 * @param {string} taxYear          - e.g. '2026-27'
 * @param {number} requestedAmount  - what computeEAAbsorption returned
 * @param {string} payrollRunId     - for log correlation only
 * @returns {Promise<{ absorbed: number, newState: object|null, error?: string }>}
 */
export async function consumeEA(userId, taxYear, requestedAmount, payrollRunId) {
  if (!supabase) return { absorbed: 0, newState: null, error: 'Supabase not configured' };
  if (requestedAmount <= 0) return { absorbed: 0, newState: null };

  const { data, error } = await supabase.rpc('consume_ea', {
    p_user_id: userId,
    p_tax_year: taxYear,
    p_amount: requestedAmount,
  });

  if (error) {
    console.warn('[EA] consumeEA failed', { payrollRunId, requestedAmount, error: error.message });
    return { absorbed: 0, newState: null, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { absorbed: 0, newState: null };
  }

  const absorbed = Number(row.absorbed || 0);
  if (absorbed < requestedAmount) {
    console.warn('[EA] Race or cap reached — partial absorption', {
      payrollRunId,
      requested: requestedAmount,
      absorbed,
      reason: 'EA_CAP_RACE_OR_EXHAUSTED',
    });
  }

  return { absorbed, newState: row.new_state };
}

/**
 * Release EA capacity previously consumed by consumeEA.
 * Called by submitPayrollRun if postPayrollEntry or bill insert fails AFTER consumption.
 * Clamped at 0 so a bug can never push used_amount negative (DB CHECK would reject anyway).
 *
 * @param {string} userId
 * @param {string} taxYear
 * @param {number} amount
 * @param {string} payrollRunId - for log correlation
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function releaseEA(userId, taxYear, amount, payrollRunId) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  if (amount <= 0) return { success: true };

  const { error } = await supabase.rpc('release_ea', {
    p_user_id: userId,
    p_tax_year: taxYear,
    p_amount: amount,
  });

  if (error) {
    console.error('[EA] releaseEA FAILED — manual reconciliation may be needed', {
      payrollRunId, amount, error: error.message,
    });
    return { success: false, error: error.message };
  }
  return { success: true };
}
