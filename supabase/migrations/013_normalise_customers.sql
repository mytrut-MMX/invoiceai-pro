-- Normalise customers out of the business_profiles JSONB column into a proper
-- relational table.  The existing JSONB column is intentionally left untouched
-- so both systems can coexist during migration.

-- =============================================================================
-- 1. customers
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  company         TEXT,
  email           TEXT,
  phone           TEXT,
  type            VARCHAR(20) DEFAULT 'Individual',
  billing_address JSONB,
  vat_number      VARCHAR(30),
  cis_registered  BOOLEAN DEFAULT false,
  cis_utr         VARCHAR(20),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 2. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers (user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name    ON public.customers (user_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_email   ON public.customers (user_id, email);

-- =============================================================================
-- 3. RLS — follows the exact pattern from 004_harden_rls_business_tables.sql
-- =============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_customers ON public.customers;
CREATE POLICY users_select_own_customers ON public.customers
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_insert_own_customers ON public.customers;
CREATE POLICY users_insert_own_customers ON public.customers
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_update_own_customers ON public.customers;
CREATE POLICY users_update_own_customers ON public.customers
  FOR UPDATE USING (user_id::text = auth.uid()::text)
             WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_delete_own_customers ON public.customers;
CREATE POLICY users_delete_own_customers ON public.customers
  FOR DELETE USING (user_id::text = auth.uid()::text);
