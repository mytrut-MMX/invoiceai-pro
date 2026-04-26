-- 050: Create logos storage bucket for company branding
-- Idempotent: safe to run multiple times

-- Create the bucket (public so logo URLs work without auth tokens on invoices/PDFs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can only manage their own folder (userId prefix)
-- The upload path in SettingsBranding.jsx is: ${userId}/${timestamp}.${ext}
-- (RLS is already enabled on storage.objects by Supabase, so we don't ALTER it.)

-- SELECT: anyone can read (public bucket, logos appear on invoices/emails)
DROP POLICY IF EXISTS "logos_select" ON storage.objects;
CREATE POLICY "logos_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'logos');

-- INSERT: authenticated users can upload to their own folder
DROP POLICY IF EXISTS "logos_insert" ON storage.objects;
CREATE POLICY "logos_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: authenticated users can update their own files
DROP POLICY IF EXISTS "logos_update" ON storage.objects;
CREATE POLICY "logos_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: authenticated users can delete their own files
DROP POLICY IF EXISTS "logos_delete" ON storage.objects;
CREATE POLICY "logos_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
