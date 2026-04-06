-- ITSA (Income Tax Self Assessment) quarterly submission system.
--
-- MTD ITSA is mandatory from 6 April 2026 for sole traders with
-- qualifying income > £50,000.
--
-- ITSA tax year runs 6 Apr → 5 Apr, split into four quarters:
--   Q1: 6 Apr – 5 Jul   (deadline 5 Aug)
--   Q2: 6 Jul – 5 Oct   (deadline 5 Nov)
--   Q3: 6 Oct – 5 Jan   (deadline 5 Feb)
--   Q4: 6 Jan – 5 Apr   (deadline 5 May)

-- =============================================================================
-- itsa_periods — one row per ITSA quarter per user
-- =============================================================================
CREATE TABLE IF NOT EXISTS itsa_periods (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year            VARCHAR(10) NOT NULL,  -- e.g. '2026-27'
  quarter             VARCHAR(2) NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  submission_deadline DATE NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'draft', 'submitted')),
  locked              BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_itsa_periods_user_year_quarter UNIQUE (user_id, tax_year, quarter),
  CONSTRAINT ck_itsa_periods_date_range CHECK (period_end > period_start)
);

CREATE INDEX IF NOT EXISTS idx_itsa_periods_user_status
  ON itsa_periods (user_id, status, period_start);

CREATE INDEX IF NOT EXISTS idx_itsa_periods_user_tax_year
  ON itsa_periods (user_id, tax_year);

-- =============================================================================
-- itsa_quarterly_updates — the quarterly income/expense submission + audit trail
-- =============================================================================
CREATE TABLE IF NOT EXISTS itsa_quarterly_updates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_id           UUID NOT NULL REFERENCES itsa_periods(id) ON DELETE CASCADE,

  total_income        DECIMAL(15,2) NOT NULL DEFAULT 0,  -- turnover (invoices paid/issued in period)
  total_expenses      DECIMAL(15,2) NOT NULL DEFAULT 0,  -- allowable expenses in period
  expense_breakdown   JSONB,                              -- categorised expenses keyed by SA box
  accounting_basis    VARCHAR(10) NOT NULL DEFAULT 'cash'
                        CHECK (accounting_basis IN ('cash', 'accrual')),

  -- Audit trail
  payload_sent        JSONB,                              -- full HMRC API request
  hmrc_response       JSONB,                              -- HMRC API response
  status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'submitted', 'acknowledged', 'error')),
  submitted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itsa_quarterly_updates_period
  ON itsa_quarterly_updates (period_id);

CREATE INDEX IF NOT EXISTS idx_itsa_quarterly_updates_user
  ON itsa_quarterly_updates (user_id, created_at DESC);

-- =============================================================================
-- itsa_final_declarations — end-of-year final declaration per tax year
-- =============================================================================
CREATE TABLE IF NOT EXISTS itsa_final_declarations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year            VARCHAR(10) NOT NULL,  -- e.g. '2026-27'

  total_income        DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_expenses      DECIMAL(15,2) NOT NULL DEFAULT 0,
  adjustments         JSONB,                -- e.g. { "privatePortion": 500, "otherIncome": 200 }
  capital_allowances  DECIMAL(15,2) NOT NULL DEFAULT 0,
  final_profit        DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Audit trail
  payload_sent        JSONB,
  hmrc_response       JSONB,
  status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'submitted', 'acknowledged', 'error')),
  submitted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_itsa_final_declarations_user_year UNIQUE (user_id, tax_year)
);

CREATE INDEX IF NOT EXISTS idx_itsa_final_declarations_user
  ON itsa_final_declarations (user_id, tax_year);

-- =============================================================================
-- RLS policies
-- =============================================================================
ALTER TABLE itsa_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE itsa_quarterly_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE itsa_final_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY itsa_periods_owner ON itsa_periods
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY itsa_quarterly_updates_owner ON itsa_quarterly_updates
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY itsa_final_declarations_owner ON itsa_final_declarations
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
