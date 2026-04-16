-- 036_ct_loss_carryforward.sql
-- Add trading loss carry-forward input column to corporation_tax_periods.
--
-- HMRC permits unused trading losses from prior accounting periods to be
-- carried forward and offset against the current period's taxable profits
-- (CTA 2010 s.45 / s.45A post-April 2017 reform). This is a manual user
-- input from the accountant's prior-year computation; MVP does not track
-- the loss pool itself. Defaults to zero for companies with no prior
-- losses. Calc engine wiring follows in a later task.

ALTER TABLE public.corporation_tax_periods
  ADD COLUMN IF NOT EXISTS loss_carried_forward_in NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (loss_carried_forward_in >= 0);

COMMENT ON COLUMN public.corporation_tax_periods.loss_carried_forward_in IS
  'Trading losses brought forward from prior accounting periods, offset '
  'against the current period''s taxable profits (CTA 2010 s.45/s.45A). '
  'Non-negative; negative losses are not valid input. Defaults to 0.';

-- Verification (run manually):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema = 'public'
--    AND table_name = 'corporation_tax_periods'
--    AND column_name = 'loss_carried_forward_in';
-- -- expect: 1 row, NOT NULL with default 0
