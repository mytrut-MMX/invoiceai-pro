/**
 * getAccountingProfit — call the `get_accounting_profit` Postgres RPC to
 * aggregate revenue and expense totals server-side for a date range, and
 * return the accounting profit.
 *
 * Never throws. Returns { success, ... }. On Supabase error, success is
 * false and `error` is set. On empty period, success is true with all
 * zeros.
 *
 * Schema notes (from `supabase/migrations/001_ledger_schema.sql` and
 * `supabase/migrations/037_accounting_profit_rpc.sql`):
 *   - journal_entries.user_id is TEXT (pass auth.uid()::text)
 *   - journal_entries.date is DATE (column name, not "accounting_date")
 *   - accounts.type enum includes 'revenue' and 'expense'
 *   - journal_lines has `debit` and `credit` DECIMAL(15,2) columns with
 *     the double-entry invariant `debit = 0 OR credit = 0`
 *
 * Aggregation (performed in Postgres):
 *   revenue  = Σ(credit − debit) over lines where account.type='revenue'
 *   expenses = Σ(debit − credit) over lines where account.type='expense'
 *   accountingProfit = revenue − expenses
 *
 * Phase 2: Postgres RPC — single query, server-side aggregation.
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

  const { data, error } = await supabase.rpc("get_accounting_profit", {
    p_user_id: userId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  if (error) {
    return { success: false, error: error.message || "Query failed" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { success: true, revenue: 0, expenses: 0, accountingProfit: 0 };
  }

  return {
    success: true,
    revenue: Number(row.revenue) || 0,
    expenses: Number(row.expenses) || 0,
    accountingProfit: Number(row.accounting_profit) || 0,
  };
}
