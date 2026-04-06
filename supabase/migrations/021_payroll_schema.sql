-- Payroll schema for UK small business payroll.
--
-- Supports PAYE, NIC, student loan, pension auto-enrolment, and
-- HMRC RTI (Real Time Information) FPS submissions.
--
-- Chart of accounts integration:
--   6600 — Wages & Salaries (expense)
--   2100 — VAT Payable (liability, existing)
--   New ledger accounts for PAYE/NIC liability should be added
--   via the settings UI or a subsequent migration.

-- =============================================================================
-- employees — staff records for payroll
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal details
  title                 VARCHAR(10),                      -- Mr/Mrs/Ms/Dr/etc
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  date_of_birth         DATE,
  ni_number             VARCHAR(13),                      -- AB123456C format
  address               JSONB,                            -- { street, city, postcode, country }

  -- Tax & NI
  tax_code              VARCHAR(20) NOT NULL DEFAULT '1257L',
  ni_category           CHAR(1) NOT NULL DEFAULT 'A'
                          CHECK (ni_category IN ('A','B','C','H','J','M','Z')),
  student_loan_plan     VARCHAR(10) DEFAULT 'none'
                          CHECK (student_loan_plan IN ('none','plan1','plan2','plan4','plan5','postgrad')),

  -- Pay
  salary_type           VARCHAR(10) NOT NULL DEFAULT 'annual'
                          CHECK (salary_type IN ('annual', 'hourly')),
  salary_amount         DECIMAL(15,2) NOT NULL,
  pay_frequency         VARCHAR(12) NOT NULL DEFAULT 'monthly'
                          CHECK (pay_frequency IN ('weekly', 'fortnightly', 'monthly')),

  -- Employment
  start_date            DATE NOT NULL,
  leave_date            DATE,
  status                VARCHAR(10) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'leaver')),

  -- Pension auto-enrolment
  pension_enrolled      BOOLEAN NOT NULL DEFAULT false,
  pension_employee_pct  DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  pension_employer_pct  DECIMAL(5,2) NOT NULL DEFAULT 3.00,

  -- Sensitive — encrypted at application layer before storage
  bank_details          JSONB,                            -- { bank_name, sort_code, account_number }

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_user_status
  ON employees (user_id, status);

CREATE INDEX IF NOT EXISTS idx_employees_user_name
  ON employees (user_id, last_name, first_name);

-- =============================================================================
-- payroll_runs — one row per pay period batch
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_runs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Period
  tax_year                  VARCHAR(10) NOT NULL,         -- e.g. '2026-27'
  tax_month                 INTEGER NOT NULL CHECK (tax_month BETWEEN 1 AND 12),
  tax_week                  INTEGER CHECK (tax_week BETWEEN 1 AND 54),
  period_start              DATE NOT NULL,
  period_end                DATE NOT NULL,
  pay_date                  DATE NOT NULL,

  -- Status
  status                    VARCHAR(20) NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'approved', 'submitted', 'paid')),

  -- Totals (aggregated from payslips)
  total_gross               DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_tax                 DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_ni_employee         DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_ni_employer         DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_pension_employee    DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_pension_employer    DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_student_loan        DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_net                 DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- HMRC RTI FPS
  fps_submitted             BOOLEAN NOT NULL DEFAULT false,
  fps_submitted_at          TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_payroll_runs_dates CHECK (period_end >= period_start),
  CONSTRAINT uq_payroll_runs_period UNIQUE (user_id, tax_year, tax_month, pay_date)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_user_year
  ON payroll_runs (user_id, tax_year, tax_month);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_status
  ON payroll_runs (user_id, status);

-- =============================================================================
-- payslips — one row per employee per payroll run
-- =============================================================================
CREATE TABLE IF NOT EXISTS payslips (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id            UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id               UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pay period
  tax_year                  VARCHAR(10) NOT NULL,
  tax_month                 INTEGER NOT NULL,
  tax_week                  INTEGER,

  -- Gross pay
  basic_pay                 DECIMAL(15,2) NOT NULL DEFAULT 0,
  overtime_pay              DECIMAL(15,2) NOT NULL DEFAULT 0,
  bonus                     DECIMAL(15,2) NOT NULL DEFAULT 0,
  commission                DECIMAL(15,2) NOT NULL DEFAULT 0,
  gross_pay                 DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Deductions
  tax                       DECIMAL(15,2) NOT NULL DEFAULT 0,        -- PAYE income tax
  ni_employee               DECIMAL(15,2) NOT NULL DEFAULT 0,        -- Employee NIC
  ni_employer               DECIMAL(15,2) NOT NULL DEFAULT 0,        -- Employer NIC
  pension_employee          DECIMAL(15,2) NOT NULL DEFAULT 0,        -- Employee pension contribution
  pension_employer          DECIMAL(15,2) NOT NULL DEFAULT 0,        -- Employer pension contribution
  student_loan              DECIMAL(15,2) NOT NULL DEFAULT 0,        -- Student loan repayment
  other_deductions          DECIMAL(15,2) NOT NULL DEFAULT 0,
  other_deductions_detail   JSONB,                                    -- [{ name, amount }]

  -- Net pay
  net_pay                   DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Cumulative YTD figures (for PAYE calculation)
  ytd_gross                 DECIMAL(15,2) NOT NULL DEFAULT 0,
  ytd_tax                   DECIMAL(15,2) NOT NULL DEFAULT 0,
  ytd_ni_employee           DECIMAL(15,2) NOT NULL DEFAULT 0,
  ytd_ni_employer           DECIMAL(15,2) NOT NULL DEFAULT 0,
  ytd_pension_employee      DECIMAL(15,2) NOT NULL DEFAULT 0,
  ytd_pension_employer      DECIMAL(15,2) NOT NULL DEFAULT 0,
  ytd_student_loan          DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Employee snapshot at time of payslip (tax code, NI cat may change)
  tax_code                  VARCHAR(20),
  ni_category               CHAR(1),

  -- Hours (for hourly employees)
  hours_worked              DECIMAL(8,2),
  hourly_rate               DECIMAL(10,2),
  overtime_hours            DECIMAL(8,2),
  overtime_rate             DECIMAL(10,2),

  -- Status
  status                    VARCHAR(20) NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'approved', 'paid')),

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_payslips_run_employee UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payslips_run
  ON payslips (payroll_run_id);

CREATE INDEX IF NOT EXISTS idx_payslips_employee
  ON payslips (employee_id, tax_year, tax_month);

CREATE INDEX IF NOT EXISTS idx_payslips_user_year
  ON payslips (user_id, tax_year DESC, tax_month DESC);

-- =============================================================================
-- payroll_ytd — running year-to-date totals per employee per tax year
--
-- Denormalised for fast PAYE lookups. Updated after each payroll run.
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_ytd (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id               UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tax_year                  VARCHAR(10) NOT NULL,

  gross                     DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax                       DECIMAL(15,2) NOT NULL DEFAULT 0,
  ni_employee               DECIMAL(15,2) NOT NULL DEFAULT 0,
  ni_employer               DECIMAL(15,2) NOT NULL DEFAULT 0,
  pension_employee          DECIMAL(15,2) NOT NULL DEFAULT 0,
  pension_employer          DECIMAL(15,2) NOT NULL DEFAULT 0,
  student_loan              DECIMAL(15,2) NOT NULL DEFAULT 0,

  last_updated              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_payroll_ytd_emp_year UNIQUE (employee_id, tax_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_ytd_user
  ON payroll_ytd (user_id, tax_year);

-- =============================================================================
-- payroll_fps_log — audit trail for HMRC RTI FPS submissions
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_fps_log (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payroll_run_id            UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,

  payload_sent              JSONB,                         -- full FPS XML/JSON sent to HMRC
  hmrc_response             JSONB,                         -- HMRC acknowledgement
  response_code             INTEGER,
  error_message             TEXT,
  submitted_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_fps_log_run
  ON payroll_fps_log (payroll_run_id);

CREATE INDEX IF NOT EXISTS idx_payroll_fps_log_user
  ON payroll_fps_log (user_id, submitted_at DESC);

-- =============================================================================
-- RLS policies — all tables scoped to owner
-- =============================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_ytd ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_fps_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_owner ON employees
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY payroll_runs_owner ON payroll_runs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY payslips_owner ON payslips
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY payroll_ytd_owner ON payroll_ytd
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY payroll_fps_log_owner ON payroll_fps_log
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
