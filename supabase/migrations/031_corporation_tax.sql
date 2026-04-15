-- 031_corporation_tax.sql
-- Corporation Tax (CT600) accounting periods + export audit log + Storage bucket
--
-- Phase 1 MVP scope: small profits rate (19%) + main rate (25%) ONLY.
-- NO marginal relief, NO loss relief, NO R&D, NO groups.
--
-- LTD detection (used by Task 3 sidebar gating):
--   business_profiles.org_settings->>'crn' IS NOT NULL AND <> ''
--
-- This migration is schema-only. Calc engine, UI, PDF export follow in
-- subsequent tasks.

-- =============================================================================
-- 0. Extensions
-- btree_gist required for EXCLUDE constraint combining UUID equality (=)
-- with daterange overlap (&&) on corporation_tax_periods.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================================
-- 1. Shared updated_at trigger function
-- First shared timestamp trigger in this repo. Future tax-period tables may
-- reuse it. (025_suppliers.sql uses a per-table variant; this is intentional
-- going forward for shared tax-period tables.)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. corporation_tax_periods — one row per CT accounting period per user
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.corporation_tax_periods (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- HMRC accounting period
  period_start               DATE NOT NULL,
  period_end                 DATE NOT NULL,
  payment_due_date           DATE NOT NULL,   -- period_end + 9 months + 1 day
  filing_due_date            DATE NOT NULL,   -- period_end + 12 months

  -- Companies House sync metadata (Phase 1 = optional pre-fill)
  source                     VARCHAR(20) NOT NULL DEFAULT 'manual',
  companies_house_synced_at  TIMESTAMPTZ,

  -- Manual tax adjustments (Option 2: user inputs from accountant)
  disallowable_expenses      NUMERIC(12,2) NOT NULL DEFAULT 0
                               CHECK (disallowable_expenses >= 0),
  capital_allowances         NUMERIC(12,2) NOT NULL DEFAULT 0
                               CHECK (capital_allowances >= 0),
  other_adjustments          NUMERIC(12,2) NOT NULL DEFAULT 0,  -- may be negative
  adjustments_notes          TEXT,

  -- Computed snapshot (refreshed on read in Task 2; persisted for dashboard
  -- KPIs without re-querying journal_entries)
  accounting_profit          NUMERIC(12,2),
  tax_adjusted_profit        NUMERIC(12,2),
  ct_rate_applied            NUMERIC(5,2),    -- 19.00 or 25.00
  ct_estimated               NUMERIC(12,2),
  rate_bracket               VARCHAR(20),     -- small | marginal_zone | main | loss
  computed_at                TIMESTAMPTZ,

  -- Lifecycle
  status                     VARCHAR(20) NOT NULL DEFAULT 'draft',
  locked                     BOOLEAN NOT NULL DEFAULT false,

  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT period_dates_valid CHECK (period_end > period_start),
  -- HMRC permits up to 18 months for first period; 12 months thereafter.
  -- Hard cap at 18 months catches input errors. App-layer validates the
  -- 12-month rule for non-first periods.
  CONSTRAINT period_max_18_months CHECK (
    period_end <= period_start + INTERVAL '18 months'
  ),
  -- Genuine overlap prevention (not just exact-duplicate) via gist EXCLUDE.
  -- daterange uses [] to treat boundaries as inclusive; combined with the
  -- period_end > period_start invariant, back-to-back periods
  -- (prev.period_end = next.period_start - 1) do not collide.
  CONSTRAINT no_overlap_per_user EXCLUDE USING gist (
    user_id WITH =,
    daterange(period_start, period_end, '[]') WITH &&
  ),
  CONSTRAINT status_valid CHECK (
    status IN ('draft', 'finalized', 'exported')
  ),
  CONSTRAINT source_valid CHECK (
    source IN ('manual', 'companies_house')
  ),
  CONSTRAINT rate_bracket_valid CHECK (
    rate_bracket IS NULL OR rate_bracket IN ('small', 'marginal_zone', 'main', 'loss')
  )
);

COMMENT ON TABLE public.corporation_tax_periods IS
  'HMRC CT600 accounting period per LTD user. Phase 1 MVP: small profits '
  '(19%) + main rate (25%) only. Manual tax adjustments; no marginal '
  'relief, loss relief, R&D, or groups. LTD detection via '
  'business_profiles.org_settings->>''crn''.';

CREATE INDEX IF NOT EXISTS idx_ct_periods_user
  ON public.corporation_tax_periods (user_id);

CREATE INDEX IF NOT EXISTS idx_ct_periods_user_status
  ON public.corporation_tax_periods (user_id, status);

CREATE INDEX IF NOT EXISTS idx_ct_periods_period_end
  ON public.corporation_tax_periods (user_id, period_end DESC);

-- Auto-update updated_at on row change
DROP TRIGGER IF EXISTS set_corporation_tax_periods_updated_at
  ON public.corporation_tax_periods;
CREATE TRIGGER set_corporation_tax_periods_updated_at
  BEFORE UPDATE ON public.corporation_tax_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_timestamp();

-- RLS — four granular policies so UPDATE / DELETE can enforce `locked = false`
-- at the database layer (defence-in-depth vs. a malicious client).
ALTER TABLE public.corporation_tax_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ct_periods_select_own ON public.corporation_tax_periods;
CREATE POLICY ct_periods_select_own ON public.corporation_tax_periods
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ct_periods_insert_own ON public.corporation_tax_periods;
CREATE POLICY ct_periods_insert_own ON public.corporation_tax_periods
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ct_periods_update_own ON public.corporation_tax_periods;
CREATE POLICY ct_periods_update_own ON public.corporation_tax_periods
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND locked = false)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ct_periods_delete_own ON public.corporation_tax_periods;
CREATE POLICY ct_periods_delete_own ON public.corporation_tax_periods
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND locked = false);

-- =============================================================================
-- 3. ct_export_log — append-only audit trail for PDF exports
-- HMRC retention: 6 years from end of accounting period for LTDs.
-- Snapshot columns capture the computation at export time so a historical
-- re-download remains accurate even if the source period is later edited.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ct_export_log (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_id              UUID NOT NULL REFERENCES public.corporation_tax_periods(id)
                           ON DELETE CASCADE,

  export_type            VARCHAR(20) NOT NULL DEFAULT 'pdf',
  pdf_storage_path       TEXT,   -- {user_id}/{period_id}/{timestamp}.pdf

  -- Immutable computation snapshot at export time
  period_start           DATE NOT NULL,
  period_end             DATE NOT NULL,
  accounting_profit      NUMERIC(12,2),
  disallowable_expenses  NUMERIC(12,2),
  capital_allowances     NUMERIC(12,2),
  other_adjustments      NUMERIC(12,2),
  tax_adjusted_profit    NUMERIC(12,2),
  ct_rate_applied        NUMERIC(5,2),
  ct_estimated           NUMERIC(12,2),
  rate_bracket           VARCHAR(20),

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT export_type_valid CHECK (export_type IN ('pdf', 'csv'))
);

COMMENT ON TABLE public.ct_export_log IS
  'Append-only audit trail of CT600 PDF/CSV exports. Immutable '
  'computation snapshot per row. HMRC retention: 6 years from end of '
  'accounting period for LTDs.';

CREATE INDEX IF NOT EXISTS idx_ct_export_log_user
  ON public.ct_export_log (user_id);

CREATE INDEX IF NOT EXISTS idx_ct_export_log_period
  ON public.ct_export_log (period_id);

CREATE INDEX IF NOT EXISTS idx_ct_export_log_created
  ON public.ct_export_log (user_id, created_at DESC);

ALTER TABLE public.ct_export_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ct_export_log_select_own ON public.ct_export_log;
CREATE POLICY ct_export_log_select_own ON public.ct_export_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ct_export_log_insert_own ON public.ct_export_log;
CREATE POLICY ct_export_log_insert_own ON public.ct_export_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policies: audit log is append-only.

-- =============================================================================
-- 4. Storage bucket: ct-exports (private)
-- Mirrors 030_cis_pds.sql pattern.
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ct-exports', 'ct-exports', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 5. Storage RLS — per-user folder isolation on the ct-exports bucket
-- Path convention (NOT enforced in SQL, documented for Task 6):
--   {user_id}/{period_id}/{timestamp}.pdf
-- The first path segment (storage.foldername(name))[1] MUST equal auth.uid().
-- =============================================================================
DROP POLICY IF EXISTS ct_exports_select ON storage.objects;
CREATE POLICY ct_exports_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ct-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS ct_exports_insert ON storage.objects;
CREATE POLICY ct_exports_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ct-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS ct_exports_update ON storage.objects;
CREATE POLICY ct_exports_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ct-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'ct-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS ct_exports_delete ON storage.objects;
CREATE POLICY ct_exports_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ct-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Verification queries (run manually in Supabase SQL editor):
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('corporation_tax_periods', 'ct_export_log');
-- -- expect: 2 rows
--
-- SELECT COUNT(*) FROM pg_policies
--   WHERE tablename IN ('corporation_tax_periods', 'ct_export_log');
-- -- expect: 6 (4 on corporation_tax_periods, 2 on ct_export_log)
--
-- SELECT id FROM storage.buckets WHERE id = 'ct-exports';
-- SELECT policyname FROM pg_policies
--   WHERE tablename = 'objects' AND policyname LIKE 'ct_exports_%';
-- -- expect: 4 storage policies
