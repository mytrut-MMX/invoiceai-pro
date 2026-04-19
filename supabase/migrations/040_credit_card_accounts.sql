-- Credit card account support: sub_type, credit_limit, statement_day
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sub_type TEXT
  CHECK (sub_type IN ('current','savings','credit_card','cash','other'));

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS statement_day INTEGER
  CHECK (statement_day BETWEEN 1 AND 31);
