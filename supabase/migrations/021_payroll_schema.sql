-- Payroll schema for UK small business payroll.
--
-- Supports PAYE, NIC, student loan, pension auto-enrolment, and
-- HMRC RTI (Real Time Information) FPS/EPS submissions.
--
-- Chart of accounts integration:
--   2300 — PAYE/NIC Liability
--   6000 — Wages & Salaries (expense)

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

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
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
  tax_week                  INTEGER CHECK (tax_week BETWEEN 1 AND 52),
  period_start              DATE NOT NULL,
  period_end                DATE NOT NULL,
  pay_date                  DATE NOT NULL,

  -- Status
  status                    VARCHAR(20) NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'approved', 'submitted', 'paid')),

  -- Totals (aggregated from payslips)
  total_gross               DECIMAL(15,2),
  total_tax                 DECIMAL(15,2),
  total_ni_employee         DECIMAL(15,2),
  total_ni_employer         DECIMAL(15,2),
  total_pension_employee    DECIMAL(15,2),
  total_pension_employer    DECIMAL(15,2),
  total_student_loan        DECIMAL(15,2),
  total_net                 DECIMAL(15,2),

  -- HMRC RTI FPS
  fps_submitted             BOOLEAN NOT NULL DEFAULT false,
  fps_submitted_at          TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_payroll_runs_dates CHECK (period_end >= period_start)
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
  employee_id               UUID NOT NULL REFERENCES employees(id),

  -- Hours (for hourly employees)
  hours_worked              DECIMAL(10,2),

  -- Pay
  gross_pay                 DECIMAL(15,2) NOT NULL,
  taxable_pay               DECIMAL(15,2),
  tax_deducted              DECIMAL(15,2) NOT NULL DEFAULT 0,
  ni_employee               DECIMAL(15,2) NOT NULL DEFAULT 0,
  ni_employer               DECIMAL(15,2) NOT NULL DEFAULT 0,
  pension_employee          DECIMAL(15,2) NOT NULL DEFAULT 0,
  pension_employer          DECIMAL(15,2) NOT NULL DEFAULT 0,
  student_loan              DECIMAL(15,2) NOT NULL DEFAULT 0,
  other_deductions          DECIMAL(15,2) NOT NULL DEFAULT 0,
  other_additions           DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_pay                   DECIMAL(15,2) NOT NULL,

  -- Cumulative year-to-date
  gross_ytd                 DECIMAL(15,2),
  tax_ytd                   DECIMAL(15,2),
  ni_ytd                    DECIMAL(15,2),

  notes                     TEXT,

  CONSTRAINT uq_payslips_run_employee UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payslips_run
  ON payslips (payroll_run_id);

CREATE INDEX IF NOT EXISTS idx_payslips_employee
  ON payslips (employee_id);

-- =============================================================================
-- payroll_ytd — running year-to-date totals per employee per tax year
--
-- Denormalised for fast cumulative PAYE lookups.
-- Updated after each payroll run is finalised.
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_ytd (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id               UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tax_year                  VARCHAR(10) NOT NULL,

  gross_ytd                 DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_ytd                   DECIMAL(15,2) NOT NULL DEFAULT 0,
  ni_ytd                    DECIMAL(15,2) NOT NULL DEFAULT 0,
  pension_ytd               DECIMAL(15,2) NOT NULL DEFAULT 0,
  student_loan_ytd          DECIMAL(15,2) NOT NULL DEFAULT 0,

  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_payroll_ytd_emp_year UNIQUE (employee_id, tax_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_ytd_employee
  ON payroll_ytd (employee_id, tax_year);

-- =============================================================================
-- rti_submissions — HMRC Real Time Information submissions (FPS / EPS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rti_submissions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payroll_run_id            UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,

  submission_type           VARCHAR(5) NOT NULL
                              CHECK (submission_type IN ('FPS', 'EPS')),
  xml_payload               TEXT,                          -- full RTI XML sent to HMRC
  hmrc_response             TEXT,                          -- HMRC acknowledgement / error
  status                    VARCHAR(20) NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected')),
  submitted_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rti_submissions_user
  ON rti_submissions (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_rti_submissions_run
  ON rti_submissions (payroll_run_id);

-- =============================================================================
-- paye_reference — employer PAYE registration (one per user)
-- =============================================================================
CREATE TABLE IF NOT EXISTS paye_reference (
  user_id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_paye_ref         VARCHAR(20),                   -- e.g. '123/AB456'
  accounts_office_ref       VARCHAR(20),
  tax_office_number         VARCHAR(5)
);

-- =============================================================================
-- RLS policies — all tables scoped to owner
-- =============================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_ytd ENABLE ROW LEVEL SECURITY;
ALTER TABLE rti_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paye_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_owner ON employees
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY payroll_runs_owner ON payroll_runs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- payslips: RLS via the payroll_run's user_id joined through the run
-- Since payslips don't have user_id, we use a subquery policy
CREATE POLICY payslips_owner ON payslips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM payroll_runs pr
      WHERE pr.id = payslips.payroll_run_id
        AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll_runs pr
      WHERE pr.id = payslips.payroll_run_id
        AND pr.user_id = auth.uid()
    )
  );

-- payroll_ytd: RLS via employee's user_id
CREATE POLICY payroll_ytd_owner ON payroll_ytd
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = payroll_ytd.employee_id
        AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = payroll_ytd.employee_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY rti_submissions_owner ON rti_submissions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY paye_reference_owner ON paye_reference
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
