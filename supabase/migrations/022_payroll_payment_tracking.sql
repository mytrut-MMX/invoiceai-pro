-- 022_payroll_payment_tracking.sql
--
-- Adds payment-tracking columns to payroll_runs and seeds the
-- 2310 "Net Wages Payable" account for existing payroll users.
--
-- WHY 2310 EXISTS:
--   When a payroll run is submitted, net wages are currently credited
--   directly to 1000 (Bank). In reality the money stays in the bank
--   until the employer actually pays employees. Account 2310 acts as
--   an intermediate current liability: payroll submission credits 2310,
--   and the subsequent bank payment debits 2310 / credits 1000.
--
-- NON-DESTRUCTIVE:
--   This migration only ADDs columns and INSERTs new rows.
--   No existing rows are UPDATEd or DELETEd.
--
-- NOTE ON EXISTING DATA:
--   Payroll runs already submitted have journal entries that credit
--   1000 (Bank) directly. Those entries are NOT touched by this
--   migration and will be handled separately if needed.
-- ================================================================

-- 1. Add payment-tracking columns to payroll_runs
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS paid_date                DATE,
  ADD COLUMN IF NOT EXISTS paid_amount              NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS bank_account_id          UUID REFERENCES accounts(id),
  ADD COLUMN IF NOT EXISTS payment_method           TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference        TEXT,
  ADD COLUMN IF NOT EXISTS payment_journal_entry_id UUID REFERENCES journal_entries(id);

-- 2. Seed account 2310 "Net Wages Payable" for every user who has 2300.
--    Copies type, subtype, is_system, and parent_id from the user's 2300 row.
--    Idempotent: skips users who already have a 2310 account.
INSERT INTO accounts (user_id, code, name, type, subtype, is_system, parent_id)
SELECT
  a.user_id,
  '2310',
  'Net Wages Payable',
  a.type,
  a.subtype,
  a.is_system,
  a.parent_id
FROM accounts a
WHERE a.code = '2300'
  AND NOT EXISTS (
    SELECT 1 FROM accounts b
    WHERE b.user_id = a.user_id
      AND b.code = '2310'
  );
