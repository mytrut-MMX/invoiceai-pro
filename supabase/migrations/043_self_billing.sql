-- 043_self_billing.sql
-- Self-Billing (HMRC VAT Notice 700/62): agreements, per-supplier invoice
-- sequences, emission audit log, and additive columns on bills / customers /
-- invoices. Schema-only; UI + PDF emission follow in later phases.
--
-- Patterns:
--   - Append-only audit log + Storage bucket + per-user folder isolation
--     mirrors 030_cis_pds.sql.
--   - Granular UPDATE/DELETE RLS policies gated on a locked state, and
--     EXCLUDE USING gist for date-range overlap prevention mirror
--     031_corporation_tax.sql.
--   - journal_entries.source_type CHECK relaxation mirrors
--     027_journal_source_types.sql (DROP + ADD with fixed name).
--
-- Legacy: suppliers has self_billing_{enabled,agreement_start,agreement_end,
--   invoice_series} from 025_suppliers.sql. Those columns are backfilled into
--   self_billing_agreements at the end of this migration and deprecated in a
--   later migration (NOT dropped here).

-- =============================================================================
-- 0. Extensions
-- btree_gist required to combine UUID / VARCHAR equality with daterange
-- overlap in EXCLUDE constraints. Enabled in 031; re-asserted for clarity.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================================
-- 1. self_billing_agreements — append-only versioning via supersedes_id.
--    Terms are immutable once status='active'; amendments create a new row
--    that points at its predecessor.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.self_billing_agreements (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Counterparty: exactly one of supplier_id / customer_id is set.
  --   direction='issued'   → user self-bills supplier (supplier_id set)
  --   direction='received' → customer self-bills user (customer_id set)
  supplier_id              UUID REFERENCES public.suppliers(id)  ON DELETE RESTRICT,
  customer_id              UUID REFERENCES public.customers(id)  ON DELETE RESTRICT,
  direction                VARCHAR(10) NOT NULL
                             CHECK (direction IN ('issued','received')),

  -- Versioning
  version                  INT  NOT NULL DEFAULT 1 CHECK (version >= 1),
  supersedes_id            UUID REFERENCES public.self_billing_agreements(id)
                             ON DELETE SET NULL,

  -- Term (HMRC: typical 12 months, up to 24 months)
  start_date               DATE NOT NULL,
  end_date                 DATE NOT NULL,

  -- Signatures
  signed_by_us_at          TIMESTAMPTZ,
  signed_by_us_ip          INET,
  signed_by_us_name        TEXT,
  signed_by_us_role        TEXT,
  signed_by_them_at        TIMESTAMPTZ,
  signed_by_them_ip        INET,
  signed_by_them_name      TEXT,
  signed_by_them_token     TEXT UNIQUE,   -- one-time countersign link token

  agreement_pdf_path       TEXT,          -- self-billing-agreements bucket
  terms_snapshot           JSONB NOT NULL,-- full terms at signing; immutable when active

  status                   VARCHAR(20) NOT NULL DEFAULT 'draft'
                             CHECK (status IN (
                               'draft','pending_countersign','active',
                               'expired','terminated','superseded'
                             )),
  terminated_at            TIMESTAMPTZ,
  terminated_reason        TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sba_counterparty_exclusive CHECK (
    (supplier_id IS NULL) <> (customer_id IS NULL)
  ),
  CONSTRAINT sba_direction_matches_counterparty CHECK (
    (direction = 'issued'   AND supplier_id IS NOT NULL) OR
    (direction = 'received' AND customer_id IS NOT NULL)
  ),
  CONSTRAINT sba_dates_valid CHECK (end_date > start_date),
  CONSTRAINT sba_max_24_months CHECK (
    end_date <= start_date + INTERVAL '24 months'
  ),
  -- Prevent two overlapping active agreements for the same user + counterparty
  -- + direction. COALESCE unifies supplier_id / customer_id into a single
  -- counterparty key. btree_gist is required for UUID/VARCHAR equality.
  CONSTRAINT sba_no_overlap_active EXCLUDE USING gist (
    user_id                               WITH =,
    (COALESCE(supplier_id, customer_id))  WITH =,
    direction                             WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status = 'active')
);

COMMENT ON TABLE public.self_billing_agreements IS
  'HMRC VAT Notice 700/62 self-billing agreements. Append-only versioning '
  'via supersedes_id; terms_snapshot is immutable once status=active. '
  'Counterparty is exactly one of supplier_id / customer_id.';

-- supports: list agreements by user + current status
CREATE INDEX IF NOT EXISTS idx_sba_user_status
  ON public.self_billing_agreements (user_id, status);

-- supports: "is there an active agreement for this (user, supplier)?"
CREATE INDEX IF NOT EXISTS idx_sba_user_supplier_active
  ON public.self_billing_agreements (user_id, supplier_id, status)
  WHERE status = 'active';

-- supports: renewal alerts ("agreements expiring in the next 30 days")
CREATE INDEX IF NOT EXISTS idx_sba_user_end_date_active
  ON public.self_billing_agreements (user_id, end_date)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS set_sba_updated_at ON public.self_billing_agreements;
CREATE TRIGGER set_sba_updated_at
  BEFORE UPDATE ON public.self_billing_agreements
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

ALTER TABLE public.self_billing_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sba_select_own ON public.self_billing_agreements;
CREATE POLICY sba_select_own ON public.self_billing_agreements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sba_insert_own ON public.self_billing_agreements;
CREATE POLICY sba_insert_own ON public.self_billing_agreements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Active / expired / terminated / superseded rows are immutable.
-- Edits are permitted only in draft and pending_countersign.
DROP POLICY IF EXISTS sba_update_own ON public.self_billing_agreements;
CREATE POLICY sba_update_own ON public.self_billing_agreements
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('draft','pending_countersign'))
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sba_delete_own ON public.self_billing_agreements;
CREATE POLICY sba_delete_own ON public.self_billing_agreements
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status IN ('draft','pending_countersign'));

-- =============================================================================
-- 2. self_billing_sequences — per-(user, supplier) invoice numbering
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.self_billing_sequences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  supplier_id       UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,

  prefix            VARCHAR(16) NOT NULL DEFAULT 'SB-',
  format_pattern    TEXT        NOT NULL DEFAULT '{prefix}{yyyy}-{seq:0000}',
  current_number    INT         NOT NULL DEFAULT 0 CHECK (current_number >= 0),
  reset_policy      VARCHAR(20) NOT NULL DEFAULT 'never'
                      CHECK (reset_policy IN ('never','yearly')),
  last_reset_year   INT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, supplier_id)
);

COMMENT ON TABLE public.self_billing_sequences IS
  'Per-(user, supplier) monotonic counter for self-bill invoice numbers. '
  'Incremented atomically by next_selfbill_number().';

DROP TRIGGER IF EXISTS set_sbs_updated_at ON public.self_billing_sequences;
CREATE TRIGGER set_sbs_updated_at
  BEFORE UPDATE ON public.self_billing_sequences
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

ALTER TABLE public.self_billing_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sbs_select_own ON public.self_billing_sequences;
CREATE POLICY sbs_select_own ON public.self_billing_sequences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sbs_insert_own ON public.self_billing_sequences;
CREATE POLICY sbs_insert_own ON public.self_billing_sequences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sbs_update_own ON public.self_billing_sequences;
CREATE POLICY sbs_update_own ON public.self_billing_sequences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sbs_delete_own ON public.self_billing_sequences;
CREATE POLICY sbs_delete_own ON public.self_billing_sequences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Atomic counter: FOR UPDATE locks the row, handles yearly reset, and returns
-- a formatted invoice number. Prevents gaps / duplicates under concurrency.
CREATE OR REPLACE FUNCTION public.next_selfbill_number(
  p_user_id     UUID,
  p_supplier_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row     public.self_billing_sequences;
  v_now     TIMESTAMPTZ := now();
  v_year    INT := EXTRACT(YEAR FROM v_now)::INT;
  v_seq     INT;
  v_out     TEXT;
  v_pad     TEXT;
  v_width   INT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  -- Create the row on first call, then lock it for update.
  INSERT INTO public.self_billing_sequences (user_id, supplier_id)
  VALUES (p_user_id, p_supplier_id)
  ON CONFLICT (user_id, supplier_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.self_billing_sequences
  WHERE user_id = p_user_id AND supplier_id = p_supplier_id
  FOR UPDATE;

  IF v_row.reset_policy = 'yearly'
     AND (v_row.last_reset_year IS NULL OR v_row.last_reset_year < v_year) THEN
    v_seq := 1;
    UPDATE public.self_billing_sequences
       SET current_number = v_seq, last_reset_year = v_year
     WHERE id = v_row.id;
  ELSE
    v_seq := v_row.current_number + 1;
    UPDATE public.self_billing_sequences
       SET current_number = v_seq
     WHERE id = v_row.id;
  END IF;

  v_out := v_row.format_pattern;
  v_out := replace(v_out, '{prefix}', v_row.prefix);
  v_out := replace(v_out, '{yyyy}',   to_char(v_now, 'YYYY'));
  v_out := replace(v_out, '{yy}',     to_char(v_now, 'YY'));

  -- {seq:0000} → zero-padded to width; {seq} → no padding.
  v_pad := substring(v_out FROM '\{seq:(0+)\}');
  IF v_pad IS NOT NULL THEN
    v_width := length(v_pad);
    v_out := regexp_replace(v_out, '\{seq:0+\}', lpad(v_seq::text, v_width, '0'));
  ELSE
    v_out := replace(v_out, '{seq}', v_seq::text);
  END IF;

  RETURN v_out;
END;
$$;

REVOKE ALL    ON FUNCTION public.next_selfbill_number(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_selfbill_number(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.next_selfbill_number(UUID, UUID) IS
  'Atomically allocate the next self-bill invoice number for (user, supplier). '
  'SECURITY DEFINER; ownership enforced via auth.uid(). Handles yearly reset.';

-- =============================================================================
-- 3. self_billing_emission_log — append-only PDF emission audit trail
-- RESTRICT on bill_id / supplier_id / agreement_id: audit row must survive.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.self_billing_emission_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id             UUID NOT NULL REFERENCES public.bills(id)     ON DELETE RESTRICT,
  supplier_id         UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  agreement_id        UUID NOT NULL REFERENCES public.self_billing_agreements(id)
                        ON DELETE RESTRICT,

  self_bill_number    TEXT NOT NULL,             -- duplicated for historical reference

  emission_type       VARCHAR(20) NOT NULL
                        CHECK (emission_type IN ('download','email','resent')),
  email_sent_to       TEXT,
  email_resend_id     TEXT,

  pdf_storage_path    TEXT,                      -- self-billing-invoices bucket
  pdf_sha256          CHAR(64),                  -- hex sha256 for tamper detection

  snapshot            JSONB NOT NULL,            -- full invoice content at emission

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.self_billing_emission_log IS
  'Append-only audit log of self-bill PDF emissions (download / email / resent). '
  'Snapshot + pdf_sha256 preserve tamper-evident emission history. '
  'HMRC retention: 6 years from end of VAT period.';

-- supports: user activity feed + "recent emissions" dashboard
CREATE INDEX IF NOT EXISTS idx_sbel_user_created
  ON public.self_billing_emission_log (user_id, created_at DESC);

-- supports: "show all emissions of this bill"
CREATE INDEX IF NOT EXISTS idx_sbel_bill
  ON public.self_billing_emission_log (bill_id);

ALTER TABLE public.self_billing_emission_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sbel_select_own ON public.self_billing_emission_log;
CREATE POLICY sbel_select_own ON public.self_billing_emission_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sbel_insert_own ON public.self_billing_emission_log;
CREATE POLICY sbel_insert_own ON public.self_billing_emission_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policies: append-only audit trail.

-- =============================================================================
-- 4. Additive columns on bills / customers / invoices (no existing-column changes)
-- =============================================================================
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS is_self_billed                    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS self_bill_invoice_number          TEXT,
  ADD COLUMN IF NOT EXISTS self_billing_agreement_id         UUID,
  ADD COLUMN IF NOT EXISTS supplier_vat_at_posting           TEXT,
  ADD COLUMN IF NOT EXISTS supplier_vat_verified_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supplier_vat_status_at_posting    VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bills_self_billing_agreement_fkey'
  ) THEN
    ALTER TABLE public.bills
      ADD CONSTRAINT bills_self_billing_agreement_fkey
      FOREIGN KEY (self_billing_agreement_id)
      REFERENCES public.self_billing_agreements(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bills_supplier_vat_status_check'
  ) THEN
    ALTER TABLE public.bills
      ADD CONSTRAINT bills_supplier_vat_status_check
      CHECK (supplier_vat_status_at_posting IS NULL OR supplier_vat_status_at_posting IN (
        'valid','invalid','unchecked','deregistered'
      ));
  END IF;
END $$;

-- supports: uniqueness of self-bill invoice numbers per user (only among SB rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_sb_number
  ON public.bills (user_id, self_bill_invoice_number)
  WHERE is_self_billed = true;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS self_billed_by_customer    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS self_billing_agreement_id  UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_self_billing_agreement_fkey'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_self_billing_agreement_fkey
      FOREIGN KEY (self_billing_agreement_id)
      REFERENCES public.self_billing_agreements(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS received_as_self_bill         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_sb_customer_ref      TEXT,
  ADD COLUMN IF NOT EXISTS received_sb_agreement_id      UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_received_sb_agreement_fkey'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_received_sb_agreement_fkey
      FOREIGN KEY (received_sb_agreement_id)
      REFERENCES public.self_billing_agreements(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- 5. Storage buckets + per-user folder isolation (mirrors 030_cis_pds.sql)
-- Path conventions (documented, not enforced in SQL):
--   self-billing-agreements: {user_id}/{agreement_id}/{version}_{timestamp}.pdf
--   self-billing-invoices:   {user_id}/{bill_id}/{self_bill_number}.pdf
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('self-billing-agreements', 'self-billing-agreements', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('self-billing-invoices',   'self-billing-invoices',   false)
ON CONFLICT (id) DO NOTHING;

-- self-billing-agreements bucket policies
DROP POLICY IF EXISTS sb_agreements_select ON storage.objects;
CREATE POLICY sb_agreements_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'self-billing-agreements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS sb_agreements_insert ON storage.objects;
CREATE POLICY sb_agreements_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'self-billing-agreements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS sb_agreements_update ON storage.objects;
CREATE POLICY sb_agreements_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'self-billing-agreements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'self-billing-agreements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS sb_agreements_delete ON storage.objects;
CREATE POLICY sb_agreements_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'self-billing-agreements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- self-billing-invoices bucket policies
DROP POLICY IF EXISTS sb_invoices_select ON storage.objects;
CREATE POLICY sb_invoices_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'self-billing-invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS sb_invoices_insert ON storage.objects;
CREATE POLICY sb_invoices_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'self-billing-invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS sb_invoices_update ON storage.objects;
CREATE POLICY sb_invoices_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'self-billing-invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'self-billing-invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS sb_invoices_delete ON storage.objects;
CREATE POLICY sb_invoices_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'self-billing-invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- 6. journal_entries.source_type CHECK relaxation (mirrors 027 DROP/ADD pattern)
-- Adds 'self_bill' + 'self_bill_void' to the existing allowed set from 027.
-- =============================================================================
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_source_type_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_source_type_check
  CHECK (source_type IN (
    -- Original (migration 001)
    'invoice','payment','expense','manual','opening_balance',
    -- Payroll
    'payroll','payroll_payment','payroll_void','payroll_payment_void',
    -- Manual reversals
    'reversal',
    -- Bills / CIS (027)
    'bill','bill_payment','bill_void','bill_payment_void',
    -- Self-billing (043)
    'self_bill','self_bill_void'
  ));

-- =============================================================================
-- 7. Backfill legacy suppliers.self_billing_* flags into self_billing_agreements
-- Legacy columns remain on suppliers until a future migration deprecates them.
-- =============================================================================
DO $$
DECLARE
  r            RECORD;
  v_start      DATE;
  v_end        DATE;
  v_inserted   INT := 0;
BEGIN
  FOR r IN
    SELECT id, user_id, self_billing_agreement_start, self_billing_agreement_end,
           self_billing_invoice_series, name
      FROM public.suppliers
     WHERE self_billing_enabled = true
  LOOP
    BEGIN
      v_start := COALESCE(r.self_billing_agreement_start, CURRENT_DATE);
      v_end   := COALESCE(r.self_billing_agreement_end,   v_start + INTERVAL '12 months');

      -- Clamp end to 24m cap to satisfy the table CHECK.
      IF v_end > v_start + INTERVAL '24 months' THEN
        v_end := (v_start + INTERVAL '24 months')::date;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.self_billing_agreements
         WHERE user_id = r.user_id AND supplier_id = r.id AND status = 'active'
      ) THEN
        INSERT INTO public.self_billing_agreements (
          user_id, supplier_id, direction, start_date, end_date,
          terms_snapshot, status
        ) VALUES (
          r.user_id, r.id, 'issued', v_start, v_end,
          jsonb_build_object(
            'legacy_migration',    true,
            'migrated_at',         now(),
            'supplier_name',       r.name,
            'invoice_series',      r.self_billing_invoice_series
          ),
          'active'
        );
        v_inserted := v_inserted + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Self-billing backfill skipped for supplier %: %', r.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Self-billing backfill inserted % agreement(s)', v_inserted;
END $$;

-- =============================================================================
-- 8. Verification (run manually in Supabase SQL editor)
-- =============================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN (
--       'self_billing_agreements','self_billing_sequences','self_billing_emission_log'
--     );
--   -- expect: 3 rows
--
-- SELECT id FROM storage.buckets
--   WHERE id IN ('self-billing-agreements','self-billing-invoices');
--   -- expect: 2 rows
--
-- SELECT count(*) FROM pg_policies
--   WHERE tablename IN (
--     'self_billing_agreements','self_billing_sequences','self_billing_emission_log'
--   );
--   -- expect: 10 (4+4+2). Emission log is append-only (SELECT + INSERT only).
--
-- SELECT next_selfbill_number('<user-id>','<supplier-id>'); -- e.g. SB-2026-0001
--
-- SELECT count(*) FROM public.self_billing_agreements
--   WHERE terms_snapshot->>'legacy_migration' = 'true';
--   -- expect: == count of suppliers where self_billing_enabled = true