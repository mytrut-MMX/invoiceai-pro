-- Phase 2 Step 1: CIS / DRC / labour-materials split on bills, FK to suppliers,
-- and a stats-maintenance trigger that populates suppliers.total_billed /
-- total_paid / last_contacted_at. Includes a one-shot backfill.
--
-- Idempotent end-to-end. Safe to re-run. Does not modify prior migrations.

-- =============================================================================
-- 1. CIS / DRC / labour-materials columns on public.bills (additive, IF NOT EXISTS)
-- =============================================================================
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS labour_amount               DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_amount            DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cis_deduction               DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cis_rate_at_posting         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cis_verification_at_posting VARCHAR(20),
  ADD COLUMN IF NOT EXISTS reverse_charge_applied      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reverse_charge_vat_amount   DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bill_type                   VARCHAR(20) DEFAULT 'standard';

-- cis_rate_at_posting CHECK (matches migration 025's suppliers.cis_rate values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bills_cis_rate_at_posting_check'
  ) THEN
    ALTER TABLE public.bills
      ADD CONSTRAINT bills_cis_rate_at_posting_check
      CHECK (cis_rate_at_posting IS NULL
             OR cis_rate_at_posting IN ('gross_0','standard_20','unverified_30'));
  END IF;
END $$;

-- bill_type CHECK (Postgres lacks ADD CONSTRAINT IF NOT EXISTS, use DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bills_bill_type_check'
  ) THEN
    ALTER TABLE public.bills
      ADD CONSTRAINT bills_bill_type_check
      CHECK (bill_type IN ('standard','cis','reverse_charge','cis_reverse_charge'));
  END IF;
END $$;

-- =============================================================================
-- 2. FK constraint bills.supplier_id → suppliers.id  (ON DELETE SET NULL)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bills_supplier_id_fkey'
  ) THEN
    ALTER TABLE public.bills
      ADD CONSTRAINT bills_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bills_supplier_id
  ON public.bills (supplier_id)
  WHERE supplier_id IS NOT NULL;

-- =============================================================================
-- 3. Suppliers stats maintenance trigger
--
-- Recalculates total_billed, total_paid, last_contacted_at on affected suppliers
-- after any INSERT/UPDATE/DELETE on bills. Handles supplier_id changes by
-- recalculating both OLD and NEW supplier where they differ. Skips NULL.
--
-- SECURITY DEFINER so the trigger can write regardless of session RLS — it
-- only writes aggregate columns to rows already owned by the user via
-- bills.user_id; suppliers.user_id is not modified.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bills_update_supplier_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_supplier UUID;
BEGIN
  FOR affected_supplier IN
    SELECT DISTINCT sid FROM (VALUES
      (CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN OLD.supplier_id END),
      (CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN NEW.supplier_id END)
    ) AS t(sid)
    WHERE sid IS NOT NULL
  LOOP
    UPDATE public.suppliers s
    SET
      total_billed = COALESCE((
        SELECT SUM(b.total) FROM public.bills b
        WHERE b.supplier_id = affected_supplier AND b.status != 'Void'
      ), 0),
      total_paid = COALESCE((
        SELECT SUM(b.paid_amount) FROM public.bills b
        WHERE b.supplier_id = affected_supplier AND b.status != 'Void'
      ), 0),
      last_contacted_at = (
        SELECT MAX(b.paid_date)::timestamptz FROM public.bills b
        WHERE b.supplier_id = affected_supplier AND b.status = 'Paid'
      )
    WHERE s.id = affected_supplier;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_bills_update_supplier_stats ON public.bills;
CREATE TRIGGER trg_bills_update_supplier_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.bills_update_supplier_stats();

-- =============================================================================
-- 4. Backfill existing suppliers' stats (one-shot; safe to re-run).
-- =============================================================================
UPDATE public.suppliers s
SET
  total_billed = COALESCE((
    SELECT SUM(b.total) FROM public.bills b
    WHERE b.supplier_id = s.id AND b.status != 'Void'
  ), 0),
  total_paid = COALESCE((
    SELECT SUM(b.paid_amount) FROM public.bills b
    WHERE b.supplier_id = s.id AND b.status != 'Void'
  ), 0),
  last_contacted_at = (
    SELECT MAX(b.paid_date)::timestamptz FROM public.bills b
    WHERE b.supplier_id = s.id AND b.status = 'Paid'
  );
