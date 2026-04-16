-- 033_ct_period_unlock_log.sql
-- Append-only audit trail for CT period unlock events.
-- Mirrors ct_export_log RLS pattern (SELECT + INSERT only).
--
-- HMRC retention: 6 years from end of accounting period (LTDs).

CREATE TABLE IF NOT EXISTS public.ct_period_unlock_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_id       UUID NOT NULL REFERENCES public.corporation_tax_periods(id)
                    ON DELETE CASCADE,

  -- Mandatory reason supplied by user at unlock time
  reason          TEXT NOT NULL CHECK (length(trim(reason)) >= 5),

  -- Snapshot of period state at moment of unlock (so audit row is meaningful
  -- even if the period is later edited / re-finalized / re-unlocked)
  prev_status              VARCHAR(20) NOT NULL,
  prev_accounting_profit   NUMERIC(12,2),
  prev_tax_adjusted_profit NUMERIC(12,2),
  prev_ct_estimated        NUMERIC(12,2),
  prev_rate_bracket        VARCHAR(20),
  prev_finalized_at        TIMESTAMPTZ,  -- pulled from periods.updated_at at unlock time

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ct_period_unlock_log IS
  'Append-only audit trail of CT period unlock events. Captures snapshot '
  'of period state pre-unlock for accountability. HMRC retention: 6 years '
  'from end of accounting period.';

CREATE INDEX IF NOT EXISTS idx_ct_unlock_log_user
  ON public.ct_period_unlock_log (user_id);

CREATE INDEX IF NOT EXISTS idx_ct_unlock_log_period
  ON public.ct_period_unlock_log (period_id, created_at DESC);

ALTER TABLE public.ct_period_unlock_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ct_unlock_log_select_own ON public.ct_period_unlock_log;
CREATE POLICY ct_unlock_log_select_own ON public.ct_period_unlock_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ct_unlock_log_insert_own ON public.ct_period_unlock_log;
CREATE POLICY ct_unlock_log_insert_own ON public.ct_period_unlock_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policies: append-only.

-- Verification queries (run manually):
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name = 'ct_period_unlock_log';
--   -- expect: 1 row
-- SELECT COUNT(*) FROM pg_policies
--   WHERE tablename = 'ct_period_unlock_log';
--   -- expect: 2
-- INSERT INTO ct_period_unlock_log (user_id, period_id, reason, prev_status)
--   VALUES (gen_random_uuid(), gen_random_uuid(), 'too', 'finalized');
--   -- expect: violates check constraint (reason too short)
