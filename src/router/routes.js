/**
 * ROUTES — single source of truth for every URL path in InvoiceSaga.
 *
 * Rules:
 *  - Static paths  → plain strings    e.g. ROUTES.INVOICES
 *  - Dynamic paths → arrow functions  e.g. ROUTES.INVOICE("inv_abc")
 *  - Never hardcode a URL string anywhere else in the app — always import from here.
 */

export const ROUTES = {

  // ─── Marketing / Public ─────────────────────────────────────────────────────
  LANDING:   '/',
  TEMPLATES: '/templates',
  CONTACT:   '/contact',
  PRIVACY:   '/privacy',
  TERMS:     '/terms',
  COOKIES:   '/cookies',
  GDPR:      '/gdpr',

  // ─── Auth ────────────────────────────────────────────────────────────────────
  LOGIN:           '/login',
  SIGNUP:          '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD:  '/reset-password',
  AUTH_CALLBACK:   '/auth/callback',

  // ─── Onboarding (authenticated, org not yet configured) ─────────────────────
  ONBOARDING: '/onboarding',

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  DASHBOARD: '/dashboard',

  // ─── Customers ───────────────────────────────────────────────────────────────
  CUSTOMERS:     '/customers',
  CUSTOMERS_NEW: '/customers/new',
  CUSTOMER:      (id) => `/customers/${id}`,
  CUSTOMER_EDIT: (id) => `/customers/${id}/edit`,

  // ─── Items / Catalog ─────────────────────────────────────────────────────────
  ITEMS:     '/items',
  ITEMS_NEW: '/items/new',

  // ─── Invoices ────────────────────────────────────────────────────────────────
  INVOICES:      '/invoices',
  INVOICES_NEW:  '/invoices/new',
  INVOICE:       (id) => `/invoices/${id}`,
  INVOICE_EDIT:  (id) => `/invoices/${id}/edit`,
  INVOICE_PRINT: (id) => `/invoices/${id}/print`,

  // ─── Quotes ──────────────────────────────────────────────────────────────────
  QUOTES:      '/quotes',
  QUOTES_NEW:  '/quotes/new',
  QUOTE:       (id) => `/quotes/${id}`,
  QUOTE_EDIT:  (id) => `/quotes/${id}/edit`,
  QUOTE_PRINT: (id) => `/quotes/${id}/print`,

  // ─── Payments ────────────────────────────────────────────────────────────────
  PAYMENTS:     '/payments',
  PAYMENTS_NEW: '/payments/new',

  // ─── Expenses ────────────────────────────────────────────────────────────────
  EXPENSES:     '/expenses',
  EXPENSES_NEW: '/expenses/new',

  // ─── Ledger ──────────────────────────────────────────────────────────────────
  LEDGER:          '/ledger',
  LEDGER_JOURNAL:  '/ledger/journal',
  LEDGER_ACCOUNTS: '/ledger/accounts',
  LEDGER_PL:       '/ledger/pl',

  // ─── Settings ────────────────────────────────────────────────────────────────
  SETTINGS:              '/settings',
  SETTINGS_GENERAL:      '/settings/general',
  SETTINGS_EMAIL:        '/settings/email',
  SETTINGS_TEMPLATES:    '/settings/invoice-templates',
  SETTINGS_TEMPLATE:     (id) => `/settings/invoice-templates/${id}`,
  SETTINGS_INTEGRATIONS: '/settings/integrations',

  // ─── Admin ───────────────────────────────────────────────────────────────────
  ADMIN: '/admin',

  // ─── Public document share (no auth required) ────────────────────────────────
  // Token and expiry are passed as search params: ?token=<uuid>&expires=<YYYY-MM-DD>
  PUBLIC_INVOICE: (number) => `/public/invoice/${number}`,
  PUBLIC_QUOTE:   (number) => `/public/quote/${number}`,
  SECURE_INVOICE: (number) => `/secure/invoice/${number}`,
  SECURE_QUOTE:   (number) => `/secure/quote/${number}`,

  // ─── Utility ─────────────────────────────────────────────────────────────────
  NOT_FOUND: '/404',
};
