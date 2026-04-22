-- 047_supplier_vat_verification.sql
-- Supplier-level cache for HMRC VAT number lookups. Separate from
-- bills.supplier_vat_* (migration 043), which is a per-bill posting snapshot
-- and MUST NOT change once an invoice is issued. These columns live on the
-- supplier row and are refreshed by sbaVatVerify.verifySupplierVat() with a
-- VAT_VERIFICATION_STALE_DAYS (90) cache window.
--
-- Status values mirror the `supplierVatStatus` input to computeSelfBilledInvoice
-- so the UI, compute engine, and audit snapshot all speak the same vocabulary.

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS vat_verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vat_verification_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS vat_verification_name   TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_vat_verification_status_check'
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_vat_verification_status_check
      CHECK (
        vat_verification_status IS NULL
        OR vat_verification_status IN ('valid','invalid','unchecked','deregistered')
      );
  END IF;
END$$;

-- Index supports "which suppliers need re-verification" dashboard queries.
CREATE INDEX IF NOT EXISTS idx_suppliers_vat_verified_at
  ON public.suppliers (user_id, vat_verified_at);
