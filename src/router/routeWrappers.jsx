/**
 * Route wrapper components — bridge existing page components (callback-prop API)
 * to the React Router world. These will shrink as page components are refactored
 * to use router hooks directly.
 */

import { lazy, Suspense, useContext, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppCtx } from "../context/AppContext";
import { ROUTES } from "./routes";
import PageLoader from "../components/ui/PageLoader";

// Lazy page imports — only the pages rendered by these wrappers
const LandingPage        = lazy(() => import("../pages/landing/LandingPage"));
const AuthPage           = lazy(() => import("../pages/AuthPage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ResetPasswordPage  = lazy(() => import("../pages/ResetPasswordPage"));
const AuthCallbackPage   = lazy(() => import("../pages/AuthCallbackPage"));
const OnboardingFlow     = lazy(() => import("../pages/OnboardingFlow"));

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function S({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

/**
 * "/" — shows LandingPage to guests; redirects authenticated users to the app.
 */
export function IndexRedirect() {
  const { user } = useContext(AppCtx);
  const onboardingDone = lsGet("ai_invoice_onboarding_done", false);

  if (!user) return <S><LandingPage /></S>;
  if (!onboardingDone) return <Navigate to={ROUTES.ONBOARDING} replace />;
  return <Navigate to={ROUTES.DASHBOARD} replace />;
}

/**
 * /login and /signup — provides onAuth callback to AuthPage.
 * After auth, GuestOnlyRoute detects the populated user and redirects.
 */
export function AuthRoute() {
  const { setUser } = useContext(AppCtx);

  const handleAuth = useCallback((u) => {
    try {
      const prev = JSON.parse(localStorage.getItem("ai_invoice_user") || "null");
      if (prev && prev.email !== u.email) {
        localStorage.setItem("ai_invoice_onboarding_done", JSON.stringify(false));
      }
    } catch {}
    setUser(u);
  }, [setUser]);

  return <S><AuthPage onAuth={handleAuth} /></S>;
}

/**
 * /auth/callback — handles OAuth return. Delegates auth to AuthCallbackPage,
 * then explicitly navigates to /dashboard (because AuthCallbackPage calls
 * window.history.replaceState which doesn't trigger React Router).
 */
export function AuthCallbackRoute() {
  const { setUser } = useContext(AppCtx);
  const navigate    = useNavigate();

  const handleAuth = useCallback((u) => {
    try {
      const prev = JSON.parse(localStorage.getItem("ai_invoice_user") || "null");
      if (prev && prev.email !== u.email) {
        localStorage.setItem("ai_invoice_onboarding_done", JSON.stringify(false));
      }
    } catch {}
    localStorage.setItem("ai_invoice_user", JSON.stringify(u));
    setUser(u);
    navigate(ROUTES.DASHBOARD, { replace: true });
  }, [setUser, navigate]);

  return <S><AuthCallbackPage onAuth={handleAuth} /></S>;
}

/**
 * /onboarding — supplies all required props to OnboardingFlow from AppCtx.
 */
export function OnboardingRoute() {
  const {
    user, orgSettings, setOrgSettings,
    customers, setCustomers,
    invoices,  setInvoices,
    invoicePrefix, invoiceStartNum,
  } = useContext(AppCtx);
  const navigate = useNavigate();

  const handleComplete = useCallback(({ orgSettings: org, done }) => {
    if (org)  setOrgSettings(org);
    if (done) {
      localStorage.setItem("ai_invoice_onboarding_done", JSON.stringify(true));
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [setOrgSettings, navigate]);

  return (
    <S>
      <OnboardingFlow
        user={user}
        orgSettings={orgSettings}
        onComplete={handleComplete}
        customers={customers}
        setCustomers={setCustomers}
        invoices={invoices}
        setInvoices={setInvoices}
        invoicePrefix={invoicePrefix}
        invoiceStartNum={invoiceStartNum}
      />
    </S>
  );
}

/**
 * /reset-password — replaces the page-reload-based back-to-login with navigate().
 */
export function ResetPasswordRoute() {
  const navigate = useNavigate();
  return (
    <S>
      <ResetPasswordPage
        onPasswordReset={() => {}}
        onBackToLogin={() => navigate(ROUTES.LOGIN, { replace: true })}
      />
    </S>
  );
}

export { ForgotPasswordPage };
