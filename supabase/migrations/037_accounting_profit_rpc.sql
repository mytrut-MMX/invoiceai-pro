-- Migration 037: Postgres RPC for accounting profit calculation.
-- Replaces client-side aggregation in getAccountingProfit.js.
-- Sums revenue (credit−debit) and expense (debit−credit) from journal_lines
-- joined to accounts and journal_entries for a given user and date range.

CREATE OR REPLACE FUNCTION public.get_accounting_profit(
  p_user_id      TEXT,
  p_period_start DATE,
  p_period_end   DATE
)
RETURNS TABLE (
  revenue           NUMERIC,
  expenses          NUMERIC,
  accounting_profit NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN a.type = 'revenue' THEN jl.credit - jl.debit END), 0) AS revenue,
    COALESCE(SUM(CASE WHEN a.type = 'expense' THEN jl.debit - jl.credit END), 0) AS expenses,
    COALESCE(SUM(CASE WHEN a.type = 'revenue' THEN jl.credit - jl.debit END), 0)
    - COALESCE(SUM(CASE WHEN a.type = 'expense' THEN jl.debit - jl.credit END), 0) AS accounting_profit
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
  INNER JOIN accounts a ON a.id = jl.account_id
  WHERE je.user_id = p_user_id
    AND je.date >= p_period_start
    AND je.date <= p_period_end
    AND a.type IN ('revenue', 'expense');
$$;

COMMENT ON FUNCTION public.get_accounting_profit(TEXT, DATE, DATE) IS
  'Aggregate revenue and expenses from journal_lines for a CT accounting period. Returns single row with revenue, expenses, accounting_profit.';

GRANT EXECUTE ON FUNCTION public.get_accounting_profit(TEXT, DATE, DATE) TO authenticated;
