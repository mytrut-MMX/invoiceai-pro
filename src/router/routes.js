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
  REFUND:    '/refund-policy',
  FEEDBACK:  '/feedback',
  PRICING:   '/pricing',
  FEATURES:  '/features',
  BLOG:      '/blog',
  BLOG_POST_INVOICE_GUIDE: '/blog/how-to-write-a-freelance-invoice',
  BLOG_POST_LATE_PAYMENT:  '/blog/how-to-chase-a-late-payment',
  BLOG_POST_TEMPLATE:      '/blog/freelance-invoice-template',

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

  // ─── Bills / Purchases ──────────────────────────────────────────────────────
  BILLS:      '/bills',
  BILLS_NEW:  '/bills/new',
  BILL:       (id) => `/bills/${id}`,
  BILL_EDIT:  (id) => `/bills/${id}/edit`,

  // ─── Employees / Payroll ───────────────────────────────────────────────────
  EMPLOYEES:     '/employees',
  EMPLOYEES_NEW: '/employees/new',
  EMPLOYEE:      (id) => `/employees/${id}`,
  EMPLOYEE_EDIT: (id) => `/employees/${id}/edit`,

  // ─── Payroll Runs ──────────────────────────────────────────────────────────
  PAYROLL:     '/payroll',
  PAYROLL_RUN: (id) => `/payroll/${id}`,

  // ─── VAT Returns ─────────────────────────────────────────────────────────────
  VAT_RETURN: '/vat-return',

  // ─── ITSA (Self Assessment) ────────────────────────────────────────────────
  ITSA: '/self-assessment',

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
  // AUTH-005: Token is a full UUID (122-bit entropy).
  // AUTH-006: Expiry is currently client-side only — not tamper-proof.
  // TODO: Move share link validation to a server-side API endpoint.
  // Token and expiry are passed as search params: ?token=<uuid>&expires=<YYYY-MM-DD>
  PUBLIC_INVOICE: (number) => `/public/invoice/${number}`,
  PUBLIC_QUOTE:   (number) => `/public/quote/${number}`,
  SECURE_INVOICE: (number) => `/secure/invoice/${number}`,
  SECURE_QUOTE:   (number) => `/secure/quote/${number}`,

  // ─── Utility ─────────────────────────────────────────────────────────────────
  NOT_FOUND: '/404',
};
