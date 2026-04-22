-- 045_sba_rls_fixes.sql
-- PR-2 review fix: migration 043's sba_update_own policy only declared USING
-- (which gates which rows the client may read/update) but no WITH CHECK
-- (which gates what the post-update row is allowed to look like). Without
-- WITH CHECK, an authenticated user could UPDATE a draft row's status to
-- any value a subsequent USING read would still accept, opening a path to
-- resurrect already-active rows back to draft and edit their terms.
--
-- Can't edit 043 retroactively, so this migration drops and recreates the
-- policy with an explicit WITH CHECK clause:
--   • USING      — only draft/pending_countersign rows can be targeted from
--                  the client at all (active/expired/terminated are read-only).
--   • WITH CHECK — the row may transition INTO draft, pending_countersign,
--                  active, superseded, or terminated — supporting the legal
--                  transitions made by signBySender / countersign RPC /
--                  terminateSba / supersede_and_renew_sba. Because those
--                  RPCs run SECURITY DEFINER they already bypass RLS, but
--                  client-initiated UPDATEs (e.g. draft terms edit) now
--                  can't push a row into 'expired' or mutate an active row.

DROP POLICY IF EXISTS sba_update_own ON public.self_billing_agreements;

CREATE POLICY sba_update_own ON public.self_billing_agreements
  FOR UPDATE TO authenticated
  USING      (auth.uid() = user_id AND status IN ('draft','pending_countersign'))
  WITH CHECK (auth.uid() = user_id AND status IN ('draft','pending_countersign','active','superseded','terminated'));

-- Expected: UPDATE from a client session can transition draft→pending→terminated
-- but cannot mutate an active row's terms (USING blocks).
