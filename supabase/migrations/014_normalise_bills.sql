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
