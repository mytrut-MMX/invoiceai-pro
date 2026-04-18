-- Migration 039: payment_terms table with RLS, system seeds, and invoice snapshot columns.
-- Applied manually in Supabase after merge — CC has no DB access.

CREATE TABLE IF NOT EXISTS public.payment_terms (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users ON DELETE CASCADE,
  name        text        NOT NULL,
  type        text        NOT NULL CHECK (type IN ('net','eom','due_on_receipt','custom')),
  days        integer,
  is_default  boolean     NOT NULL DEFAULT false,
  is_system   boolean     NOT NULL DEFAULT false,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.payment_terms.user_id    IS 'NULL = system preset visible to all users';
COMMENT ON COLUMN public.payment_terms.days       IS 'Days for net/custom types; NULL for eom/due_on_receipt';
COMMENT ON COLUMN public.payment_terms.is_default IS 'One true per user max; enforced by partial unique index below';
COMMENT ON COLUMN public.payment_terms.is_system  IS 'System presets cannot be modified or deleted by users';

CREATE INDEX IF NOT EXISTS payment_terms_user_sort_idx
  ON public.payment_terms (user_id, sort_order);

-- Guarantees at most one default per user (system rows share the literal 'system').
CREATE UNIQUE INDEX IF NOT EXISTS payment_terms_one_default_per_user
  ON public.payment_terms (COALESCE(user_id::text, 'system'))
  WHERE is_default = true;

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_terms_select"
  ON public.payment_terms FOR SELECT
  USING (user_id = auth.uid() OR is_system = true);

CREATE POLICY "payment_terms_insert"
  ON public.payment_terms FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "payment_terms_update"
  ON public.payment_terms FOR UPDATE
  USING  (user_id = auth.uid() AND is_system = false)
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "payment_terms_delete"
  ON public.payment_terms FOR DELETE
  USING (user_id = auth.uid() AND is_system = false);

-- ─── System seeds ──────────────────────────────────────────────────────────────

INSERT INTO public.payment_terms (user_id, name, type, days, is_default, is_system, sort_order)
VALUES
  (NULL, 'Due on receipt',   'due_on_receipt', 0,    false, true, 1),
  (NULL, 'Net 15',           'net',            15,   false, true, 2),
  (NULL, 'Net 30',           'net',            30,   true,  true, 3),
  (NULL, 'Net 45',           'net',            45,   false, true, 4),
  (NULL, 'Net 60',           'net',            60,   false, true, 5),
  (NULL, 'Due end of month', 'eom',            NULL, false, true, 6)
ON CONFLICT DO NOTHING;

-- ─── Invoice snapshot columns ──────────────────────────────────────────────────

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_term_id     uuid REFERENCES public.payment_terms ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_terms_label text,
  ADD COLUMN IF NOT EXISTS payment_terms_days  integer,
  ADD COLUMN IF NOT EXISTS payment_terms_type  text;

COMMENT ON COLUMN public.invoices.payment_term_id     IS 'FK to payment_terms; NULL for legacy invoices';
COMMENT ON COLUMN public.invoices.payment_terms_label IS 'Snapshot of term name at invoice creation time';
COMMENT ON COLUMN public.invoices.payment_terms_days  IS 'Snapshot of term days at invoice creation time';
COMMENT ON COLUMN public.invoices.payment_terms_type  IS 'Snapshot of term type at invoice creation time';
