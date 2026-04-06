-- Normalise expenses out of the business_profiles JSONB column into a proper
-- relational table.  The existing JSONB column is intentionally left untouched
-- so both systems can coexist during migration.

-- =============================================================================
-- 1. expenses
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_number        VARCHAR(50),
  date                  DATE NOT NULL,
  category              VARCHAR(100) NOT NULL,
  hmrc_sa_category      VARCHAR(50),
  vendor                TEXT,
  description           TEXT,
  expense_type          VARCHAR(20) DEFAULT 'standard'
                          CHECK (expense_type IN ('standard','mileage')),
  amount                DECIMAL(15,2),
  tax_rate              DECIMAL(5,2) DEFAULT 0,
  tax_amount            DECIMAL(15,2) DEFAULT 0,
  total                 DECIMAL(15,2),
  status                VARCHAR(20) NOT NULL DEFAULT 'Draft'
                          CHECK (status IN ('Draft','Submitted','Approved','Reimbursed')),
  billable              BOOLEAN DEFAULT false,
  customer_id           UUID,
  paid_through          VARCHAR(100),
  receipt_url           TEXT,
  is_cis_expense        BOOLEAN DEFAULT false,
  cis_rate              DECIMAL(5,2),
  cis_deduction_amount  DECIMAL(15,2),
  mileage_km            DECIMAL(10,2),
  mileage_rate          DECIMAL(5,2),
  mileage_from          TEXT,
  mileage_to            TEXT,
  vat_period_id         UUID,
  itsa_quarter          VARCHAR(10) CHECK (itsa_quarter IN ('Q1','Q2','Q3','Q4')),
  itsa_tax_year         VARCHAR(10),
  locked                BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 2. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_expenses_user_id     ON public.expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date        ON public.expenses (date);
CREATE INDEX IF NOT EXISTS idx_expenses_status      ON public.expenses (status);
CREATE INDEX IF NOT EXISTS idx_expenses_category    ON public.expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_customer_id ON public.expenses (customer_id);

-- =============================================================================
-- 3. RLS — follows the exact pattern from 004_harden_rls_business_tables.sql
-- =============================================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_expenses ON public.expenses;
CREATE POLICY users_select_own_expenses ON public.expenses
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_insert_own_expenses ON public.expenses;
CREATE POLICY users_insert_own_expenses ON public.expenses
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_update_own_expenses ON public.expenses;
CREATE POLICY users_update_own_expenses ON public.expenses
  FOR UPDATE USING (user_id::text = auth.uid()::text)
             WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_delete_own_expenses ON public.expenses;
CREATE POLICY users_delete_own_expenses ON public.expenses
  FOR DELETE USING (user_id::text = auth.uid()::text);
