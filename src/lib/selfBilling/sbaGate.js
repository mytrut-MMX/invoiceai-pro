// Whether the signed-in user has at least one active 'issued' SBA. Used by:
//   - TopBar quick-create menu (Self-Billed Invoice entry gate)
//   - Sidebar "Self-Billed" sub-link under Bills
//   - CommandPalette "Create Self-Billed Invoice" action gate
//   - AppShell ⌘⇧S keyboard shortcut gate
//   - SbaRenewalsWidget — widget self-hides when false
//
// Pre-migration-048 this was derived synchronously from the suppliers array
// via `self_billing.enabled` — a legacy column that was always a staler proxy
// than the self_billing_agreements table. Now the source of truth is a single
// async query against self_billing_agreements, cached in React state.

import { useState, useEffect, useCallback } from "react";
import { listActiveSbas } from "./sbaService.js";

/**
 * Non-React helper — one PostgREST query, returns boolean.
 * Safe to call from anywhere; caller is responsible for deciding when.
 */
export async function fetchHasAnyActiveIssuedSba(userId) {
  if (!userId) return false;
  try {
    const rows = await listActiveSbas({ userId, direction: "issued" });
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    // On error, default to false — nav/widget gates fail closed so users
    // without a working DB connection don't see a broken self-bill flow.
    return false;
  }
}

/**
 * React hook: fetches once on mount / whenever `userId` changes, and exposes
 * a `refresh()` callback the SBA create/terminate flows can call to refetch.
 *
 * Returns { value, refresh }.
 *   value — boolean (initially false while loading, so gates stay conservative)
 *   refresh — () => Promise<void> re-runs the query
 */
export function useHasAnyActiveIssuedSba(userId) {
  const [value, setValue] = useState(false);

  const refresh = useCallback(async () => {
    const v = await fetchHasAnyActiveIssuedSba(userId);
    setValue(v);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await fetchHasAnyActiveIssuedSba(userId);
      if (!cancelled) setValue(v);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return { value, refresh };
}
