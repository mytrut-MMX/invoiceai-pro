/**
 * getAccountingProfit — query journal_lines for a date range, aggregate
 * revenue and expense totals in JS, return the accounting profit.
 *
 * Never throws. Returns { success, ... }. On Supabase error, success is
 * false and `error` is set. On empty period, success is true with all
 * zeros.
 *
 * Schema notes (from `supabase/migrations/001_ledger_schema.sql`):
 *   - journal_entries.user_id is TEXT (pass auth.uid()::text)
 *   - journal_entries.date is DATE (column name, not "accounting_date")
 *   - accounts.type enum includes 'revenue' and 'expense'
 *   - journal_lines has `debit` and `credit` DECIMAL(15,2) columns with
 *     the double-entry invariant `debit = 0 OR credit = 0`
 *
 * Aggregation:
 *   revenue  = Σ(credit − debit) over lines where account.type='revenue'
 *   expenses = Σ(debit − credit) over lines where account.type='expense'
 *   accountingProfit = revenue − expenses
 *
 * Phase 1: no Postgres RPC, aggregate client-side. Acceptable up to
 * ~10k lines per period — well beyond MVP ledger sizes.
 *
 * @param {Object} input
 * @param {string} input.userId       - auth.uid() string
 * @param {string} input.periodStart  - YYYY-MM-DD (inclusive)
 * @param {string} input.periodEnd    - YYYY-MM-DD (inclusive)
 * @returns {Promise<
 *   | { success: true, revenue: number, expenses: number, accountingProfit: number }
 *   | { success: false, error: string }
 * >}
 */

import { supabase } from "../../lib/supabase";

export async function getAccountingProfit({ userId, periodStart, periodEnd }) {
  if (!supabase) {
    return { success: false, error: "Supabase not configured" };
  }

  const { data, error } = await supabase
    .from("journal_lines")
    .select(
      "debit, credit, accounts!inner(type), journal_entries!inner(user_id, date)",
    )
    .eq("journal_entries.user_id", userId)
    .gte("journal_entries.date", periodStart)
    .lte("journal_entries.date", periodEnd)
    .in("accounts.type", ["revenue", "expense"]);

  if (error) {
    return { success: false, error: error.message || "Query failed" };
  }

  let revenue = 0;
  let expenses = 0;
  for (const line of data || []) {
    const type = line?.accounts?.type;
    const debit = Number(line?.debit) || 0;
    const credit = Number(line?.credit) || 0;
    if (type === "revenue") revenue += credit - debit;
    else if (type === "expense") expenses += debit - credit;
  }

  return {
    success: true,
    revenue,
    expenses,
    accountingProfit: revenue - expenses,
  };
}
