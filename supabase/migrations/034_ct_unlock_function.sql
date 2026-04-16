-- 034_ct_unlock_function.sql
-- SECURITY DEFINER function to unlock a finalized CT period.
-- Bypasses RLS UPDATE block (locked = false condition) while still enforcing
-- auth.uid() ownership inside the function.

CREATE OR REPLACE FUNCTION public.unlock_ct_period(
  p_period_id UUID,
  p_reason    TEXT
)
RETURNS public.corporation_tax_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.corporation_tax_periods;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Lock the row + verify ownership
  SELECT * INTO v_period
  FROM public.corporation_tax_periods
  WHERE id = p_period_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Period not found or not owned by user'
      USING ERRCODE = '42501';
  END IF;

  IF v_period.locked = false THEN
    RAISE EXCEPTION 'Period is already unlocked' USING ERRCODE = '22023';
  END IF;

  IF length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Reason must be at least 5 characters'
      USING ERRCODE = '22023';
  END IF;

  -- Insert audit row first (snapshot pre-unlock)
  INSERT INTO public.ct_period_unlock_log (
    user_id, period_id, reason, prev_status,
    prev_accounting_profit, prev_tax_adjusted_profit,
    prev_ct_estimated, prev_rate_bracket, prev_finalized_at
  ) VALUES (
    v_user_id, p_period_id, p_reason, v_period.status,
    v_period.accounting_profit, v_period.tax_adjusted_profit,
    v_period.ct_estimated, v_period.rate_bracket, v_period.updated_at
  );

  -- Unlock + revert to draft
  UPDATE public.corporation_tax_periods
  SET locked = false, status = 'draft', updated_at = now()
  WHERE id = p_period_id
  RETURNING * INTO v_period;

  RETURN v_period;
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_ct_period(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_ct_period(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.unlock_ct_period(UUID, TEXT) IS
  'Unlock a finalized CT period (sets locked=false, status=draft) and '
  'insert pre-unlock snapshot into ct_period_unlock_log. SECURITY DEFINER '
  'bypasses RLS UPDATE block; ownership verified internally via auth.uid().';

-- Verification (run manually):
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'unlock_ct_period';
--   -- expect: 1 row, prosecdef = true
-- SELECT * FROM unlock_ct_period(gen_random_uuid(), 'test reason here');
--   -- expect: error "Period not found or not owned by user"
