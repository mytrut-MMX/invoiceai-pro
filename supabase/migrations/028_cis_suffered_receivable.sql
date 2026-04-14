-- Seed 1250 CIS Suffered Receivable for all existing users
-- Idempotent: safe to re-run

INSERT INTO accounts (user_id, code, name, type)
SELECT DISTINCT user_id, '1250', 'CIS Suffered Receivable', 'asset'
FROM accounts
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a2
  WHERE a2.user_id = accounts.user_id AND a2.code = '1250'
);
