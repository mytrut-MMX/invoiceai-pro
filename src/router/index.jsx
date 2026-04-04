/**
 * src/router/index.jsx
 *
 * Single source of truth for routing. Exports <AppRouter /> which is
 * rendered directly by main.jsx (inside <App /> which provides AppCtx).
 *
 * Architecture:
 *  - createBrowserRouter (HTML5 history, no hash)
 *  - Every page is React.lazy() — no eager loading except layouts/guards
 *  - AppShell provides sidebar + topbar layout for all authenticated pages
 *  - Route wrapper components (AuthRoute, OnboardingRoute, etc.) bridge the
 *    callback-prop API of existing page components to the router world
 */

import {
  lazy, Suspense,
  useContext, useState, useEffect, useCallback,
} from "react";
import {
  createBrowserRouter, RouterProvider,
  Navigate, Outlet, useNavigate, useLocation,
} from "react-router-dom";

import { AppCtx }                                        from "../context/AppContext";
import { ROUTES }                                        from "./routes";
import { ProtectedRoute, OnboardedRoute, GuestOnlyRoute } from "./ProtectedRoute";
import { Sidebar, MobileTopBar, MobileBottomNav, MobileDrawer } from "../components/layout";
import UserEditModal                                      from "../modals/UserEditModal";
import { signOut }                                       from "../lib/supabase";
import { ff }                                            from "../constants";
import PageLoader                                        from "../components/ui/PageLoader";

// ─── Lazy page imports ────────────────────────────────────────────────────────

// Public / Marketing
const LandingPage        = lazy(() => import("../pages/landing/LandingPage"));
const TemplatesShowcase  = lazy(() => import("../pages/landing/TemplatesPage"));
const ContactPage        = lazy(() => import("../pages/landing/ContactPage"));
const PrivacyPage        = lazy(() => import("../pages/landing/PrivacyPage"));
const TermsPage          = lazy(() => import("../pages/landing/TermsPage"));
const CookiePolicyPage   = lazy(() => import("../pages/landing/CookiePolicyPage"));
const GdprPage           = lazy(() => import("../pages/landing/GdprPage"));

// Auth
const AuthPage           = lazy(() => import("../pages/AuthPage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ResetPasswordPage  = lazy(() => import("../pages/ResetPasswordPage"));
const AuthCallbackPage   = lazy(() => import("../pages/AuthCallbackPage"));

// Onboarding
const OnboardingFlow     = lazy(() => import("../pages/OnboardingFlow"));

// App pages
const HomePage           = lazy(() => import("../pages/HomePage"));
const CustomersPage      = lazy(() => import("../pages/CustomersPage"));
const ItemsPage          = lazy(() => import("../pages/ItemsPage"));
const InvoicesPage       = lazy(() => import("../pages/InvoicesPage"));
const QuotesPage         = lazy(() => import("../pages/QuotesPage"));
const PaymentsPage       = lazy(() => import("../pages/PaymentsPage"));
const ExpensesPage       = lazy(() => import("../pages/ExpensesPage"));
const SettingsPage       = lazy(() => import("../pages/SettingsPage"));
const InvoiceTemplatesPage = lazy(() => import("../pages/InvoiceTemplatesPage"));
const LedgerPage         = lazy(() => import("../pages/LedgerPage"));
const AdminPage          = lazy(() => import("../pages/AdminPage"));
const NotFoundPage       = lazy(() => import("../pages/NotFoundPage"));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

/** Wrap a lazy component in its own Suspense — used for routes outside AppShell. */
function S({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
/**
 * Layout wrapper for all authenticated app pages.
 * Provides the sidebar, mobile top bar, mobile bottom nav, mobile drawer,
 * and the user-edit modal. Renders page content via <Outlet />.
 *
 * Reads appTheme and user from AppCtx; all sidebar UI state is local.
 */
function AppShell() {
  const { user, setUser, appTheme, setAppTheme } = useContext(AppCtx);
  const navigate = useNavigate();

  // UI state (lives here now that App.jsx is a pure context provider)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showUserModal,    setShowUserModal]    = useState(false);
  const [storageError,     setStorageError]     = useState(null);

  // Avatar and sidebar-pin preference — persisted directly to localStorage
  const [userAvatar,    setUserAvatar]    = useState(() => lsGet("ai_invoice_avatar", null));
  const [sidebarPinned, setSidebarPinned] = useState(() => lsGet("ai_invoice_sidebar_pinned", true));

  // Persist avatar / pin when they change
  useEffect(() => {
    try { localStorage.setItem("ai_invoice_avatar", JSON.stringify(userAvatar)); } catch {}
  }, [userAvatar]);
  useEffect(() => {
    try { localStorage.setItem("ai_invoice_sidebar_pinned", JSON.stringify(sidebarPinned)); } catch {}
  }, [sidebarPinned]);

  // Storage-quota error banner (dispatched by utils/storage.js)
  useEffect(() => {
    const handler = (e) =>
      setStorageError(`Storage full — data may not be saved (${e.detail.keys.length} key(s) failed).`);
    window.addEventListener("storage-error", handler);
    return () => window.removeEventListener("storage-error", handler);
  }, []);

  const sessionExpiringSoon =
    user?.expiresAt &&
    user.expiresAt - Date.now() < 30 * 60 * 1000 &&
    Date.now() < user.expiresAt;

  const sidebarBg =
    appTheme.type === "gradient"
      ? `linear-gradient(160deg,${appTheme.color},${appTheme.color2})`
      : appTheme.color;

  const doLogout = useCallback(async () => {
    try { await signOut(); } catch {}
    localStorage.removeItem("ai_invoice_user");
    setUser(null);
    navigate(ROUTES.LANDING);
  }, [navigate, setUser]);

  const extendSession = useCallback(() => {
    setUser(prev => {
      const updated = { ...prev, expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
      try { localStorage.setItem("ai_invoice_user", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [setUser]);

  return (
    <>
      {/* Storage error banner */}
      {storageError && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:9999, background:"#7F1D1D", color:"#FEE2E2", fontSize:13, fontWeight:600, padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, fontFamily:ff }}>
          <span>⚠ {storageError}</span>
          <button onClick={() => setStorageError(null)} style={{ background:"none", border:"none", color:"#FCA5A5", cursor:"pointer", fontSize:18, lineHeight:1, padding:0 }}>×</button>
        </div>
      )}

      {/* Session-expiring-soon banner */}
      {sessionExpiringSoon && (
        <div style={{ position:"fixed", top:storageError ? 44 : 0, left:0, right:0, zIndex:9998, background:"#78350F", color:"#FEF3C7", fontSize:13, fontWeight:600, padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, fontFamily:ff }}>
          <span>⚠ Your session expires soon. Save your work.</span>
          <button onClick={extendSession} style={{ background:"#FEF3C7", color:"#78350F", border:"none", borderRadius:6, padding:"4px 12px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff }}>Stay logged in</button>
        </div>
      )}

      <div style={{ display:"flex", height:"100vh", overflow:"hidden", fontFamily:ff, background:"#f4f5f7" }}>

        {/* Desktop sidebar */}
        <div className="desktop-only">
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            accent={appTheme.accent}
            sidebarBg={sidebarBg}
            user={user}
            userAvatar={userAvatar}
            onUserClick={() => setShowUserModal(true)}
            onLogout={doLogout}
          />
        </div>

        {/* Main column */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0, background:"#fff", borderBottom:"1px solid #e8e8ec" }}>

          {/* Mobile top bar */}
          <div className="mobile-only">
            <MobileTopBar
              onMenuOpen={() => setMobileDrawerOpen(true)}
              sidebarBg={sidebarBg}
              accent={appTheme.accent}
              user={user}
              userAvatar={userAvatar}
              onUserClick={() => setShowUserModal(true)}
            />
            <div style={{ height: 52 }} />
          </div>

          {/* Page content — lazy-loaded pages suspend here */}
          <main className="main-content" style={{ flex:1, overflowY:"auto" }}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>

          {/* Mobile bottom nav */}
          <div className="mobile-only">
            <MobileBottomNav accent={appTheme.accent} />
            <div style={{ height: 60 }} />
          </div>
        </div>

        {/* Mobile drawer (overlay) */}
        {mobileDrawerOpen && (
          <MobileDrawer
            onClose={() => setMobileDrawerOpen(false)}
            sidebarBg={sidebarBg}
            accent={appTheme.accent}
            user={user}
            userAvatar={userAvatar}
            onUserClick={() => { setShowUserModal(true); setMobileDrawerOpen(false); }}
            onLogout={doLogout}
          />
        )}

        {/* User / appearance modal */}
        {showUserModal && (
          <UserEditModal
            user={user}
            onClose={() => setShowUserModal(false)}
            onSave={u => setUser(prev => ({ ...prev, ...u }))}
            userAvatar={userAvatar}
            setUserAvatar={setUserAvatar}
            appTheme={appTheme}
            setAppTheme={setAppTheme}
            sidebarPinned={sidebarPinned}
            setSidebarPinned={setSidebarPinned}
            onLogout={doLogout}
          />
        )}
      </div>
    </>
  );
}

// ─── Route wrapper components ─────────────────────────────────────────────────
//
// These bridge existing page components that use callback props to the router.
// They will shrink as page components are refactored to use hooks directly.

/**
 * "/" — shows LandingPage to guests; redirects authenticated users to the app.
 */
function IndexRedirect() {
  const { user } = useContext(AppCtx);
  const onboardingDone = lsGet("ai_invoice_onboarding_done", false);

  if (!user) return (
    <S><LandingPage /></S>
  );
  if (!onboardingDone) return <Navigate to={ROUTES.ONBOARDING} replace />;
  return <Navigate to={ROUTES.DASHBOARD} replace />;
}

/**
 * /login and /signup — provides onAuth callback to AuthPage.
 * After auth, GuestOnlyRoute detects the populated user and redirects.
 */
function AuthRoute() {
  const { setUser } = useContext(AppCtx);

  const handleAuth = useCallback((u) => {
    // If a different user just logged in, reset their onboarding status
    try {
      const prev = JSON.parse(localStorage.getItem("ai_invoice_user") || "null");
      if (prev && prev.email !== u.email) {
        localStorage.setItem("ai_invoice_onboarding_done", JSON.stringify(false));
      }
    } catch {}
    setUser(u); // GuestOnlyRoute detects user and redirects to from or /dashboard
  }, [setUser]);

  return (
    <S><AuthPage onAuth={handleAuth} /></S>
  );
}

/**
 * /auth/callback — handles OAuth return. Delegates auth to AuthCallbackPage,
 * then explicitly navigates to /dashboard (because AuthCallbackPage calls
 * window.history.replaceState which doesn't trigger React Router).
 */
function AuthCallbackRoute() {
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

  return (
    <S><AuthCallbackPage onAuth={handleAuth} /></S>
  );
}

/**
 * /onboarding — supplies all required props to OnboardingFlow from AppCtx.
 */
function OnboardingRoute() {
  const {
    user, orgSettings, setOrgSettings,
    customers, setCustomers,
    invoices,  setInvoices,
    invoicePrefix, invoiceStartNum,
  } = useContext(AppCtx);
  const navigate = useNavigate();

  const handleComplete = useCallback(({ orgSettings: org, done }) => {
    if (org)   setOrgSettings(org);
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
function ResetPasswordRoute() {
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

// ─── Router definition ────────────────────────────────────────────────────────

const router = createBrowserRouter([

  // ── Root index: smart redirect based on auth + onboarding state ─────────────
  { index: true, element: <IndexRedirect /> },

  // ── Public marketing pages ──────────────────────────────────────────────────
  { path: ROUTES.TEMPLATES, element: <S><TemplatesShowcase /></S> },
  { path: ROUTES.CONTACT,   element: <S><ContactPage /></S> },
  { path: ROUTES.PRIVACY,   element: <S><PrivacyPage /></S> },
  { path: ROUTES.TERMS,     element: <S><TermsPage /></S> },
  { path: ROUTES.COOKIES,   element: <S><CookiePolicyPage /></S> },
  { path: ROUTES.GDPR,      element: <S><GdprPage /></S> },

  // ── Auth flows ──────────────────────────────────────────────────────────────
  // Login + signup: guest-only (redirects authenticated users to /dashboard)
  {
    element: <GuestOnlyRoute />,
    children: [
      { path: ROUTES.LOGIN,           element: <AuthRoute /> },
      { path: ROUTES.SIGNUP,          element: <AuthRoute /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <S><ForgotPasswordPage /></S> },
    ],
  },
  // These are reachable regardless of auth state
  { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordRoute /> },
  { path: ROUTES.AUTH_CALLBACK,  element: <AuthCallbackRoute /> },

  // ── Onboarding (auth required, org setup not yet done) ──────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      { path: ROUTES.ONBOARDING, element: <OnboardingRoute /> },
    ],
  },

  // ── Main app (auth + onboarding required, full sidebar layout) ──────────────
  {
    element: <ProtectedRoute />,
    children: [{
      element: <OnboardedRoute />,
      children: [{
        element: <AppShell />,
        children: [

          // Dashboard
          { path: ROUTES.DASHBOARD, element: <HomePage /> },

          // Customers
          { path: ROUTES.CUSTOMERS,     element: <CustomersPage key="list" /> },
          { path: ROUTES.CUSTOMERS_NEW, element: <CustomersPage key="new" initialShowForm /> },
          // TODO: { path: ROUTES.CUSTOMER(":id"),      element: <CustomerDetailPage /> },
          // TODO: { path: ROUTES.CUSTOMER_EDIT(":id"), element: <CustomerDetailPage mode="edit" /> },

          // Items
          { path: ROUTES.ITEMS,     element: <ItemsPage key="list" /> },
          { path: ROUTES.ITEMS_NEW, element: <ItemsPage key="new"  initialShowForm /> },

          // Invoices
          { path: ROUTES.INVOICES,     element: <InvoicesPage key="list" /> },
          { path: ROUTES.INVOICES_NEW, element: <InvoicesPage key="new"  initialShowForm /> },
          // TODO: { path: ROUTES.INVOICE(":id"),       element: <InvoiceDetailPage /> },
          // TODO: { path: ROUTES.INVOICE_EDIT(":id"),  element: <InvoiceEditPage /> },

          // Quotes
          { path: ROUTES.QUOTES,     element: <QuotesPage key="list" /> },
          { path: ROUTES.QUOTES_NEW, element: <QuotesPage key="new"  initialShowForm /> },
          // TODO: { path: ROUTES.QUOTE(":id"),         element: <QuoteDetailPage /> },
          // TODO: { path: ROUTES.QUOTE_EDIT(":id"),    element: <QuoteEditPage /> },

          // Payments
          { path: ROUTES.PAYMENTS,     element: <PaymentsPage key="list" /> },
          { path: ROUTES.PAYMENTS_NEW, element: <PaymentsPage key="new"  initialShowForm /> },

          // Expenses
          { path: ROUTES.EXPENSES,     element: <ExpensesPage key="list" /> },
          { path: ROUTES.EXPENSES_NEW, element: <ExpensesPage key="new"  initialShowForm /> },

          // Ledger — sub-tabs are URL path segments; LedgerPage reads useLocation
          { path: ROUTES.LEDGER,          element: <Navigate to={ROUTES.LEDGER_JOURNAL} replace /> },
          { path: ROUTES.LEDGER_JOURNAL,  element: <LedgerPage /> },
          { path: ROUTES.LEDGER_ACCOUNTS, element: <LedgerPage /> },
          { path: ROUTES.LEDGER_PL,       element: <LedgerPage /> },

          // Settings — monolith for now; sub-pages split in future refactor
          { path: ROUTES.SETTINGS,              element: <Navigate to={ROUTES.SETTINGS_GENERAL} replace /> },
          { path: ROUTES.SETTINGS_GENERAL,      element: <SettingsPage /> },
          { path: ROUTES.SETTINGS_EMAIL,        element: <SettingsPage /> },
          { path: ROUTES.SETTINGS_TEMPLATES,    element: <InvoiceTemplatesPage /> },
          { path: `${ROUTES.SETTINGS_TEMPLATES}/:id`, element: <InvoiceTemplatesPage /> },
          { path: ROUTES.SETTINGS_INTEGRATIONS, element: <SettingsPage /> },
        ],
      }],
    }],
  },

  // ── Admin (role-gated — renders 404 for non-admin, not a redirect) ──────────
  {
    element: <ProtectedRoute requiredRole="admin" />,
    children: [
      { path: ROUTES.ADMIN, element: <S><AdminPage /></S> },
    ],
  },

  // ── Public document share (no auth, token-validated) ─────────────────────────
  // TODO: Create PublicInvoicePage + PublicQuotePage components
  // { path: "/public/invoice/:number", element: <S><PublicInvoicePage /></S> },
  // { path: "/public/quote/:number",   element: <S><PublicQuotePage /></S> },
  // { path: "/secure/invoice/:number", element: <S><PublicInvoicePage secure /></S> },
  // { path: "/secure/quote/:number",   element: <S><PublicQuotePage secure /></S> },

  // ── 404 ─────────────────────────────────────────────────────────────────────
  { path: ROUTES.NOT_FOUND, element: <S><NotFoundPage /></S> },
  { path: "*",              element: <S><NotFoundPage /></S> },
]);

// ─── Exports ──────────────────────────────────────────────────────────────────

export { router };

/**
 * AppRouter — render this inside <App /> (which provides AppCtx.Provider).
 * main.jsx: createRoot(...).render(<App />)
 * App.jsx:  return <AppCtx.Provider value={ctx}><AppRouter /></AppCtx.Provider>
 */
export default function AppRouter() {
  return <RouterProvider router={router} />;
}
