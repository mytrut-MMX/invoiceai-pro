/**
 * useBusinessType — derives business entity type from AppCtx.orgSettings.
 *
 * Data source: reads AppCtx directly. Does NOT query Supabase — the app
 * already hydrates `business_profiles.org_settings` into AppContext on
 * auth (src/App.jsx, setOrgSettingsState).
 *
 * Loading signal: AppCtx.businessDataHydrated. While this is false (auth
 * still settling, or the row hasn't loaded yet), we return loading=true
 * so gated sidebar items can stay hidden and avoid a flash of wrong nav.
 *
 * Detection rules (Phase 1):
 *   isLtd        = orgSettings.crn is a non-empty string        (per Task 1 schema)
 *   isSoleTrader = orgSettings.bType === "Sole Trader / Freelancer"
 *
 * These two flags are independent, not strict inverses. A user who has
 * selected "Other" (or hasn't completed onboarding) may be neither; a
 * user mid-setup may be both temporarily. The sidebar gate uses isLtd
 * for Corporation Tax and isSoleTrader for Self Assessment (the existing
 * semantics for ITSA, preserved from the hardcoded check in layout).
 *
 * Future: an explicit business_type column on business_profiles will
 * supersede this heuristic.
 *
 * @returns {{ businessType: 'ltd' | 'sole_trader' | null,
 *             isLtd: boolean, isSoleTrader: boolean, loading: boolean }}
 */

import { useContext } from "react";
import { AppCtx } from "../context/AppContext";

export function useBusinessType() {
  const ctx = useContext(AppCtx);
  const loading = !(ctx?.businessDataHydrated);
  const orgSettings = ctx?.orgSettings;

  const crn = orgSettings?.crn;
  const isLtd = typeof crn === "string" && crn.trim() !== "";
  const isSoleTrader = orgSettings?.bType === "Sole Trader / Freelancer";

  let businessType = null;
  if (isLtd) businessType = "ltd";
  else if (isSoleTrader) businessType = "sole_trader";

  return { businessType, isLtd, isSoleTrader, loading };
}
