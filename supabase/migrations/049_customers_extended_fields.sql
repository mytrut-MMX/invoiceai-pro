-- 049: Add columns that CustomerModal persists but migration 013 omitted.
-- All columns are nullable — existing rows unaffected.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS first_name       TEXT,
  ADD COLUMN IF NOT EXISTS last_name        TEXT,
  ADD COLUMN IF NOT EXISTS salutation       TEXT,
  ADD COLUMN IF NOT EXISTS website          TEXT,
  ADD COLUMN IF NOT EXISTS currency         TEXT DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS payment_terms    TEXT DEFAULT 'Due on Receipt',
  ADD COLUMN IF NOT EXISTS shipping_address JSONB,
  ADD COLUMN IF NOT EXISTS contact_persons  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_fields    JSONB DEFAULT '[]'::jsonb;

-- Pre-flight verification (run to confirm columns exist after applying):
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'customers'
--   AND column_name IN ('first_name','last_name','salutation','website',
--     'currency','payment_terms','shipping_address','contact_persons','custom_fields');