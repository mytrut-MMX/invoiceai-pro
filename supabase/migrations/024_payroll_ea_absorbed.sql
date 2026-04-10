-- Migration 024: Track Employment Allowance absorbed per payroll run
-- Additive only. No data backfill needed (default 0 for historical rows).

ALTER TABLE payroll_runs
  ADD COLUMN ea_absorbed NUMERIC(10,2) NOT NULL DEFAULT 0
  CHECK (ea_absorbed >= 0);

COMMENT ON COLUMN payroll_runs.ea_absorbed IS
  'Employment Allowance absorbed against employer NI for this run. Written by submitPayrollRun after successful consumeEA. Used for idempotency and audit trail.';

-- Atomic EA consumption. Returns { absorbed, new_state } as JSON.
-- If used_amount + requested would exceed annual_limit, absorbs only the remaining capacity.
CREATE OR REPLACE FUNCTION consume_ea(
  p_user_id TEXT,
  p_tax_year VARCHAR(7),
  p_amount NUMERIC
) RETURNS TABLE(absorbed NUMERIC, new_state JSONB)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row employment_allowance_usage%ROWTYPE;
  v_remaining NUMERIC;
  v_to_absorb NUMERIC;
BEGIN
  SELECT * INTO v_row FROM employment_allowance_usage
    WHERE user_id = p_user_id AND tax_year = p_tax_year
    FOR UPDATE;

  IF NOT FOUND OR NOT v_row.enabled THEN
    RETURN QUERY SELECT 0::NUMERIC, NULL::JSONB;
    RETURN;
  END IF;

  v_remaining := v_row.annual_limit - v_row.used_amount;
  v_to_absorb := LEAST(p_amount, GREATEST(v_remaining, 0));

  IF v_to_absorb > 0 THEN
    UPDATE employment_allowance_usage
      SET used_amount = used_amount + v_to_absorb,
          updated_at = NOW()
      WHERE id = v_row.id
      RETURNING * INTO v_row;
  END IF;

  RETURN QUERY SELECT v_to_absorb, to_jsonb(v_row);
END $$;

-- Release previously consumed EA (for rollback on posting failures).
CREATE OR REPLACE FUNCTION release_ea(
  p_user_id TEXT,
  p_tax_year VARCHAR(7),
  p_amount NUMERIC
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE employment_allowance_usage
    SET used_amount = GREATEST(0, used_amount - p_amount),
        updated_at = NOW()
    WHERE user_id = p_user_id AND tax_year = p_tax_year;
END $$;

GRANT EXECUTE ON FUNCTION consume_ea(TEXT, VARCHAR, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION release_ea(TEXT, VARCHAR, NUMERIC) TO authenticated;
