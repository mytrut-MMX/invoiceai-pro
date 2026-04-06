-- Normalise payments out of the business_profiles JSONB column into a proper
-- relational table.  The existing JSONB column is intentionally left untouched
-- so both systems can coexist during migration.

-- =============================================================================
-- 1. payments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_number  VARCHAR(50),
  invoice_id      UUID REFERENCES public.invoices(id),
  customer_name   TEXT,
  amount          DECIMAL(15,2) NOT NULL,
  date            DATE NOT NULL,
  method          VARCHAR(50),
  reference       VARCHAR(200),
  status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Reconciled','Partial','Pending','Refunded')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, payment_number)
);

-- =============================================================================
-- 2. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_payments_user_id    ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_date       ON public.payments (date);
CREATE INDEX IF NOT EXISTS idx_payments_status     ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments (invoice_id);

-- =============================================================================
-- 3. RLS — follows the exact pattern from 004_harden_rls_business_tables.sql
-- =============================================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_payments ON public.payments;
CREATE POLICY users_select_own_payments ON public.payments
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_insert_own_payments ON public.payments;
CREATE POLICY users_insert_own_payments ON public.payments
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_update_own_payments ON public.payments;
CREATE POLICY users_update_own_payments ON public.payments
  FOR UPDATE USING (user_id::text = auth.uid()::text)
             WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_delete_own_payments ON public.payments;
CREATE POLICY users_delete_own_payments ON public.payments
  FOR DELETE USING (user_id::text = auth.uid()::text);
