-- Suppliers table — unified entity for all suppliers including CIS subcontractors.
-- Phase 1 of the Suppliers/CIS redesign. Bills integration follows in Phase 2.

-- =============================================================================
-- 1. suppliers
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name                            TEXT NOT NULL,
  legal_name                      TEXT,
  trading_name                    TEXT,
  type                            VARCHAR(20) DEFAULT 'Business'
                                    CHECK (type IN ('Business', 'Individual')),
  email                           TEXT,
  phone                           TEXT,
  website                         TEXT,
  billing_address                 JSONB,

  -- Tax identifiers (UK)
  company_number                  VARCHAR(20),
  utr                             VARCHAR(20),
  vat_number                      VARCHAR(30),
  is_vat_registered               BOOLEAN DEFAULT false,

  -- CIS (Construction Industry Scheme)
  is_cis_subcontractor            BOOLEAN DEFAULT false,
  cis_verification_number         VARCHAR(20),
  cis_verification_date           DATE,
  cis_rate                        VARCHAR(20)
                                    CHECK (cis_rate IN ('gross_0','standard_20','unverified_30')),
  cis_trader_type                 VARCHAR(20)
                                    CHECK (cis_trader_type IN ('sole_trader','company','partnership','trust')),
  cis_labour_only                 BOOLEAN DEFAULT false,

  -- Self-billing (Phase 5 — flags only, no UI in Phase 1)
  self_billing_enabled            BOOLEAN DEFAULT false,
  self_billing_agreement_start    DATE,
  self_billing_agreement_end      DATE,
  self_billing_invoice_series     TEXT,

  -- Behavior defaults
  default_reverse_charge          BOOLEAN DEFAULT false,
  payment_terms                   VARCHAR(30),
  currency                        VARCHAR(3) DEFAULT 'GBP',
  notes                           TEXT,

  -- Status
  is_active                       BOOLEAN DEFAULT true,

  -- Aggregated statistics (populated by triggers in Phase 2)
  total_billed                    DECIMAL(15,2) DEFAULT 0,
  total_paid                      DECIMAL(15,2) DEFAULT 0,
  last_contacted_at               TIMESTAMPTZ,

  created_at                      TIMESTAMPTZ DEFAULT now(),
  updated_at                      TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 2. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id
  ON public.suppliers (user_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_name
  ON public.suppliers (user_id, name);

CREATE INDEX IF NOT EXISTS idx_suppliers_email
  ON public.suppliers (user_id, email);

CREATE INDEX IF NOT EXISTS idx_suppliers_cis
  ON public.suppliers (user_id, is_cis_subcontractor)
  WHERE is_cis_subcontractor = true;

CREATE INDEX IF NOT EXISTS idx_suppliers_active
  ON public.suppliers (user_id, is_active);

-- =============================================================================
-- 3. updated_at trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION public.suppliers_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_suppliers_touch_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_touch_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.suppliers_touch_updated_at();

-- =============================================================================
-- 4. RLS — follows the exact pattern from 013_normalise_customers.sql
-- =============================================================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_suppliers ON public.suppliers;
CREATE POLICY users_select_own_suppliers ON public.suppliers
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_insert_own_suppliers ON public.suppliers;
CREATE POLICY users_insert_own_suppliers ON public.suppliers
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_update_own_suppliers ON public.suppliers;
CREATE POLICY users_update_own_suppliers ON public.suppliers
  FOR UPDATE USING (user_id::text = auth.uid()::text)
             WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_delete_own_suppliers ON public.suppliers;
CREATE POLICY users_delete_own_suppliers ON public.suppliers
  FOR DELETE USING (user_id::text = auth.uid()::text);
