-- 048_deprecate_legacy_selfbilling.sql
-- Drops the four legacy per-supplier self-billing columns added in migration
-- 025 (suppliers). Migration 043 already backfilled them into the
-- self_billing_agreements table, and all src/ readers have since been
-- re-pointed at that table (see src/lib/selfBilling/sbaGate.js and the
-- useHasAnyActiveIssuedSba hook).
--
-- Pre-flight audit (run on a live DB before applying):
--   -- legacy columns still exist?
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='suppliers'
--     AND column_name IN ('self_billing_enabled','self_billing_agreement_start',
--                         'self_billing_agreement_end','self_billing_invoice_series');
--
--   -- every legacy-flagged supplier must already have a row in 043's backfill:
--   SELECT COUNT(*) FROM suppliers s
--   WHERE s.self_billing_enabled = true
--     AND NOT EXISTS (
--       SELECT 1 FROM self_billing_agreements a
--       WHERE a.supplier_id = s.id AND a.user_id = s.user_id
--     );
--   -- expected: 0. Non-zero means 043 hasn't run (or partially ran) — stop.
--
-- business_profiles JSONB: checked — there is no org_settings.self_billing
-- JSONB field that shadows these columns; nothing else to drop.

ALTER TABLE public.suppliers
  DROP COLUMN IF EXISTS self_billing_enabled,
  DROP COLUMN IF EXISTS self_billing_agreement_start,
  DROP COLUMN IF EXISTS self_billing_agreement_end,
  DROP COLUMN IF EXISTS self_billing_invoice_series;

-- Post-flight sanity (run once migration applied):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='suppliers'
--     AND column_name LIKE 'self_billing%';
--   -- expected: 0 rows.
