-- ═══════════════════════════════════════════════════════════════════════
-- Employment Allowance support — Phase 1: Schema
--
-- Adds:
--   1. employment_allowance_usage table (per-user, per-tax-year tracking)
--   2. employees.is_director column (for 'single director rule' check)
--
-- Non-destructive, idempotent (safe to re-run).
-- No existing data is modified; only new columns/tables are added.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- Table: employment_allowance_usage
-- Tracks annual EA claim and cumulative employer NI absorbed by the
-- allowance. Annual limit is stored per-row so future tax years can
-- have different limits without code changes (currently £10,500 for 2025-26).
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employment_allowance_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  tax_year      VARCHAR(7) NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT false,
  annual_limit  NUMERIC(10,2) NOT NULL DEFAULT 10500.00,
  used_amount   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  claimed_at    TIMESTAMPTZ,
  disabled_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tax_year),
  CHECK (used_amount >= 0),
  CHECK (used_amount <= annual_limit)
);

-- ───────────────────────────────────────────────────────────────────────
-- RLS: users only see their own EA records
-- Matches pattern used by journal_entries.
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE employment_allowance_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_own_ea_usage ON employment_allowance_usage;

CREATE POLICY users_own_ea_usage ON employment_allowance_usage
  FOR ALL
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- ───────────────────────────────────────────────────────────────────────
-- Index for fast lookups per user per tax year
-- ───────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ea_usage_user_year
  ON employment_allowance_usage(user_id, tax_year);

-- ───────────────────────────────────────────────────────────────────────
-- Employees: is_director flag
-- Needed for the 'single director rule' eligibility check.
-- Defaults to false, which is the safe assumption for existing rows.
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_director BOOLEAN NOT NULL DEFAULT false;
