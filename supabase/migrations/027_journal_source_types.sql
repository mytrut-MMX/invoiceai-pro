-- Relax journal_entries.source_type CHECK to match all source types currently
-- used by application code (payroll, reversal, and new bill types).
--
-- The original constraint from migration 001 only allowed 5 values, but the
-- codebase has been writing 'payroll', 'payroll_payment', 'payroll_void',
-- 'payroll_payment_void', and 'reversal' for some time. This migration brings
-- the schema in line with reality and adds 'bill' + 'bill_payment' (+ void
-- variants) for the Suppliers/CIS Phase 2 work.
--
-- Idempotent: DROP IF EXISTS + ADD CONSTRAINT with a fixed name.

ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_source_type_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_source_type_check
  CHECK (source_type IN (
    -- Original (migration 001)
    'invoice',
    'payment',
    'expense',
    'manual',
    'opening_balance',
    -- Payroll (retroactively added — already written by postPayrollEntry etc.)
    'payroll',
    'payroll_payment',
    'payroll_void',
    'payroll_payment_void',
    -- Manual reversals (already written by ledgerService.js)
    'reversal',
    -- Bills / CIS (Phase 2)
    'bill',
    'bill_payment',
    'bill_void',
    'bill_payment_void'
  ));
