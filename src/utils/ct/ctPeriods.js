/**
 * Corporation Tax period helpers — list, create, Companies House prefill.
 *
 * Never throws — all functions return `{ success, ... }` so the UI layer
 * can render inline errors without try/catch plumbing.
 */

import { supabase } from "../../lib/supabase";

/**
 * Format a Date as YYYY-MM-DD in Europe/London. Used for payment/filing
 * due-date serialisation so DST boundary crossings don't shift the day.
 */
function toIsoLondon(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * List all Corporation Tax periods for the signed-in user, ordered
 * period_end DESC.
 */
export async function listCorporationTaxPeriods() {
  if (!supabase) return { success: false, error: "Supabase not configured" };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { success: false, error: "Not signed in" };

  const { data, error } = await supabase
    .from("corporation_tax_periods")
    .select("*")
    .order("period_end", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, periods: data || [] };
}

/**
 * Create a new Corporation Tax period.
 *
 * Computes payment_due_date (period_end + 9 months + 1 day) and
 * filing_due_date (period_end + 12 months) per HMRC rules, then inserts
 * a draft row.
 *
 * @param {Object} input
 * @param {string} input.periodStart           YYYY-MM-DD
 * @param {string} input.periodEnd             YYYY-MM-DD
 * @param {'manual'|'companies_house'} [input.source]
 * @param {number} [input.disallowableExpenses]
 * @param {number} [input.capitalAllowances]
 * @param {number} [input.otherAdjustments]
 * @param {string|null} [input.adjustmentsNotes]
 */
export async function createCorporationTaxPeriod({
  periodStart,
  periodEnd,
  source = "manual",
  disallowableExpenses = 0,
  capitalAllowances = 0,
  otherAdjustments = 0,
  adjustmentsNotes = null,
}) {
  if (!supabase) return { success: false, error: "Supabase not configured" };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { success: false, error: "Not signed in" };

  // HMRC due dates derived from period_end.
  const end = new Date(periodEnd);
  const paymentDue = new Date(end);
  paymentDue.setMonth(paymentDue.getMonth() + 9);
  paymentDue.setDate(paymentDue.getDate() + 1);
  const filingDue = new Date(end);
  filingDue.setFullYear(filingDue.getFullYear() + 1);

  const { data, error } = await supabase
    .from("corporation_tax_periods")
    .insert({
      user_id: auth.user.id,
      period_start: periodStart,
      period_end: periodEnd,
      payment_due_date: toIsoLondon(paymentDue),
      filing_due_date: toIsoLondon(filingDue),
      source,
      companies_house_synced_at:
        source === "companies_house" ? new Date().toISOString() : null,
      disallowable_expenses: disallowableExpenses,
      capital_allowances: capitalAllowances,
      other_adjustments: otherAdjustments,
      adjustments_notes: adjustmentsNotes,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, period: data };
}

/**
 * Fetch period prefill data from Companies House via the server-side proxy.
 *
 * Prefers `next_accounts.period_start_on` / `period_end_on`. Falls back to
 * deriving a period from `accounting_reference_date` (ARD): picks the most
 * recent 12-month cycle ending on the ARD day/month.
 *
 * @returns {Promise<
 *   | { success: true, periodStart: string|null, periodEnd: string|null, companyName: string|null }
 *   | { success: false, error: string }
 * >}
 */
export async function fetchCompaniesHousePrefill(crn) {
  let data;
  try {
    const res = await fetch(
      `/api/companies-house?crn=${encodeURIComponent(crn)}`,
    );
    data = await res.json();
  } catch (err) {
    return {
      success: false,
      error: err?.message || "Failed to reach Companies House proxy",
    };
  }
  if (!data?.success) {
    return { success: false, error: data?.error || "Companies House error" };
  }

  let periodStart = null;
  let periodEnd = null;

  if (
    data.nextAccounts?.period_start_on &&
    data.nextAccounts?.period_end_on
  ) {
    periodStart = data.nextAccounts.period_start_on;
    periodEnd = data.nextAccounts.period_end_on;
  } else if (
    data.accountingReferenceDate?.day &&
    data.accountingReferenceDate?.month
  ) {
    const today = new Date();
    const ardMonth = parseInt(data.accountingReferenceDate.month, 10);
    const ardDay = parseInt(data.accountingReferenceDate.day, 10);
    const year = today.getFullYear();
    let candidateEnd = new Date(year, ardMonth - 1, ardDay);
    if (candidateEnd > today) {
      candidateEnd = new Date(year - 1, ardMonth - 1, ardDay);
    }
    const candidateStart = new Date(candidateEnd);
    candidateStart.setFullYear(candidateStart.getFullYear() - 1);
    candidateStart.setDate(candidateStart.getDate() + 1);

    periodStart = toIsoLondon(candidateStart);
    periodEnd = toIsoLondon(candidateEnd);
  }

  return {
    success: true,
    periodStart,
    periodEnd,
    companyName: data.companyName || null,
  };
}

/**
 * Fetch a single Corporation Tax period by id. RLS enforces ownership so
 * a period belonging to another user returns a "not found" error.
 *
 * @param {string} id
 * @returns {Promise<{ success: true, period: object } | { success: false, error: string }>}
 */
export async function getCorporationTaxPeriod(id) {
  if (!supabase) return { success: false, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("corporation_tax_periods")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Period not found" };
  return { success: true, period: data };
}

/**
 * Update a Corporation Tax period with adjustments and/or computed snapshot.
 *
 * RLS policy `ct_periods_update_own` blocks the UPDATE if the row is locked,
 * so a locked period cannot be silently mutated even by a malicious client.
 *
 * The patch shape uses JS camelCase; this helper maps to DB snake_case. Only
 * keys present on the patch are forwarded — pass e.g. `{ adjustmentsNotes }`
 * to update just one field.
 *
 * @param {string} id
 * @param {Object} patch
 * @param {number} [patch.disallowableExpenses]
 * @param {number} [patch.capitalAllowances]
 * @param {number} [patch.otherAdjustments]
 * @param {string|null} [patch.adjustmentsNotes]
 * @param {number|null} [patch.accountingProfit]
 * @param {number|null} [patch.taxAdjustedProfit]
 * @param {number|null} [patch.ctRateApplied]
 * @param {number|null} [patch.ctEstimated]
 * @param {string|null} [patch.rateBracket]
 * @param {string|null} [patch.computedAt]
 * @returns {Promise<{ success: true, period: object } | { success: false, error: string }>}
 */
export async function updateCorporationTaxPeriod(id, patch) {
  if (!supabase) return { success: false, error: "Supabase not configured" };

  const keyMap = {
    disallowableExpenses: "disallowable_expenses",
    capitalAllowances: "capital_allowances",
    otherAdjustments: "other_adjustments",
    adjustmentsNotes: "adjustments_notes",
    accountingProfit: "accounting_profit",
    taxAdjustedProfit: "tax_adjusted_profit",
    ctRateApplied: "ct_rate_applied",
    ctEstimated: "ct_estimated",
    rateBracket: "rate_bracket",
    computedAt: "computed_at",
  };
  const row = {};
  for (const [k, v] of Object.entries(patch || {})) {
    const col = keyMap[k];
    if (col) row[col] = v;
  }

  const { data, error } = await supabase
    .from("corporation_tax_periods")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, period: data };
}

/**
 * Delete a Corporation Tax period. RLS policy `ct_periods_delete_own` blocks
 * the DELETE if the row is locked.
 *
 * @param {string} id
 * @returns {Promise<{ success: true } | { success: false, error: string }>}
 */
export async function deleteCorporationTaxPeriod(id) {
  if (!supabase) return { success: false, error: "Supabase not configured" };

  const { error } = await supabase
    .from("corporation_tax_periods")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Transition a Corporation Tax period's lifecycle status.
 *
 * Phase 1 note: only `draft → finalized` is supported from the UI. Unlocking
 * (`finalized → draft`) requires pre-update `locked = false`, which RLS
 * policy `ct_periods_update_own` does not allow once the row is locked. An
 * admin unlock workflow is out of scope for Phase 1 — users are told to
 * contact support. This function therefore treats `finalized` as one-way
 * and sets `locked = true` alongside the status change.
 *
 * Updating to `exported` is reserved for Task 6 (PDF export) and also sets
 * `locked = true`.
 *
 * @param {string} id
 * @param {'finalized'|'exported'} status
 * @returns {Promise<{ success: true, period: object } | { success: false, error: string }>}
 */
export async function setCorporationTaxPeriodStatus(id, status) {
  if (!supabase) return { success: false, error: "Supabase not configured" };

  if (status !== "finalized" && status !== "exported") {
    return {
      success: false,
      error:
        "Only 'finalized' or 'exported' statuses can be set from the app. " +
        "Unlocking is a support-only operation in Phase 1.",
    };
  }

  const { data, error } = await supabase
    .from("corporation_tax_periods")
    .update({ status, locked: true })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, period: data };
}
