-- 035_ct_marginal_relief_columns.sql
-- Add marginal relief input columns to corporation_tax_periods.
--
-- Post-Apr 2023 CT rules apportion the £50K / £250K rate thresholds across
-- associated companies, and compute those thresholds against "augmented
-- profits" (taxable profits + exempt distributions from non-51%-owned
-- companies). These two inputs default to zero for single-company users
-- (the vast majority); calc engine wiring follows in a later task.

ALTER TABLE public.corporation_tax_periods
  ADD COLUMN IF NOT EXISTS associated_companies_count INT NOT NULL DEFAULT 0
    CHECK (associated_companies_count >= 0),
  ADD COLUMN IF NOT EXISTS augmented_profits_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (augmented_profits_adjustment >= 0);

COMMENT ON COLUMN public.corporation_tax_periods.associated_companies_count IS
  'Number of 51%-group/associated companies in the accounting period. '
  'Used to apportion the £50K / £250K marginal relief thresholds. '
  'Defaults to 0 (single-company, full thresholds apply).';

COMMENT ON COLUMN public.corporation_tax_periods.augmented_profits_adjustment IS
  'Exempt distributions received from non-51%-owned companies, added to '
  'taxable profits when testing against the marginal relief thresholds. '
  'Non-negative; MVP does not support negative adjustments.';

-- Verification (run manually):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema = 'public'
--    AND table_name = 'corporation_tax_periods'
--    AND column_name IN ('associated_companies_count',
--                        'augmented_profits_adjustment');
-- -- expect: 2 rows, both NOT NULL with default 0
