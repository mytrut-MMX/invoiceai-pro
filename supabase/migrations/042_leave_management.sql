-- Leave management: per-employee balances and individual requests.

CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tax_year VARCHAR(10) NOT NULL,
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('annual','sick','other')),
  entitlement_days DECIMAL(5,1) NOT NULL,
  used_days DECIMAL(5,1) DEFAULT 0,
  carried_over DECIMAL(5,1) DEFAULT 0,
  notes TEXT,
  UNIQUE (employee_id, tax_year, leave_type)
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('annual','sick','other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days DECIMAL(5,1) NOT NULL,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_date >= start_date)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_balances_owner ON leave_balances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_balances.employee_id
        AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_balances.employee_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY leave_requests_owner ON leave_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_requests.employee_id
        AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_requests.employee_id
        AND e.user_id = auth.uid()
    )
  );
