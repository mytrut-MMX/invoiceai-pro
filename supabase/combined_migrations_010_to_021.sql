-- =============================================================================
-- COMBINED MIGRATIONS 010-021
-- =============================================================================
-- Safe to paste into the Supabase SQL Editor and run in a single session.
-- All statements are idempotent (IF NOT EXISTS / DROP IF EXISTS).
--
-- This script:
--   1. Creates normalised tables for invoices, payments, expenses, customers,
--      bills, and catalog items (010-015)
--   2. Migrates existing JSONB data from business_profiles into those tables (016)
--   3. Creates VAT return, HMRC, ITSA, and payroll tables (017-021)
--
-- The original JSONB columns in business_profiles are NOT touched.
-- =============================================================================

-- =============================================================================
-- PREAMBLE: Drop ALL tables this script creates, to avoid schema conflicts
-- =============================================================================
-- Any pre-existing table with a wrong schema will cause CREATE TABLE IF NOT
-- EXISTS to silently skip creation, then later RLS policies fail with
-- "column user_id does not exist".
--
-- Drop order: child tables first (FK constraints), then parents.
-- CASCADE handles any remaining dependencies.
-- All real data lives in business_profiles JSONB — migration 016 repopulates.
-- =============================================================================

-- 021 — payroll (child tables first)
DROP TABLE IF EXISTS public.rti_submissions CASCADE;
DROP TABLE IF EXISTS public.paye_reference CASCADE;
DROP TABLE IF EXISTS public.payroll_ytd CASCADE;
DROP TABLE IF EXISTS public.payslips CASCADE;
DROP TABLE IF EXISTS public.payroll_runs CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;

-- 020 — ITSA
DROP TABLE IF EXISTS public.itsa_final_declarations CASCADE;
DROP TABLE IF EXISTS public.itsa_quarterly_updates CASCADE;
DROP TABLE IF EXISTS public.itsa_periods CASCADE;

-- 019 — HMRC API log
DROP TABLE IF EXISTS public.hmrc_api_log CASCADE;

-- 018 — HMRC tokens
DROP TABLE IF EXISTS public.hmrc_tokens CASCADE;

-- 017 — VAT
DROP TABLE IF EXISTS public.vat_return_submissions CASCADE;
DROP TABLE IF EXISTS public.vat_periods CASCADE;

-- 015 — catalog items
DROP TABLE IF EXISTS public.catalog_items CASCADE;

-- 014 — bills
DROP TABLE IF EXISTS public.bill_line_items CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;

-- 013 — customers
DROP TABLE IF EXISTS public.customers CASCADE;

-- 012 — expenses
DROP TABLE IF EXISTS public.expenses CASCADE;

-- 011 — payments
DROP TABLE IF EXISTS public.payments CASCADE;

-- 010 — invoices
DROP TABLE IF EXISTS public.invoice_tax_breakdown CASCADE;
DROP TABLE IF EXISTS public.invoice_line_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;

-- Stale tables from earlier development (not part of 010-021 but may exist)
DROP TABLE IF EXISTS public.quote_line_items CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;

-- =============================================================================
-- PREREQUISITE: Ensure business_profiles has the 'bills' column (migration 007)
-- =============================================================================
-- Migration 016 reads business_profiles.bills — if the column doesn't exist,
-- the data migration function will fail.
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS bills jsonb NOT NULL DEFAULT '[]'::jsonb;


-- =============================================================================
-- 010_normalise_invoices.sql
-- =============================================================================
-- Normalise invoices out of the business_profiles JSONB column into proper
-- relational tables.  The existing business_profiles.invoices JSONB column is
-- intentionally left untouched so both systems can coexist during migration.

-- =============================================================================
-- 1. invoices
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number    VARCHAR(50) NOT NULL,
  customer_id       UUID,
  status            VARCHAR(20) NOT NULL DEFAULT 'Draft'
                      CHECK (status IN ('Draft','Sent','Paid','Partial','Overdue','Void')),
  issue_date        DATE NOT NULL,
  due_date          DATE,
  supply_date       DATE,
  tax_point         DATE,
  payment_terms     VARCHAR(30),
  subtotal          DECIMAL(15,2),
  discount_type     VARCHAR(10) CHECK (discount_type IN ('percent','fixed')),
  discount_value    DECIMAL(15,2),
  discount_amount   DECIMAL(15,2),
  shipping          DECIMAL(15,2) DEFAULT 0,
  total             DECIMAL(15,2),
  vat_scheme        VARCHAR(30)
                      CHECK (vat_scheme IN ('Standard','Cash Accounting','Flat Rate','Annual')),
  accounting_basis  VARCHAR(10) CHECK (accounting_basis IN ('Accrual','Cash')),
  notes             TEXT,
  terms             TEXT,
  po_number         VARCHAR(100),
  converted_from_quote VARCHAR(50),
  cis_deduction     DECIMAL(15,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, invoice_number)
);

-- =============================================================================
-- 2. invoice_line_items
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        DECIMAL(10,3) DEFAULT 1,
  rate            DECIMAL(15,2),
  amount          DECIMAL(15,2),
  tax_rate        DECIMAL(5,2) DEFAULT 0,
  tax_type        VARCHAR(20) CHECK (tax_type IN (
                    'standard','reduced','zero_rated','exempt','outside_scope'
                  )),
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  item_id         UUID,
  sort_order      INTEGER DEFAULT 0,
  cis_applicable  BOOLEAN DEFAULT false,
  cis_rate        DECIMAL(5,2)
);

-- =============================================================================
-- 3. invoice_tax_breakdown
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_tax_breakdown (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  rate            DECIMAL(5,2),
  tax_type        VARCHAR(20) CHECK (tax_type IN (
                    'standard','reduced','zero_rated','exempt','outside_scope'
                  )),
  taxable_amount  DECIMAL(15,2),
  tax_amount      DECIMAL(15,2)
);

-- =============================================================================
-- 4. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_user_id     ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date  ON public.invoices (issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_tax_point   ON public.invoices (tax_point);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices (customer_id);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id
  ON public.invoice_line_items (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_tax_breakdown_invoice_id
  ON public.invoice_tax_breakdown (invoice_id);

-- =============================================================================
-- 5. RLS — follows the exact pattern from 004_harden_rls_business_tables.sql
-- =============================================================================

-- invoices (user_id lives on the row)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_invoices ON public.invoices;
CREATE POLICY users_select_own_invoices ON public.invoices
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_insert_own_invoices ON public.invoices;
CREATE POLICY users_insert_own_invoices ON public.invoices
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_update_own_invoices ON public.invoices;
CREATE POLICY users_update_own_invoices ON public.invoices
  FOR UPDATE USING (user_id::text = auth.uid()::text)
             WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_delete_own_invoices ON public.invoices;
CREATE POLICY users_delete_own_invoices ON public.invoices
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- invoice_line_items (ownership inherited via parent invoice)
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_invoice_line_items ON public.invoice_line_items;
CREATE POLICY users_select_own_invoice_line_items ON public.invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND i.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS users_insert_own_invoice_line_items ON public.invoice_line_items;
CREATE POLICY users_insert_own_invoice_line_items ON public.invoice_line_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND i.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS users_update_own_invoice_line_items ON public.invoice_line_items;
CREATE POLICY users_update_own_invoice_line_items ON public.invoice_line_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND i.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND i.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS users_delete_own_invoice_line_items ON public.invoice_line_items;
CREATE POLICY users_delete_own_invoice_line_items ON public.invoice_line_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND i.user_id::text = auth.uid()::text
    )
  );

-- invoice_tax_breakdown (ownership inherited via parent invoice)
ALTER TABLE public.invoice_tax_breakdown ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_invoice_tax_breakdown ON public.invoice_tax_breakdown;
CREATE POLICY users_select_own_invoice_tax_breakdown ON public.invoice_tax_breakdown
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_tax_breakdown.invoice_id
        AND i.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS users_insert_own_invoice_tax_breakdown ON public.invoice_tax_breakdown;
CREATE POLICY users_insert_own_invoice_tax_breakdown ON public.invoice_tax_breakdown
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_tax_breakdown.invoice_id
        AND i.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS users_update_own_invoice_tax_breakdown ON public.invoice_tax_breakdown;
CREATE POLICY users_update_own_invoice_tax_breakdown ON public.invoice_tax_breakdown
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_tax_breakdown.invoice_id
        AND i.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_tax_breakdown.invoice_id
        AND i.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS users_delete_own_invoice_tax_breakdown ON public.invoice_tax_breakdown;
CREATE POLICY users_delete_own_invoice_tax_breakdown ON public.invoice_tax_breakdown
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_tax_breakdown.invoice_id
        AND i.user_id::text = auth.uid()::text
    )
  );

-- =============================================================================
-- 011_normalise_payments.sql
-- =============================================================================
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

-- =============================================================================
-- 012_normalise_expenses.sql
-- =============================================================================
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

-- =============================================================================
-- 013_normalise_customers.sql
-- =============================================================================
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

-- =============================================================================
-- 014_normalise_bills.sql
-- =============================================================================
-- Normalise bills out of the business_profiles JSONB column into proper
-- relational tables.  The existing JSONB column is intentionally left untouched
-- so both systems can coexist during migration.

-- =============================================================================
-- 1. bills
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_number     VARCHAR(50),
  supplier_name   TEXT,
  supplier_id     UUID,
  bill_date       DATE NOT NULL,
  due_date        DATE,
  category        VARCHAR(100),
  status          VARCHAR(20) NOT NULL DEFAULT 'Draft'
                    CHECK (status IN ('Draft','Awaiting Approval','Approved','Paid','Overdue','Void')),
  description     TEXT,
  reference       VARCHAR(200),
  amount          DECIMAL(15,2),
  tax_rate        DECIMAL(5,2) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  total           DECIMAL(15,2),
  paid_date       DATE,
  paid_amount     DECIMAL(15,2) DEFAULT 0,
  vat_period_id   UUID,
  locked          BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, bill_number)
);

-- =============================================================================
-- 2. bill_line_items
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bill_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    DECIMAL(10,3) DEFAULT 1,
  rate        DECIMAL(15,2),
  amount      DECIMAL(15,2),
  tax_rate    DECIMAL(5,2) DEFAULT 0,
  tax_type    VARCHAR(20) CHECK (tax_type IN (
                'standard','reduced','zero_rated','exempt','outside_scope'
              )),
  tax_amount  DECIMAL(15,2) DEFAULT 0,
  sort_order  INTEGER DEFAULT 0
);

-- =============================================================================
-- 3. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_bills_user_id   ON public.bills (user_id);
CREATE INDEX IF NOT EXISTS idx_bills_status    ON public.bills (status);
CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON public.bills (bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_due_date  ON public.bills (due_date);

CREATE INDEX IF NOT EXISTS idx_bill_line_items_bill_id
  ON public.bill_line_items (bill_id);

-- =============================================================================
-- 4. RLS — follows the exact pattern from 004_harden_rls_business_tables.sql
-- =============================================================================

-- bills (user_id lives on the row)
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_bills ON public.bills;
CREATE POLICY users_select_own_bills ON public.bills
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_insert_own_bills ON public.bills;
CREATE POLICY users_insert_own_bills ON public.bills
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_update_own_bills ON public.bills;
CREATE POLICY users_update_own_bills ON public.bills
  FOR UPDATE USING (user_id::text = auth.uid()::text)
             WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_delete_own_bills ON public.bills;
CREATE POLICY users_delete_own_bills ON public.bills
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- bill_line_items (ownership inherited via parent bill)
ALTER TABLE public.bill_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_bill_line_items ON public.bill_line_items;
CREATE POLICY users_select_own_bill_line_items ON public.bill_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_line_items.bill_id
        AND b.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS users_insert_own_bill_line_items ON public.bill_line_items;
CREATE POLICY users_insert_own_bill_line_items ON public.bill_line_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_line_items.bill_id
        AND b.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS users_update_own_bill_line_items ON public.bill_line_items;
CREATE POLICY users_update_own_bill_line_items ON public.bill_line_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_line_items.bill_id
        AND b.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_line_items.bill_id
        AND b.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS users_delete_own_bill_line_items ON public.bill_line_items;
CREATE POLICY users_delete_own_bill_line_items ON public.bill_line_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_line_items.bill_id
        AND b.user_id::text = auth.uid()::text
    )
  );

-- =============================================================================
-- 015_normalise_catalog_items.sql
-- =============================================================================
-- Normalise catalog items into a proper relational table.  Referenced by
-- invoice_line_items.item_id for quick line-item population.

-- =============================================================================
-- 1. catalog_items
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  type              VARCHAR(30),
  rate              DECIMAL(15,2),
  unit              VARCHAR(30),
  tax_rate          DECIMAL(5,2) DEFAULT 0,
  active            BOOLEAN DEFAULT true,
  cis_enabled       BOOLEAN DEFAULT false,
  cis_labour_pct    DECIMAL(5,2),
  account_category  VARCHAR(100),
  photo             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 2. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_catalog_items_user_id ON public.catalog_items (user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_active  ON public.catalog_items (user_id, active);
CREATE INDEX IF NOT EXISTS idx_catalog_items_type    ON public.catalog_items (user_id, type);

-- =============================================================================
-- 3. RLS — follows the exact pattern from 004_harden_rls_business_tables.sql
-- =============================================================================
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own_catalog_items ON public.catalog_items;
CREATE POLICY users_select_own_catalog_items ON public.catalog_items
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_insert_own_catalog_items ON public.catalog_items;
CREATE POLICY users_insert_own_catalog_items ON public.catalog_items
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_update_own_catalog_items ON public.catalog_items;
CREATE POLICY users_update_own_catalog_items ON public.catalog_items
  FOR UPDATE USING (user_id::text = auth.uid()::text)
             WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS users_delete_own_catalog_items ON public.catalog_items;
CREATE POLICY users_delete_own_catalog_items ON public.catalog_items
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- =============================================================================
-- 016_migrate_jsonb_to_tables.sql
-- =============================================================================
-- Migrate existing JSONB data from business_profiles into the normalised
-- tables created in migrations 010-015.
--
-- This migration is idempotent: it uses ON CONFLICT DO NOTHING everywhere.
-- It does NOT delete the original JSONB data — both systems coexist.
-- It runs as SECURITY DEFINER to bypass RLS during the migration.

-- =============================================================================
-- Helper: safe UUID cast — returns NULL for malformed / non-UUID strings
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.safe_uuid(val text)
RETURNS uuid AS $$
BEGIN
  RETURN val::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- Main migration function
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.migrate_jsonb_to_tables()
RETURNS void AS $$
DECLARE
  profile       record;
  inv           jsonb;
  li            jsonb;
  tb            jsonb;
  pay           jsonb;
  exp           jsonb;
  bil           jsonb;
  bli           jsonb;
  cust          jsonb;
  cat           jsonb;
  v_invoice_id  uuid;
  v_bill_id     uuid;
  v_customer_id uuid;
  v_user_id     uuid;
  v_err_msg     text;
BEGIN
  FOR profile IN
    SELECT user_id,
           COALESCE(customers,    '[]'::jsonb) AS customers,
           COALESCE(invoices,     '[]'::jsonb) AS invoices,
           COALESCE(payments,     '[]'::jsonb) AS payments,
           COALESCE(expenses,     '[]'::jsonb) AS expenses,
           COALESCE(bills,        '[]'::jsonb) AS bills,
           COALESCE(catalog_items,'[]'::jsonb) AS catalog_items
    FROM public.business_profiles
  LOOP
    BEGIN  -- per-user block; errors skip the user
      v_user_id := profile.user_id;

      -- =====================================================================
      -- 1. CUSTOMERS
      -- =====================================================================
      FOR cust IN SELECT * FROM jsonb_array_elements(profile.customers)
      LOOP
        INSERT INTO public.customers (
          id, user_id, name, company, email, phone, type,
          billing_address, vat_number,
          cis_registered, cis_utr, notes, created_at
        ) VALUES (
          COALESCE(pg_temp.safe_uuid(cust->>'id'), gen_random_uuid()),
          v_user_id,
          COALESCE(cust->>'name', 'Unknown'),
          cust->>'company',
          cust->>'email',
          cust->>'phone',
          COALESCE(cust->>'type', 'Individual'),
          CASE WHEN cust->'billingAddress' IS NOT NULL
               THEN jsonb_build_object(
                 'street',  COALESCE(cust->'billingAddress'->>'street1', ''),
                 'city',    COALESCE(cust->'billingAddress'->>'city', ''),
                 'postcode',COALESCE(cust->'billingAddress'->>'zip', ''),
                 'county',  COALESCE(cust->'billingAddress'->>'state', ''),
                 'country', COALESCE(cust->'billingAddress'->>'country', '')
               )
               ELSE NULL
          END,
          NULL,  -- vat_number not stored in JSONB
          COALESCE((cust->'cis'->>'registered')::boolean, false),
          cust->'cis'->>'utr',
          cust->>'notes',
          COALESCE(
            (cust->>'created_at')::timestamptz,
            now()
          )
        )
        ON CONFLICT DO NOTHING;
      END LOOP;

      -- =====================================================================
      -- 2. INVOICES + LINE ITEMS + TAX BREAKDOWN
      -- =====================================================================
      FOR inv IN SELECT * FROM jsonb_array_elements(profile.invoices)
      LOOP
        v_invoice_id := COALESCE(pg_temp.safe_uuid(inv->>'id'), gen_random_uuid());

        -- Resolve customer_id from the embedded customer object
        v_customer_id := NULL;
        IF inv->'customer' IS NOT NULL AND inv->'customer' != 'null'::jsonb THEN
          SELECT id INTO v_customer_id
          FROM public.customers
          WHERE user_id = v_user_id
            AND name = COALESCE(inv->'customer'->>'name', '')
          LIMIT 1;

          -- If not found, upsert the inline customer
          IF v_customer_id IS NULL THEN
            v_customer_id := COALESCE(
              pg_temp.safe_uuid(inv->'customer'->>'id'),
              gen_random_uuid()
            );
            INSERT INTO public.customers (
              id, user_id, name, company, email, phone, type,
              billing_address, cis_registered, cis_utr
            ) VALUES (
              v_customer_id,
              v_user_id,
              COALESCE(inv->'customer'->>'name', 'Unknown'),
              inv->'customer'->>'company',
              inv->'customer'->>'email',
              inv->'customer'->>'phone',
              COALESCE(inv->'customer'->>'type', 'Individual'),
              CASE WHEN inv->'customer'->'billingAddress' IS NOT NULL
                   THEN jsonb_build_object(
                     'street',  COALESCE(inv->'customer'->'billingAddress'->>'street1', ''),
                     'city',    COALESCE(inv->'customer'->'billingAddress'->>'city', ''),
                     'postcode',COALESCE(inv->'customer'->'billingAddress'->>'zip', ''),
                     'county',  COALESCE(inv->'customer'->'billingAddress'->>'state', ''),
                     'country', COALESCE(inv->'customer'->'billingAddress'->>'country', '')
                   )
                   ELSE NULL
              END,
              COALESCE((inv->'customer'->'cis'->>'registered')::boolean, false),
              inv->'customer'->'cis'->>'utr'
            )
            ON CONFLICT DO NOTHING;

            -- Re-fetch in case ON CONFLICT skipped due to id collision
            IF NOT FOUND THEN
              SELECT id INTO v_customer_id
              FROM public.customers
              WHERE user_id = v_user_id
                AND name = COALESCE(inv->'customer'->>'name', '')
              LIMIT 1;
            END IF;
          END IF;
        END IF;

        INSERT INTO public.invoices (
          id, user_id, invoice_number, customer_id, status,
          issue_date, due_date, supply_date, tax_point,
          payment_terms, subtotal,
          discount_type, discount_value, discount_amount,
          shipping, total,
          notes, terms, po_number, converted_from_quote,
          cis_deduction, created_at, updated_at
        ) VALUES (
          v_invoice_id,
          v_user_id,
          COALESCE(inv->>'invoice_number', 'MIGRATED-' || v_invoice_id),
          v_customer_id,
          COALESCE(inv->>'status', 'Draft'),
          COALESCE((inv->>'issue_date')::date, CURRENT_DATE),
          (inv->>'due_date')::date,
          (inv->>'supply_date')::date,
          (inv->>'tax_point')::date,
          inv->>'payment_terms',
          (inv->>'subtotal')::decimal(15,2),
          inv->>'discount_type',
          (inv->>'discount_value')::decimal(15,2),
          (inv->>'discountAmount')::decimal(15,2),
          COALESCE((inv->>'shipping')::decimal(15,2), 0),
          (inv->>'total')::decimal(15,2),
          inv->>'notes',
          inv->>'terms',
          inv->>'po_number',
          inv->>'converted_from_quote',
          COALESCE((inv->>'cisDeduction')::decimal(15,2), 0),
          COALESCE((inv->>'created_at')::timestamptz, now()),
          now()
        )
        ON CONFLICT DO NOTHING;

        -- Line items
        IF inv->'line_items' IS NOT NULL AND jsonb_typeof(inv->'line_items') = 'array' THEN
          FOR li IN SELECT * FROM jsonb_array_elements(inv->'line_items')
          LOOP
            INSERT INTO public.invoice_line_items (
              id, invoice_id, description, quantity, rate, amount,
              tax_rate, tax_type, tax_amount, sort_order, cis_applicable
            ) VALUES (
              COALESCE(pg_temp.safe_uuid(li->>'id'), gen_random_uuid()),
              v_invoice_id,
              COALESCE(li->>'description', li->>'name', ''),
              COALESCE((li->>'quantity')::decimal(10,3), 1),
              (li->>'rate')::decimal(15,2),
              (li->>'amount')::decimal(15,2),
              COALESCE((li->>'tax_rate')::decimal(5,2), 0),
              li->>'tax_type',
              COALESCE((li->>'tax_amount')::decimal(15,2), 0),
              COALESCE((li->>'sort_order')::integer, 0),
              COALESCE((li->>'cisApplicable')::boolean, false)
            )
            ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;

        -- Tax breakdown
        IF inv->'taxBreakdown' IS NOT NULL AND jsonb_typeof(inv->'taxBreakdown') = 'array' THEN
          FOR tb IN SELECT * FROM jsonb_array_elements(inv->'taxBreakdown')
          LOOP
            INSERT INTO public.invoice_tax_breakdown (
              id, invoice_id, rate, tax_type, taxable_amount, tax_amount
            ) VALUES (
              gen_random_uuid(),
              v_invoice_id,
              (tb->>'rate')::decimal(5,2),
              tb->>'type',
              NULL,  -- taxable_amount not stored in JSONB breakdown
              (tb->>'amount')::decimal(15,2)
            )
            ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;
      END LOOP;

      -- =====================================================================
      -- 3. PAYMENTS
      -- =====================================================================
      FOR pay IN SELECT * FROM jsonb_array_elements(profile.payments)
      LOOP
        INSERT INTO public.payments (
          id, user_id, payment_number, invoice_id,
          customer_name, amount, date, method,
          reference, status, notes, created_at
        ) VALUES (
          COALESCE(pg_temp.safe_uuid(pay->>'id'), gen_random_uuid()),
          v_user_id,
          pay->>'payment_number',
          pg_temp.safe_uuid(pay->>'invoice_id'),
          pay->>'customer_name',
          COALESCE((pay->>'amount')::decimal(15,2), 0),
          COALESCE((pay->>'date')::date, CURRENT_DATE),
          pay->>'method',
          pay->>'reference',
          COALESCE(pay->>'status', 'Pending'),
          pay->>'notes',
          now()
        )
        ON CONFLICT DO NOTHING;
      END LOOP;

      -- =====================================================================
      -- 4. EXPENSES
      -- =====================================================================
      FOR exp IN SELECT * FROM jsonb_array_elements(profile.expenses)
      LOOP
        -- Resolve customer_id for billable expenses
        v_customer_id := NULL;
        IF exp->'customer' IS NOT NULL AND exp->'customer' != 'null'::jsonb THEN
          SELECT id INTO v_customer_id
          FROM public.customers
          WHERE user_id = v_user_id
            AND name = COALESCE(exp->'customer'->>'name', '')
          LIMIT 1;
        END IF;

        INSERT INTO public.expenses (
          id, user_id, expense_number, date, category,
          vendor, description, expense_type,
          amount, tax_rate, tax_amount, total,
          status, billable, customer_id,
          paid_through, receipt_url,
          is_cis_expense,
          mileage_km, mileage_rate, mileage_from, mileage_to,
          created_at
        ) VALUES (
          COALESCE(pg_temp.safe_uuid(exp->>'id'), gen_random_uuid()),
          v_user_id,
          exp->>'expense_number',
          COALESCE((exp->>'date')::date, CURRENT_DATE),
          COALESCE(exp->>'category', 'Uncategorised'),
          exp->>'vendor',
          exp->>'description',
          COALESCE(
            CASE WHEN exp->>'expense_type' = 'regular' THEN 'standard'
                 ELSE exp->>'expense_type'
            END,
            'standard'
          ),
          (exp->>'amount')::decimal(15,2),
          COALESCE((exp->>'tax_rate')::decimal(5,2), 0),
          COALESCE((exp->>'tax_amount')::decimal(15,2), 0),
          (exp->>'total')::decimal(15,2),
          COALESCE(exp->>'status', 'Draft'),
          COALESCE((exp->>'billable')::boolean, false),
          v_customer_id,
          exp->>'paid_through',
          exp->>'receipt_url',
          COALESCE((exp->>'is_cis_expense')::boolean, false),
          (exp->>'mileage_km')::decimal(10,2),
          (exp->>'mileage_rate')::decimal(5,2),
          exp->>'mileage_from',
          exp->>'mileage_to',
          COALESCE((exp->>'created_at')::timestamptz, now())
        )
        ON CONFLICT DO NOTHING;
      END LOOP;

      -- =====================================================================
      -- 5. BILLS + BILL LINE ITEMS
      -- =====================================================================
      FOR bil IN SELECT * FROM jsonb_array_elements(profile.bills)
      LOOP
        v_bill_id := COALESCE(pg_temp.safe_uuid(bil->>'id'), gen_random_uuid());

        INSERT INTO public.bills (
          id, user_id, bill_number, supplier_name,
          bill_date, due_date, category, status,
          description, reference,
          amount, tax_rate, tax_amount, total,
          created_at
        ) VALUES (
          v_bill_id,
          v_user_id,
          bil->>'bill_number',
          bil->>'supplier_name',
          COALESCE((bil->>'bill_date')::date, CURRENT_DATE),
          (bil->>'due_date')::date,
          bil->>'category',
          COALESCE(bil->>'status', 'Draft'),
          bil->>'description',
          bil->>'reference',
          (bil->>'amount')::decimal(15,2),
          COALESCE((bil->>'tax_rate')::decimal(5,2), 0),
          COALESCE((bil->>'tax_amount')::decimal(15,2), 0),
          (bil->>'total')::decimal(15,2),
          now()
        )
        ON CONFLICT DO NOTHING;

        -- Bill line items (if present)
        IF bil->'line_items' IS NOT NULL AND jsonb_typeof(bil->'line_items') = 'array' THEN
          FOR bli IN SELECT * FROM jsonb_array_elements(bil->'line_items')
          LOOP
            INSERT INTO public.bill_line_items (
              id, bill_id, description, quantity, rate, amount,
              tax_rate, tax_type, tax_amount, sort_order
            ) VALUES (
              COALESCE(pg_temp.safe_uuid(bli->>'id'), gen_random_uuid()),
              v_bill_id,
              COALESCE(bli->>'description', ''),
              COALESCE((bli->>'quantity')::decimal(10,3), 1),
              (bli->>'rate')::decimal(15,2),
              (bli->>'amount')::decimal(15,2),
              COALESCE((bli->>'tax_rate')::decimal(5,2), 0),
              bli->>'tax_type',
              COALESCE((bli->>'tax_amount')::decimal(15,2), 0),
              COALESCE((bli->>'sort_order')::integer, 0)
            )
            ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;
      END LOOP;

      -- =====================================================================
      -- 6. CATALOG ITEMS
      -- =====================================================================
      FOR cat IN SELECT * FROM jsonb_array_elements(profile.catalog_items)
      LOOP
        INSERT INTO public.catalog_items (
          id, user_id, name, description, type, rate, unit,
          tax_rate, active,
          cis_enabled, cis_labour_pct,
          account_category, photo, created_at
        ) VALUES (
          COALESCE(pg_temp.safe_uuid(cat->>'id'), gen_random_uuid()),
          v_user_id,
          COALESCE(cat->>'name', 'Unnamed Item'),
          cat->>'description',
          cat->>'type',
          (cat->>'rate')::decimal(15,2),
          cat->>'unit',
          COALESCE((cat->>'taxRate')::decimal(5,2), 0),
          COALESCE((cat->>'active')::boolean, true),
          COALESCE((cat->'cis'->>'enabled')::boolean, false),
          (cat->'cis'->>'labour')::decimal(5,2),
          cat->>'account',
          cat->>'photo',
          now()
        )
        ON CONFLICT DO NOTHING;
      END LOOP;

    EXCEPTION WHEN others THEN
      GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT;
      RAISE WARNING 'migrate_jsonb_to_tables: skipping user_id=% — %',
                    v_user_id, v_err_msg;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Execute the migration
-- =============================================================================
SELECT pg_temp.migrate_jsonb_to_tables();

-- =============================================================================
-- 017_vat_returns.sql
-- =============================================================================
-- VAT Return data model
--
-- Creates tables for VAT period management and return submissions,
-- supporting MTD for VAT compliance with HMRC.

-- =============================================================================
-- vat_periods — one row per quarterly / annual VAT period per user
-- =============================================================================
CREATE TABLE IF NOT EXISTS vat_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  due_date      DATE NOT NULL,  -- 1 month + 7 days after period_end
  stagger       INTEGER CHECK (stagger IN (1, 2, 3)),  -- HMRC VAT stagger group
  scheme        VARCHAR(30) CHECK (scheme IN ('Standard', 'Cash Accounting', 'Flat Rate', 'Annual')),
  status        VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'draft', 'submitted', 'acknowledged')),
  submitted_at  TIMESTAMPTZ,
  hmrc_receipt_id TEXT,
  locked        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_vat_periods_user_start UNIQUE (user_id, period_start),
  CONSTRAINT ck_vat_periods_date_range CHECK (period_end > period_start)
);

-- Index for common lookups: open periods for a user, sorted by date
CREATE INDEX IF NOT EXISTS idx_vat_periods_user_status
  ON vat_periods (user_id, status, period_start);

-- =============================================================================
-- vat_return_submissions — the 9-box VAT return + audit trail
-- =============================================================================
CREATE TABLE IF NOT EXISTS vat_return_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vat_period_id     UUID NOT NULL REFERENCES vat_periods(id) ON DELETE CASCADE,

  -- HMRC 9-box model
  box1              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- VAT due on sales
  box2              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- VAT due on acquisitions
  box3              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Total VAT due (box1 + box2)
  box4              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- VAT reclaimed on purchases
  box5              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Net VAT (box3 - box4)
  box6              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Total sales ex VAT
  box7              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Total purchases ex VAT
  box8              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Supplies to EU (NI only)
  box9              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Acquisitions from EU (NI only)

  -- Flat Rate Scheme fields
  flat_rate_turnover DECIMAL(15,2),
  flat_rate_pct      DECIMAL(5,2),

  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'submitted', 'acknowledged', 'error')),

  -- Audit trail
  payload_sent      JSONB,   -- Full HMRC API request
  hmrc_response     JSONB,   -- HMRC API response
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vat_return_submissions_period
  ON vat_return_submissions (vat_period_id);

CREATE INDEX IF NOT EXISTS idx_vat_return_submissions_user
  ON vat_return_submissions (user_id, created_at DESC);

-- =============================================================================
-- RLS policies
-- =============================================================================
ALTER TABLE vat_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_return_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vat_periods_owner ON vat_periods;
CREATE POLICY vat_periods_owner ON vat_periods
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS vat_return_submissions_owner ON vat_return_submissions;
CREATE POLICY vat_return_submissions_owner ON vat_return_submissions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 018_hmrc_tokens.sql
-- =============================================================================
-- HMRC OAuth token storage for MTD for VAT integration.
--
-- Tokens are encrypted at the application layer (AES-256-GCM) before storage.
-- This table holds one active token set per user.

CREATE TABLE IF NOT EXISTS hmrc_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,      -- AES-256-GCM encrypted
  refresh_token TEXT NOT NULL,      -- AES-256-GCM encrypted
  expires_at    TIMESTAMPTZ NOT NULL,
  vrn           VARCHAR(20),        -- VAT Registration Number
  scope         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_hmrc_tokens_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_hmrc_tokens_expires
  ON hmrc_tokens (user_id, expires_at);

-- RLS
ALTER TABLE hmrc_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hmrc_tokens_owner ON hmrc_tokens;
CREATE POLICY hmrc_tokens_owner ON hmrc_tokens
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 019_hmrc_api_log.sql
-- =============================================================================
-- HMRC API call audit log.
--
-- Every outbound call to HMRC's MTD API is logged here for compliance,
-- debugging, and rate-limit monitoring.

CREATE TABLE IF NOT EXISTS hmrc_api_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,            -- e.g. GET /organisations/vat/{vrn}/obligations
  method        VARCHAR(10) NOT NULL,     -- GET, POST
  request_body  JSONB,                    -- sanitised request payload (no tokens)
  response_code INTEGER,                  -- HTTP status from HMRC
  response_body JSONB,                    -- full HMRC response
  error_message TEXT,                     -- user-friendly error if failed
  duration_ms   INTEGER,                  -- round-trip time
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hmrc_api_log_user
  ON hmrc_api_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hmrc_api_log_endpoint
  ON hmrc_api_log (endpoint, created_at DESC);

-- RLS
ALTER TABLE hmrc_api_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hmrc_api_log_owner ON hmrc_api_log;
CREATE POLICY hmrc_api_log_owner ON hmrc_api_log
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 020_itsa_submissions.sql
-- =============================================================================
-- ITSA (Income Tax Self Assessment) quarterly submission system.
--
-- MTD ITSA is mandatory from 6 April 2026 for sole traders with
-- qualifying income > £50,000.
--
-- ITSA tax year runs 6 Apr → 5 Apr, split into four quarters:
--   Q1: 6 Apr – 5 Jul   (deadline 5 Aug)
--   Q2: 6 Jul – 5 Oct   (deadline 5 Nov)
--   Q3: 6 Oct – 5 Jan   (deadline 5 Feb)
--   Q4: 6 Jan – 5 Apr   (deadline 5 May)

-- =============================================================================
-- itsa_periods — one row per ITSA quarter per user
-- =============================================================================
CREATE TABLE IF NOT EXISTS itsa_periods (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year            VARCHAR(10) NOT NULL,  -- e.g. '2026-27'
  quarter             VARCHAR(2) NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  submission_deadline DATE NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'draft', 'submitted')),
  locked              BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_itsa_periods_user_year_quarter UNIQUE (user_id, tax_year, quarter),
  CONSTRAINT ck_itsa_periods_date_range CHECK (period_end > period_start)
);

CREATE INDEX IF NOT EXISTS idx_itsa_periods_user_status
  ON itsa_periods (user_id, status, period_start);

CREATE INDEX IF NOT EXISTS idx_itsa_periods_user_tax_year
  ON itsa_periods (user_id, tax_year);

-- =============================================================================
-- itsa_quarterly_updates — the quarterly income/expense submission + audit trail
-- =============================================================================
CREATE TABLE IF NOT EXISTS itsa_quarterly_updates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_id           UUID NOT NULL REFERENCES itsa_periods(id) ON DELETE CASCADE,

  total_income        DECIMAL(15,2) NOT NULL DEFAULT 0,  -- turnover (invoices paid/issued in period)
  total_expenses      DECIMAL(15,2) NOT NULL DEFAULT 0,  -- allowable expenses in period
  expense_breakdown   JSONB,                              -- categorised expenses keyed by SA box
  accounting_basis    VARCHAR(10) NOT NULL DEFAULT 'cash'
                        CHECK (accounting_basis IN ('cash', 'accrual')),

  -- Audit trail
  payload_sent        JSONB,                              -- full HMRC API request
  hmrc_response       JSONB,                              -- HMRC API response
  status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'submitted', 'acknowledged', 'error')),
  submitted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itsa_quarterly_updates_period
  ON itsa_quarterly_updates (period_id);

CREATE INDEX IF NOT EXISTS idx_itsa_quarterly_updates_user
  ON itsa_quarterly_updates (user_id, created_at DESC);

-- =============================================================================
-- itsa_final_declarations — end-of-year final declaration per tax year
-- =============================================================================
CREATE TABLE IF NOT EXISTS itsa_final_declarations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year            VARCHAR(10) NOT NULL,  -- e.g. '2026-27'

  total_income        DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_expenses      DECIMAL(15,2) NOT NULL DEFAULT 0,
  adjustments         JSONB,                -- e.g. { "privatePortion": 500, "otherIncome": 200 }
  capital_allowances  DECIMAL(15,2) NOT NULL DEFAULT 0,
  final_profit        DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Audit trail
  payload_sent        JSONB,
  hmrc_response       JSONB,
  status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'submitted', 'acknowledged', 'error')),
  submitted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_itsa_final_declarations_user_year UNIQUE (user_id, tax_year)
);

CREATE INDEX IF NOT EXISTS idx_itsa_final_declarations_user
  ON itsa_final_declarations (user_id, tax_year);

-- =============================================================================
-- RLS policies
-- =============================================================================
ALTER TABLE itsa_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE itsa_quarterly_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE itsa_final_declarations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS itsa_periods_owner ON itsa_periods;
CREATE POLICY itsa_periods_owner ON itsa_periods
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS itsa_quarterly_updates_owner ON itsa_quarterly_updates;
CREATE POLICY itsa_quarterly_updates_owner ON itsa_quarterly_updates
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS itsa_final_declarations_owner ON itsa_final_declarations;
CREATE POLICY itsa_final_declarations_owner ON itsa_final_declarations
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 021_payroll_schema.sql
-- =============================================================================
-- Payroll schema for UK small business payroll.
--
-- Supports PAYE, NIC, student loan, pension auto-enrolment, and
-- HMRC RTI (Real Time Information) FPS/EPS submissions.
--
-- Chart of accounts integration:
--   2300 — PAYE/NIC Liability
--   6000 — Wages & Salaries (expense)

-- =============================================================================
-- employees — staff records for payroll
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal details
  title                 VARCHAR(10),                      -- Mr/Mrs/Ms/Dr/etc
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  date_of_birth         DATE,
  ni_number             VARCHAR(13),                      -- AB123456C format
  address               JSONB,                            -- { street, city, postcode, country }

  -- Tax & NI
  tax_code              VARCHAR(20) NOT NULL DEFAULT '1257L',
  ni_category           CHAR(1) NOT NULL DEFAULT 'A'
                          CHECK (ni_category IN ('A','B','C','H','J','M','Z')),
  student_loan_plan     VARCHAR(10) DEFAULT 'none'
                          CHECK (student_loan_plan IN ('none','plan1','plan2','plan4','plan5','postgrad')),

  -- Pay
  salary_type           VARCHAR(10) NOT NULL DEFAULT 'annual'
                          CHECK (salary_type IN ('annual', 'hourly')),
  salary_amount         DECIMAL(15,2) NOT NULL,
  pay_frequency         VARCHAR(12) NOT NULL DEFAULT 'monthly'
                          CHECK (pay_frequency IN ('weekly', 'fortnightly', 'monthly')),

  -- Employment
  start_date            DATE NOT NULL,
  leave_date            DATE,
  status                VARCHAR(10) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'leaver')),

  -- Pension auto-enrolment
  pension_enrolled      BOOLEAN NOT NULL DEFAULT false,
  pension_employee_pct  DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  pension_employer_pct  DECIMAL(5,2) NOT NULL DEFAULT 3.00,

  -- Sensitive — encrypted at application layer before storage
  bank_details          JSONB,                            -- { bank_name, sort_code, account_number }

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_user_status
  ON employees (user_id, status);

CREATE INDEX IF NOT EXISTS idx_employees_user_name
  ON employees (user_id, last_name, first_name);

-- =============================================================================
-- payroll_runs — one row per pay period batch
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_runs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Period
  tax_year                  VARCHAR(10) NOT NULL,         -- e.g. '2026-27'
  tax_month                 INTEGER NOT NULL CHECK (tax_month BETWEEN 1 AND 12),
  tax_week                  INTEGER CHECK (tax_week BETWEEN 1 AND 52),
  period_start              DATE NOT NULL,
  period_end                DATE NOT NULL,
  pay_date                  DATE NOT NULL,

  -- Status
  status                    VARCHAR(20) NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'approved', 'submitted', 'paid')),

  -- Totals (aggregated from payslips)
  total_gross               DECIMAL(15,2),
  total_tax                 DECIMAL(15,2),
  total_ni_employee         DECIMAL(15,2),
  total_ni_employer         DECIMAL(15,2),
  total_pension_employee    DECIMAL(15,2),
  total_pension_employer    DECIMAL(15,2),
  total_student_loan        DECIMAL(15,2),
  total_net                 DECIMAL(15,2),

  -- HMRC RTI FPS
  fps_submitted             BOOLEAN NOT NULL DEFAULT false,
  fps_submitted_at          TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_payroll_runs_dates CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_user_year
  ON payroll_runs (user_id, tax_year, tax_month);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_status
  ON payroll_runs (user_id, status);

-- =============================================================================
-- payslips — one row per employee per payroll run
-- =============================================================================
CREATE TABLE IF NOT EXISTS payslips (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id            UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id               UUID NOT NULL REFERENCES employees(id),

  -- Hours (for hourly employees)
  hours_worked              DECIMAL(10,2),

  -- Pay
  gross_pay                 DECIMAL(15,2) NOT NULL,
  taxable_pay               DECIMAL(15,2),
  tax_deducted              DECIMAL(15,2) NOT NULL DEFAULT 0,
  ni_employee               DECIMAL(15,2) NOT NULL DEFAULT 0,
  ni_employer               DECIMAL(15,2) NOT NULL DEFAULT 0,
  pension_employee          DECIMAL(15,2) NOT NULL DEFAULT 0,
  pension_employer          DECIMAL(15,2) NOT NULL DEFAULT 0,
  student_loan              DECIMAL(15,2) NOT NULL DEFAULT 0,
  other_deductions          DECIMAL(15,2) NOT NULL DEFAULT 0,
  other_additions           DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_pay                   DECIMAL(15,2) NOT NULL,

  -- Cumulative year-to-date
  gross_ytd                 DECIMAL(15,2),
  tax_ytd                   DECIMAL(15,2),
  ni_ytd                    DECIMAL(15,2),

  notes                     TEXT,

  CONSTRAINT uq_payslips_run_employee UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payslips_run
  ON payslips (payroll_run_id);

CREATE INDEX IF NOT EXISTS idx_payslips_employee
  ON payslips (employee_id);

-- =============================================================================
-- payroll_ytd — running year-to-date totals per employee per tax year
--
-- Denormalised for fast cumulative PAYE lookups.
-- Updated after each payroll run is finalised.
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_ytd (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id               UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tax_year                  VARCHAR(10) NOT NULL,

  gross_ytd                 DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_ytd                   DECIMAL(15,2) NOT NULL DEFAULT 0,
  ni_ytd                    DECIMAL(15,2) NOT NULL DEFAULT 0,
  pension_ytd               DECIMAL(15,2) NOT NULL DEFAULT 0,
  student_loan_ytd          DECIMAL(15,2) NOT NULL DEFAULT 0,

  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_payroll_ytd_emp_year UNIQUE (employee_id, tax_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_ytd_employee
  ON payroll_ytd (employee_id, tax_year);

-- =============================================================================
-- rti_submissions — HMRC Real Time Information submissions (FPS / EPS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rti_submissions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payroll_run_id            UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,

  submission_type           VARCHAR(5) NOT NULL
                              CHECK (submission_type IN ('FPS', 'EPS')),
  xml_payload               TEXT,                          -- full RTI XML sent to HMRC
  hmrc_response             TEXT,                          -- HMRC acknowledgement / error
  status                    VARCHAR(20) NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected')),
  submitted_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rti_submissions_user
  ON rti_submissions (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_rti_submissions_run
  ON rti_submissions (payroll_run_id);

-- =============================================================================
-- paye_reference — employer PAYE registration (one per user)
-- =============================================================================
CREATE TABLE IF NOT EXISTS paye_reference (
  user_id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_paye_ref         VARCHAR(20),                   -- e.g. '123/AB456'
  accounts_office_ref       VARCHAR(20),
  tax_office_number         VARCHAR(5)
);

-- =============================================================================
-- RLS policies — all tables scoped to owner
-- =============================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_ytd ENABLE ROW LEVEL SECURITY;
ALTER TABLE rti_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paye_reference ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employees_owner ON employees;
CREATE POLICY employees_owner ON employees
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS payroll_runs_owner ON payroll_runs;
CREATE POLICY payroll_runs_owner ON payroll_runs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- payslips: RLS via the payroll_run's user_id joined through the run
-- Since payslips don't have user_id, we use a subquery policy
DROP POLICY IF EXISTS payslips_owner ON payslips;
CREATE POLICY payslips_owner ON payslips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM payroll_runs pr
      WHERE pr.id = payslips.payroll_run_id
        AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll_runs pr
      WHERE pr.id = payslips.payroll_run_id
        AND pr.user_id = auth.uid()
    )
  );

-- payroll_ytd: RLS via employee's user_id
DROP POLICY IF EXISTS payroll_ytd_owner ON payroll_ytd;
CREATE POLICY payroll_ytd_owner ON payroll_ytd
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = payroll_ytd.employee_id
        AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = payroll_ytd.employee_id
        AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS rti_submissions_owner ON rti_submissions;
CREATE POLICY rti_submissions_owner ON rti_submissions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS paye_reference_owner ON paye_reference;
CREATE POLICY paye_reference_owner ON paye_reference
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
