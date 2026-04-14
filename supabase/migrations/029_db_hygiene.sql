-- Migration 029: DB hygiene
-- 1. payments.invoice_id → ON DELETE SET NULL (preserve payment history, detach from deleted invoice)
-- 2. invoice_line_items → add created_at column

-- ─── 1. Fix payments FK ──────────────────────────────────────────────────────
-- SET NULL (not CASCADE) because payments are audit-relevant and should survive
-- invoice deletion. Deleting an invoice shouldn't nuke the payment record.
-- Current: NO ACTION = delete fails if payments exist, leaving orphans possible via JSONB path.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;
ALTER TABLE payments
  ADD CONSTRAINT payments_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ─── 2. Add created_at to invoice_line_items ─────────────────────────────────
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows using parent invoice created_at
UPDATE invoice_line_items li
SET created_at = i.created_at
FROM invoices i
WHERE li.invoice_id = i.id AND li.created_at IS NULL;
