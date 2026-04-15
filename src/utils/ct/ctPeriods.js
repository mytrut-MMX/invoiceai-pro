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
