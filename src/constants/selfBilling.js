// ─── SELF-BILLING CONSTANTS (HMRC VAT Notice 700/62) ──────────────────────────
//
// Mandatory marker phrases must match HMRC wording exactly. Changing any string
// in this file is a regulated change — treat it as such.
//
// Pure constants only: no functions, no side effects, no runtime imports.

// ─── HMRC mandatory marker strings ────────────────────────────────────────────
export const SELF_BILL_MARKER_TITLE = 'SELF-BILLING INVOICE';
export const SELF_BILL_VAT_STATEMENT = 'The VAT shown is your output tax due to HMRC';
export const SELF_BILL_VAT_STATEMENT_NON_VAT_SUPPLIER = 'VAT not applicable — supplier is not VAT registered';

// ─── Agreement duration ───────────────────────────────────────────────────────
export const SBA_DEFAULT_DURATION_MONTHS = 12;
export const SBA_MAX_DURATION_MONTHS = 24;

// Days-before-expiry at which to surface renewal reminders to the user.
export const SBA_RENEWAL_WARNING_DAYS = Object.freeze([30, 14, 7, 1]);

// ─── Enums ────────────────────────────────────────────────────────────────────
export const SB_DIRECTION = Object.freeze({
  ISSUED: 'issued',
  RECEIVED: 'received',
});

export const SBA_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_COUNTERSIGN: 'pending_countersign',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  TERMINATED: 'terminated',
  SUPERSEDED: 'superseded',
});

export const SB_EMISSION_TYPE = Object.freeze({
  DOWNLOAD: 'download',
  EMAIL: 'email',
  RESENT: 'resent',
  RECEIVED: 'received', // Phase 3 — imported self-bills from customers
});

// ─── Numbering format ─────────────────────────────────────────────────────────
export const DEFAULT_SB_PREFIX = 'SB-';
export const DEFAULT_SB_FORMAT = '{prefix}{yyyy}-{seq:0000}';

export const SB_NUMBER_FORMAT_TOKENS = Object.freeze([
  '{prefix}',
  '{yyyy}',
  '{yy}',
  '{mm}',
  '{seq:0000}',
  '{seq:000}',
  '{seq:00}',
]);

// ─── Agreement clause template (HMRC Notice 700/62 §8) ────────────────────────
export const SBA_CLAUSE_KEYS = Object.freeze({
  SELF_BILLER_ISSUES: 'self_biller_issues',
  SELF_BILLEE_ACCEPTS: 'self_billee_accepts',
  VAT_STATUS_NOTIFICATION: 'vat_status_notification',
  DURATION: 'duration',
  MANDATORY_MARKERS: 'mandatory_markers',
});

export const HMRC_SBA_TERMS_TEMPLATE = Object.freeze([
  Object.freeze({
    id: SBA_CLAUSE_KEYS.SELF_BILLER_ISSUES,
    title: 'Issuance of Invoices',
    body: 'The Self-Biller will issue self-billed invoices for all supplies made by the Self-Billee during the period of this agreement.',
  }),
  Object.freeze({
    id: SBA_CLAUSE_KEYS.SELF_BILLEE_ACCEPTS,
    title: 'Acceptance',
    body: 'The Self-Billee agrees to accept the self-billed invoices issued by the Self-Biller and will not issue sales invoices for any transaction covered by this agreement.',
  }),
  Object.freeze({
    id: SBA_CLAUSE_KEYS.VAT_STATUS_NOTIFICATION,
    title: 'VAT Status Notifications',
    body: 'The Self-Billee will notify the Self-Biller immediately if they change their VAT registration number, deregister from VAT, or transfer the business as a going concern.',
  }),
  Object.freeze({
    id: SBA_CLAUSE_KEYS.DURATION,
    title: 'Duration',
    body: 'This agreement shall commence on {startDate} and expire on {endDate}. Beyond this date, a new agreement must be entered into for self-billing to continue.',
  }),
  Object.freeze({
    id: SBA_CLAUSE_KEYS.MANDATORY_MARKERS,
    title: 'Invoice Markers',
    body: `The Self-Biller will include on every self-billed invoice the statement: '${SELF_BILL_VAT_STATEMENT}', and will clearly mark each invoice as a '${SELF_BILL_MARKER_TITLE}'.`,
  }),
]);

// ─── VAT verification cache ───────────────────────────────────────────────────
// VIES / HMRC VAT-status checks older than this are considered stale and must
// be refreshed before emission.
export const VAT_VERIFICATION_STALE_DAYS = 90;

// ─── Storage bucket ids (must match migration 043) ────────────────────────────
export const SBA_BUCKET = 'self-billing-agreements';
export const SB_INVOICES_BUCKET = 'self-billing-invoices';