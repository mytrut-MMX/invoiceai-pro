-- 046_received_self_bill_emission.sql
-- Enables the "received self-bill" import flow (customer self-bills us,
-- we record it as an invoice on our side).
--
-- Three changes:
--   1. emission_type CHECK now accepts 'received' in addition to the three
--      outbound types ('download','email','resent'). Received rows record
--      imports of a customer-issued PDF.
--   2. bill_id and supplier_id are dropped to NULL; a CHECK replaces the
--      blanket NOT NULL so that only 'received' rows may omit them (received
--      self-bills have no outgoing bill or supplier on our side).
--   3. Unique partial index on invoices prevents double-importing the same
--      customer reference under the same agreement — defence in depth on
--      top of the service-level pre-check.

ALTER TABLE public.self_billing_emission_log
  DROP CONSTRAINT IF EXISTS self_billing_emission_log_emission_type_check;

ALTER TABLE public.self_billing_emission_log
  ADD CONSTRAINT self_billing_emission_log_emission_type_check
  CHECK (emission_type IN ('download','email','resent','received'));

ALTER TABLE public.self_billing_emission_log
  ALTER COLUMN bill_id     DROP NOT NULL,
  ALTER COLUMN supplier_id DROP NOT NULL;

ALTER TABLE public.self_billing_emission_log
  DROP CONSTRAINT IF EXISTS self_billing_emission_log_issued_refs_check;

ALTER TABLE public.self_billing_emission_log
  ADD CONSTRAINT self_billing_emission_log_issued_refs_check CHECK (
    (emission_type = 'received' AND bill_id IS NULL AND supplier_id IS NULL)
    OR (emission_type <> 'received' AND bill_id IS NOT NULL AND supplier_id IS NOT NULL)
  );

-- Duplicate guard: one invoice per (agreement, customer's self-bill reference).
-- Partial index keeps the main table unaffected for non-received rows.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_received_sb_unique_ref
  ON public.invoices (user_id, received_sb_agreement_id, received_sb_customer_ref)
  WHERE received_as_self_bill = true;

-- Expected: an attempt to insert an emission_log row with emission_type='received'
-- and a non-null bill_id (or supplier_id) is rejected by the CHECK. An attempt
-- to insert two invoices with the same (user_id, agreement_id, customer_ref)
-- triple and received_as_self_bill=true is rejected by the unique index.
