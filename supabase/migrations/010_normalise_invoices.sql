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
