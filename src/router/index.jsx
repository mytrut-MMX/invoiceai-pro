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
 *  - Route wrapper components (routeWrappers.jsx) bridge the callback-prop
 *    API of existing page components to the router world
 */

import { lazy, Suspense } from "react";
import {
  createBrowserRouter, RouterProvider,
  Navigate,
} from "react-router-dom";

import { ROUTES }                                        from "./routes";
import { ProtectedRoute, OnboardedRoute, GuestOnlyRoute } from "./ProtectedRoute";
import AppShell                                          from "../components/layout/AppShell";
import PageLoader                                        from "../components/ui/PageLoader";
import {
  IndexRedirect,
  AuthRoute,
  AuthCallbackRoute,
  OnboardingRoute,
  ResetPasswordRoute,
  ForgotPasswordPage,
} from "./routeWrappers";

// ─── Lazy page imports ────────────────────────────────────────────────────────

// Public / Marketing
const TemplatesShowcase  = lazy(() => import("../pages/landing/TemplatesPage"));
const ContactPage        = lazy(() => import("../pages/landing/ContactPage"));
const PrivacyPage        = lazy(() => import("../pages/landing/PrivacyPage"));
const TermsPage          = lazy(() => import("../pages/landing/TermsPage"));
const CookiePolicyPage   = lazy(() => import("../pages/landing/CookiePolicyPage"));
const GdprPage           = lazy(() => import("../pages/landing/GdprPage"));

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

/** Wrap a lazy component in its own Suspense — used for routes outside AppShell. */
function S({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
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
  {
    element: <GuestOnlyRoute />,
    children: [
      { path: ROUTES.LOGIN,           element: <AuthRoute /> },
      { path: ROUTES.SIGNUP,          element: <AuthRoute /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <S><ForgotPasswordPage /></S> },
    ],
  },
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

          // Items
          { path: ROUTES.ITEMS,     element: <ItemsPage key="list" /> },
          { path: ROUTES.ITEMS_NEW, element: <ItemsPage key="new"  initialShowForm /> },

          // Invoices
          { path: ROUTES.INVOICES,     element: <InvoicesPage key="list" /> },
          { path: ROUTES.INVOICES_NEW, element: <InvoicesPage key="new"  initialShowForm /> },

          // Quotes
          { path: ROUTES.QUOTES,     element: <QuotesPage key="list" /> },
          { path: ROUTES.QUOTES_NEW, element: <QuotesPage key="new"  initialShowForm /> },

          // Payments
          { path: ROUTES.PAYMENTS,     element: <PaymentsPage key="list" /> },
          { path: ROUTES.PAYMENTS_NEW, element: <PaymentsPage key="new"  initialShowForm /> },

          // Expenses
          { path: ROUTES.EXPENSES,     element: <ExpensesPage key="list" /> },
          { path: ROUTES.EXPENSES_NEW, element: <ExpensesPage key="new"  initialShowForm /> },

          // Ledger
          { path: ROUTES.LEDGER,          element: <Navigate to={ROUTES.LEDGER_JOURNAL} replace /> },
          { path: ROUTES.LEDGER_JOURNAL,  element: <LedgerPage /> },
          { path: ROUTES.LEDGER_ACCOUNTS, element: <LedgerPage /> },
          { path: ROUTES.LEDGER_PL,       element: <LedgerPage /> },

          // Settings
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

  // ── Admin (role-gated) ──────────────────────────────────────────────────────
  {
    element: <ProtectedRoute requiredRole="admin" />,
    children: [
      { path: ROUTES.ADMIN, element: <S><AdminPage /></S> },
    ],
  },

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
