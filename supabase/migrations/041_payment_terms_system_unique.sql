-- Migration 041: deduplicate system payment terms and add unique index on name
-- so that the ON CONFLICT DO NOTHING seeds in 039 work correctly on re-apply.

-- Step 1: Remove duplicate system rows, keeping the one with the lowest sort_order
-- (or smallest id as a tiebreaker) for each name.
DELETE FROM public.payment_terms
WHERE is_system = true
  AND id NOT IN (
    SELECT DISTINCT ON (name) id
    FROM public.payment_terms
    WHERE is_system = true
    ORDER BY name, sort_order ASC NULLS LAST, id ASC
  );

-- Step 2: Create unique index so future re-runs of the 039 seeds are idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_terms_system_name
  ON public.payment_terms (name)
  WHERE is_system = true;
