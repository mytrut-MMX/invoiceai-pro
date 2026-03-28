-- Chart of accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'asset', 'liability', 'equity', 'revenue', 'expense'
  )),
  subtype VARCHAR(50),
  is_system BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, code)
);

-- Journal entries (double-entry)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR(100),
  source_type VARCHAR(30) CHECK (source_type IN (
    'invoice', 'payment', 'expense', 'manual', 'opening_balance'
  )),
  source_id TEXT,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Journal lines (each entry has min 2 lines)
CREATE TABLE journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit DECIMAL(15,2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15,2) DEFAULT 0 CHECK (credit >= 0),
  description TEXT,
  CHECK (debit = 0 OR credit = 0)
);

-- Constraint: each journal entry must balance
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT ABS(SUM(debit) - SUM(credit))
    FROM journal_lines
    WHERE journal_entry_id = NEW.journal_entry_id
  ) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry does not balance';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Account balances materialized view for performance
CREATE MATERIALIZED VIEW account_balances AS
SELECT
  a.id AS account_id,
  a.user_id,
  a.code,
  a.name,
  a.type,
  COALESCE(SUM(jl.debit), 0) AS total_debits,
  COALESCE(SUM(jl.credit), 0) AS total_credits,
  CASE
    WHEN a.type IN ('asset', 'expense')
      THEN COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)
    ELSE
      COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0)
  END AS balance
FROM accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
GROUP BY a.id, a.user_id, a.code, a.name, a.type;

-- RLS policies
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_accounts" ON accounts
  FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "users_own_journal_entries" ON journal_entries
  FOR ALL USING (user_id = auth.uid()::text);
CREATE POLICY "users_own_journal_lines" ON journal_lines
  FOR ALL USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries WHERE user_id = auth.uid()::text
    )
  );

-- Default chart of accounts (insert via seed after creating user)
-- These will be inserted per-user on onboarding completion
