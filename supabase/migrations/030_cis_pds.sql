-- 030_cis_pds.sql
-- CIS Payment and Deduction Statements — audit log + storage bucket
-- HMRC CIS340: contractors must issue PDS to each subcontractor within 14 days
-- of end of tax month. 3-year retention required.
--
-- This migration is schema-only. UI + generation logic follow in subsequent work.

-- =============================================================================
-- 1. cis_pds_log — audit trail of every PDS emission (download or email)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cis_pds_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- RESTRICT: cannot delete a supplier with historical PDS logs
  supplier_id           UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,

  -- Tax period (6th of month → 5th of next month)
  period_start          DATE NOT NULL,      -- e.g. 2026-04-06
  period_end            DATE NOT NULL,      -- e.g. 2026-05-05
  tax_month_label       TEXT NOT NULL,      -- e.g. "Apr 2026" (derived, stored for display/query convenience)

  -- Emission
  emission_type         VARCHAR(20) NOT NULL CHECK (emission_type IN ('download','email')),
  email_sent_to         TEXT,               -- NULL when emission_type='download'
  email_resend_id       TEXT,               -- Resend API message id, NULL for downloads or send failures
  pdf_storage_path      TEXT,               -- Path in cis-statements bucket, NULL until Task 3 wires upload

  -- Amounts (snapshot at emission)
  gross_amount          DECIMAL(15,2) NOT NULL,              -- ex-VAT total paid in period
  materials_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  labour_amount         DECIMAL(15,2) NOT NULL,              -- amount liable to CIS
  cis_deducted          DECIMAL(15,2) NOT NULL,

  -- CIS status snapshot (mirrors suppliers.cis_rate CHECK values)
  cis_rate_used         VARCHAR(20) NOT NULL,                -- 'gross_0' | 'standard_20' | 'unverified_30'
  verification_number   VARCHAR(20),                         -- snapshot at emission, may be NULL for gross_0

  -- Audit trail of underlying bills included in this statement
  bill_ids              UUID[] NOT NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cis_pds_log IS
  'HMRC CIS340 Payment and Deduction Statement emission audit log. '
  'One row per (supplier, tax_period, emission_event). '
  'Records every download or email of a PDS to a CIS subcontractor. '
  'Required retention: 3 years from end of tax year in which the statement was issued.';

-- =============================================================================
-- 2. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_cis_pds_log_user_period
  ON public.cis_pds_log (user_id, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_cis_pds_log_user_supplier_period
  ON public.cis_pds_log (user_id, supplier_id, period_end DESC);

-- Reverse lookup: "which PDS contained this bill"
CREATE INDEX IF NOT EXISTS idx_cis_pds_log_bill_ids
  ON public.cis_pds_log USING GIN (bill_ids);

-- =============================================================================
-- 3. RLS — owner-only, mirrors paye_reference_owner pattern (021_payroll_schema)
-- =============================================================================
ALTER TABLE public.cis_pds_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cis_pds_log_owner ON public.cis_pds_log;
CREATE POLICY cis_pds_log_owner ON public.cis_pds_log
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 4. Storage bucket: cis-statements (private)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cis-statements', 'cis-statements', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 5. Storage RLS — per-user folder isolation on the cis-statements bucket
-- File path convention (NOT enforced in SQL, documented for Task 3):
--   {user_id}/{period_end_iso}/{supplier_id}_{timestamp}.pdf
-- The first path segment (storage.foldername(name))[1] MUST equal auth.uid().
-- =============================================================================
DROP POLICY IF EXISTS cis_statements_select ON storage.objects;
CREATE POLICY cis_statements_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cis-statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS cis_statements_insert ON storage.objects;
CREATE POLICY cis_statements_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cis-statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS cis_statements_update ON storage.objects;
CREATE POLICY cis_statements_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cis-statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'cis-statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS cis_statements_delete ON storage.objects;
CREATE POLICY cis_statements_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'cis-statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Verification queries (run manually in Supabase SQL editor):
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'cis_pds_log';
-- SELECT policyname FROM pg_policies WHERE tablename = 'cis_pds_log';
-- SELECT id FROM storage.buckets WHERE id = 'cis-statements';
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'cis_statements_%';
