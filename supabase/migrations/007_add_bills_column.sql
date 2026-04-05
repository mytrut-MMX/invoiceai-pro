ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS bills jsonb NOT NULL DEFAULT '[]'::jsonb;
