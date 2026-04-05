-- 006_verify_complete_rls.sql
-- IDOR-001: Defensive migration — ensures every public table has RLS enabled.
-- Idempotent: safe to run multiple times.

-- =====================================================================
-- A) Enable RLS on any public table that doesn't have it yet
-- =====================================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('schema_migrations')
      AND tablename NOT IN (
        SELECT c.relname FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relrowsecurity = true
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    RAISE NOTICE 'IDOR-001: RLS enabled on previously unprotected table: %', tbl;
  END LOOP;
END $$;

-- =====================================================================
-- B) contact_submissions — service_role only (no anon/authenticated access)
-- =====================================================================
DO $$ BEGIN
  IF to_regclass('public.contact_submissions') IS NOT NULL THEN
    ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "service_only_contact" ON public.contact_submissions;
    CREATE POLICY "service_only_contact" ON public.contact_submissions
      FOR ALL USING (false);  -- blocks anon/authenticated; service_role bypasses RLS
  END IF;
END $$;

-- =====================================================================
-- C) agent_objectives — service_role only
-- =====================================================================
DO $$ BEGIN
  IF to_regclass('public.agent_objectives') IS NOT NULL THEN
    ALTER TABLE public.agent_objectives ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "service_only_objectives" ON public.agent_objectives;
    CREATE POLICY "service_only_objectives" ON public.agent_objectives
      FOR ALL USING (false);  -- blocks anon/authenticated; service_role bypasses RLS
  END IF;
END $$;

-- =====================================================================
-- D) agent_tasks — service_role only
-- =====================================================================
DO $$ BEGIN
  IF to_regclass('public.agent_tasks') IS NOT NULL THEN
    ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "service_only_tasks" ON public.agent_tasks;
    CREATE POLICY "service_only_tasks" ON public.agent_tasks
      FOR ALL USING (false);  -- blocks anon/authenticated; service_role bypasses RLS
  END IF;
END $$;
