-- 032_ct_export_log_csv_variants.sql
-- Expand ct_export_log.export_type to allow CSV variants + rename
-- pdf_storage_path -> storage_path (generic for pdf/csv).
--
-- Backward compat: existing rows have export_type = 'pdf' (unchanged).
-- The renamed column keeps all existing values; Supabase PostgREST will
-- surface the new name automatically.

-- 1. Drop existing CHECK constraint and re-add with widened enum
ALTER TABLE public.ct_export_log
  DROP CONSTRAINT IF EXISTS export_type_valid;

ALTER TABLE public.ct_export_log
  ADD CONSTRAINT export_type_valid
  CHECK (export_type IN ('pdf', 'csv-flat', 'csv-detailed'));

-- 2. Rename pdf_storage_path -> storage_path
ALTER TABLE public.ct_export_log
  RENAME COLUMN pdf_storage_path TO storage_path;

-- 3. Composite index for future "list previous exports by type" queries
CREATE INDEX IF NOT EXISTS idx_ct_export_log_period_type
  ON public.ct_export_log (period_id, export_type);

-- 4. Update column comments
COMMENT ON COLUMN public.ct_export_log.export_type IS
  'Export format: pdf (default) | csv-flat (single-row summary) | '
  'csv-detailed (multi-section). Set by exporter at insert time.';

COMMENT ON COLUMN public.ct_export_log.storage_path IS
  'Path in ct-exports bucket. Convention: {user_id}/{period_id}/{timestamp}.{ext}';

-- Verification queries (run manually):
-- SELECT export_type, COUNT(*) FROM public.ct_export_log GROUP BY export_type;
--   -- existing rows return 'pdf'
-- INSERT INTO public.ct_export_log (user_id, period_id, export_type,
--   period_start, period_end) VALUES (gen_random_uuid(), gen_random_uuid(),
--   'bogus', '2024-01-01', '2024-12-31');
--   -- should fail: new row violates check constraint "export_type_valid"
-- \d public.ct_export_log
--   -- should show storage_path (not pdf_storage_path), widened CHECK,
--   -- new idx_ct_export_log_period_type index
