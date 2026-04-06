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
