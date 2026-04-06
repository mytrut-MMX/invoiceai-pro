-- VAT Return data model
--
-- Creates tables for VAT period management and return submissions,
-- supporting MTD for VAT compliance with HMRC.

-- =============================================================================
-- vat_periods — one row per quarterly / annual VAT period per user
-- =============================================================================
CREATE TABLE IF NOT EXISTS vat_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  due_date      DATE NOT NULL,  -- 1 month + 7 days after period_end
  stagger       INTEGER CHECK (stagger IN (1, 2, 3)),  -- HMRC VAT stagger group
  scheme        VARCHAR(30) CHECK (scheme IN ('Standard', 'Cash Accounting', 'Flat Rate', 'Annual')),
  status        VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'draft', 'submitted', 'acknowledged')),
  submitted_at  TIMESTAMPTZ,
  hmrc_receipt_id TEXT,
  locked        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_vat_periods_user_start UNIQUE (user_id, period_start),
  CONSTRAINT ck_vat_periods_date_range CHECK (period_end > period_start)
);

-- Index for common lookups: open periods for a user, sorted by date
CREATE INDEX IF NOT EXISTS idx_vat_periods_user_status
  ON vat_periods (user_id, status, period_start);

-- =============================================================================
-- vat_return_submissions — the 9-box VAT return + audit trail
-- =============================================================================
CREATE TABLE IF NOT EXISTS vat_return_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vat_period_id     UUID NOT NULL REFERENCES vat_periods(id) ON DELETE CASCADE,

  -- HMRC 9-box model
  box1              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- VAT due on sales
  box2              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- VAT due on acquisitions
  box3              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Total VAT due (box1 + box2)
  box4              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- VAT reclaimed on purchases
  box5              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Net VAT (box3 - box4)
  box6              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Total sales ex VAT
  box7              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Total purchases ex VAT
  box8              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Supplies to EU (NI only)
  box9              DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Acquisitions from EU (NI only)

  -- Flat Rate Scheme fields
  flat_rate_turnover DECIMAL(15,2),
  flat_rate_pct      DECIMAL(5,2),

  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'submitted', 'acknowledged', 'error')),

  -- Audit trail
  payload_sent      JSONB,   -- Full HMRC API request
  hmrc_response     JSONB,   -- HMRC API response
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vat_return_submissions_period
  ON vat_return_submissions (vat_period_id);

CREATE INDEX IF NOT EXISTS idx_vat_return_submissions_user
  ON vat_return_submissions (user_id, created_at DESC);

-- =============================================================================
-- RLS policies
-- =============================================================================
ALTER TABLE vat_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_return_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY vat_periods_owner ON vat_periods
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY vat_return_submissions_owner ON vat_return_submissions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
