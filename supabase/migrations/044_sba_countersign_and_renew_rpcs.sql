-- 044_sba_countersign_and_renew_rpcs.sql
-- Self-billing RPCs added on top of migration 043:
--   1. sign_sba_by_counterparty  — PUBLIC countersign via one-time token.
--      Token IS the auth mechanism (the counterparty is not logged in).
--      Grant to anon + authenticated. MUST be fronted by a rate-limited
--      API route (recommendation: 5 requests / minute / IP).
--   2. supersede_and_renew_sba   — authenticated renewal. Atomically marks
--      the old agreement as superseded and inserts a new draft pointing at
--      its predecessor via supersedes_id.
--
-- Patterns: SECURITY DEFINER + SET search_path = public + FOR UPDATE row
-- lock + auth.uid() ownership check (mirrors 034_ct_unlock_function.sql).

-- =============================================================================
-- 1. sign_sba_by_counterparty(p_token, p_name, p_ip)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sign_sba_by_counterparty(
  p_token TEXT,
  p_name  TEXT,
  p_ip    INET
)
RETURNS public.self_billing_agreements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sba public.self_billing_agreements;
BEGIN
  IF p_token IS NULL THEN
    RAISE EXCEPTION 'Invalid or already-used countersign link'
      USING ERRCODE = '42501';
  END IF;

  IF length(coalesce(trim(p_name), '')) < 2
     OR length(trim(p_name))           > 200 THEN
    RAISE EXCEPTION 'Signatory name must be between 2 and 200 characters'
      USING ERRCODE = '22023';
  END IF;

  -- Lock the row by one-time token. Same ERRCODE for "not found" and
  -- "already consumed" so existence of tokens is not disclosed.
  SELECT * INTO v_sba
  FROM public.self_billing_agreements
  WHERE signed_by_them_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already-used countersign link'
      USING ERRCODE = '42501';
  END IF;

  IF v_sba.status <> 'pending_countersign' THEN
    RAISE EXCEPTION 'Agreement is not pending countersignature'
      USING ERRCODE = '22023';
  END IF;

  -- Defence-in-depth: status check above should already prevent this, but
  -- guard against any drift that leaves a signed row in pending status.
  IF v_sba.signed_by_them_at IS NOT NULL THEN
    RAISE EXCEPTION 'Agreement has already been countersigned'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.self_billing_agreements
  SET signed_by_them_at   = now(),
      signed_by_them_name = trim(p_name),
      signed_by_them_ip   = p_ip,
      status              = 'active',
      signed_by_them_token = NULL   -- one-time use
  WHERE id = v_sba.id
  RETURNING * INTO v_sba;

  RETURN v_sba;
END;
$$;

REVOKE ALL    ON FUNCTION public.sign_sba_by_counterparty(TEXT, TEXT, INET) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_sba_by_counterparty(TEXT, TEXT, INET) TO anon, authenticated;

COMMENT ON FUNCTION public.sign_sba_by_counterparty(TEXT, TEXT, INET) IS
  'Public countersign RPC for self-billing agreements. Token IS the auth '
  'mechanism. Must be called behind an API route with rate limiting '
  '(recommendation: 5/min/IP). Token is cleared on success (one-time use).';

-- =============================================================================
-- 2. supersede_and_renew_sba — atomic "end old, begin new" renewal.
--    Both writes run in the same transaction.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.supersede_and_renew_sba(
  p_old_sba_id         UUID,
  p_new_start_date     DATE,
  p_new_end_date       DATE,
  p_new_terms_snapshot JSONB
)
RETURNS public.self_billing_agreements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.self_billing_agreements;
  v_new public.self_billing_agreements;
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_new_start_date IS NULL OR p_new_end_date IS NULL
     OR p_new_end_date <= p_new_start_date THEN
    RAISE EXCEPTION 'End date must be after start date'
      USING ERRCODE = '22023';
  END IF;

  IF p_new_end_date > p_new_start_date + INTERVAL '24 months' THEN
    RAISE EXCEPTION 'Agreement cannot exceed 24 months'
      USING ERRCODE = '22023';
  END IF;

  -- Lock the old row + verify ownership.
  SELECT * INTO v_old
  FROM public.self_billing_agreements
  WHERE id = p_old_sba_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agreement not found or not owned by user'
      USING ERRCODE = '42501';
  END IF;

  IF v_old.status NOT IN ('active', 'pending_countersign') THEN
    RAISE EXCEPTION 'Only active or pending agreements can be superseded'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.self_billing_agreements
  SET status     = 'superseded',
      updated_at = now()
  WHERE id = v_old.id;

  INSERT INTO public.self_billing_agreements (
    user_id, supplier_id, customer_id, direction,
    version, supersedes_id,
    start_date, end_date, terms_snapshot, status
  ) VALUES (
    v_uid, v_old.supplier_id, v_old.customer_id, v_old.direction,
    v_old.version + 1, v_old.id,
    p_new_start_date, p_new_end_date,
    COALESCE(p_new_terms_snapshot, '{}'::jsonb), 'draft'
  )
  RETURNING * INTO v_new;

  RETURN v_new;
END;
$$;

REVOKE ALL    ON FUNCTION public.supersede_and_renew_sba(UUID, DATE, DATE, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.supersede_and_renew_sba(UUID, DATE, DATE, JSONB) TO authenticated;

COMMENT ON FUNCTION public.supersede_and_renew_sba(UUID, DATE, DATE, JSONB) IS
  'Atomically marks the old self-billing agreement as superseded and inserts '
  'a new draft pointing at it via supersedes_id. Ownership enforced via '
  'auth.uid() (SECURITY DEFINER). Both writes run in the same transaction.';

-- =============================================================================
-- Verification (run manually in Supabase SQL editor)
-- =============================================================================
-- SELECT proname, prosecdef FROM pg_proc
--   WHERE proname IN ('sign_sba_by_counterparty','supersede_and_renew_sba');
--   -- expect: 2 rows, prosecdef = true for both
-- SELECT * FROM sign_sba_by_counterparty('bad-token','Joe Bloggs','1.2.3.4'::inet);
--   -- expect: ERRCODE 42501 "Invalid or already-used countersign link"
-- SELECT * FROM supersede_and_renew_sba(gen_random_uuid(), '2026-01-01', '2027-01-01', '{}'::jsonb);
--   -- expect (unauthenticated): ERRCODE 42501 "Not authenticated"
-- SELECT * FROM supersede_and_renew_sba(gen_random_uuid(), '2026-01-01', '2028-06-01', '{}'::jsonb);
--   -- expect: ERRCODE 22023 "Agreement cannot exceed 24 months"