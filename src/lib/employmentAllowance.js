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
