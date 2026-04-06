import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppCtx } from "../context/AppContext";
import { ROUTES } from "./routes";
import PageLoader from "../components/ui/PageLoader";

// ─── localStorage helper ─────────────────────────────────────────────────────
// Mirrors the LS.get() helper in App.jsx so this file has no external dep on it.
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

// ─── ProtectedRoute ──────────────────────────────────────────────────────────
/**
 * Requires an authenticated user session.
 *
 * Behaviour:
 *  1. While auth is still resolving (e.g. mid-OAuth exchange, page refresh
 *     before App.jsx's Supabase session promise completes) → renders a full-
 *     screen loader instead of flashing /login.  Detection is done by checking
 *     whether a valid, non-expired user record exists in localStorage even
 *     though AppCtx.user is not yet populated.
 *
 *  2. No session at all → redirects to /login, preserving the intended
 *     destination in `location.state.from` so AuthRoute can send the user back
 *     after successful login.
 *
 *  3. `requiredRole` set and user role doesn't match → redirects to /404.
 *     Using a 404 instead of /forbidden avoids advertising that the route
 *     exists to users who shouldn't know about it (e.g. /admin).
 *
 * TODO: Once App.jsx exposes `authChecked` via AppCtx, replace the
 *       localStorage isPending heuristic with `!authChecked`.
 *
 * @param {string} [requiredRole] — "admin" | "user" — omit to allow any auth'd user
 */
export function ProtectedRoute({ requiredRole } = {}) {
  const { user } = useContext(AppCtx);
  const location = useLocation();

  // Heuristic: AppCtx hasn't received the Supabase session yet but a valid
  // stored record exists → show loader to avoid a premature redirect to /login.
  // (authChecked is now in AppCtx but the localStorage heuristic is kept as an
  //  additional fast-path that works before the first context update fires.)
  const stored    = lsGet("ai_invoice_user", null);
  const expired   = stored?.expiresAt && Date.now() > stored.expiresAt;
  const isPending = !user && stored && !expired;

  if (isPending) {
    return <PageLoader message="Checking session…" />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LANDING} replace />;
  }

  if (requiredRole && user.role?.toLowerCase() !== requiredRole.toLowerCase()) {
    return <Navigate to={ROUTES.NOT_FOUND} replace />;
  }

  return <Outlet />;
}

// ─── OnboardedRoute ──────────────────────────────────────────────────────────
/**
 * Sits inside ProtectedRoute. Requires org setup + onboarding to be complete.
 * Redirects to /onboarding if either condition is unmet.
 *
 * Reads onboardingDone from AppCtx (Supabase-sourced, set in App.jsx after
 * business data hydration). Gates on businessDataHydrated to avoid a premature
 * redirect before the Supabase row has been loaded — without this gate, users
 * whose localStorage is absent/stale would always be bounced to onboarding.
 */
export function OnboardedRoute({ redirectTo = ROUTES.ONBOARDING } = {}) {
  const { onboardingDone, businessDataHydrated } = useContext(AppCtx);

  // Hold on the loader until Supabase data is ready — onboardingDone is
  // always false during hydration; redirecting here would be premature.
  if (!businessDataHydrated) return <PageLoader />;

  if (!onboardingDone) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

// ─── GuestOnlyRoute ──────────────────────────────────────────────────────────
/**
 * Prevents authenticated users from seeing auth pages (/login, /signup, etc.).
 *
 * Redirects to the destination preserved in `location.state.from` (set by
 * ProtectedRoute when it bounced an unauthenticated user), or to `redirectTo`
 * (default: /dashboard).
 */
export function GuestOnlyRoute({ redirectTo = ROUTES.DASHBOARD } = {}) {
  const { user } = useContext(AppCtx);
  const location = useLocation();

  if (user) {
    const target = location.state?.from?.pathname ?? redirectTo;
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
