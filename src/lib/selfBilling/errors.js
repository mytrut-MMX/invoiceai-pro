// Self-billing error dictionary. Leaf module — no runtime imports, no
// Supabase, no DOM. Symbolic codes so UI can branch on error.code rather
// than matching on message strings.
//
// Placeholder syntax in `message`: {name} is replaced by ctx[name] at
// getSbError() / SelfBillingError construction time. Each entry below
// documents which placeholders it accepts.

export const SB_ERRORS = Object.freeze({
  // ctx: counterpartyName, endDate
  SBA_EXPIRED: {
    code: 'SBA_EXPIRED',
    title: 'Self-Billing Agreement expired',
    message: 'The agreement with {counterpartyName} expired on {endDate}. You cannot issue self-billed invoices until a new agreement is signed.',
    userAction: 'Create a new agreement',
  },
  // ctx: counterpartyName
  SBA_NOT_SIGNED: {
    code: 'SBA_NOT_SIGNED',
    title: 'Agreement not yet countersigned',
    message: 'The self-billing agreement with {counterpartyName} has not been countersigned. Self-billed invoices cannot be issued until both parties have signed.',
    userAction: 'Send the agreement for countersignature',
  },
  // ctx: counterpartyName, status
  SBA_NOT_ACTIVE: {
    code: 'SBA_NOT_ACTIVE',
    title: 'Agreement is not active',
    message: 'The self-billing agreement with {counterpartyName} is in status "{status}". Only active agreements can be used to issue self-billed invoices.',
    userAction: 'Activate or replace the agreement',
  },
  // ctx: counterpartyName, existingStart, existingEnd
  SBA_OVERLAP: {
    code: 'SBA_OVERLAP',
    title: 'Overlapping agreement exists',
    message: 'An active self-billing agreement with {counterpartyName} already exists from {existingStart} to {existingEnd}. Two active agreements for the same counterparty are not permitted.',
    userAction: 'Terminate the existing agreement or adjust the dates',
  },
  // ctx: supplierName
  SUPPLIER_NOT_VAT_REGISTERED: {
    code: 'SUPPLIER_NOT_VAT_REGISTERED',
    title: 'Supplier is not VAT registered',
    message: 'Supplier {supplierName} is not VAT registered. The self-bill will be issued with a non-VAT marker in place of the VAT statement.',
    userAction: 'Confirm the supplier\'s VAT status before continuing',
  },
  // ctx: supplierName, vatNumber
  SUPPLIER_VAT_INVALID: {
    code: 'SUPPLIER_VAT_INVALID',
    title: 'Supplier VAT number is invalid',
    message: 'The VAT number {vatNumber} on file for {supplierName} failed HMRC verification. The self-bill cannot be issued until a valid VAT number is supplied.',
    userAction: 'Update the supplier VAT number',
  },
  // ctx: supplierName, lastCheckedDate
  SUPPLIER_VAT_STALE: {
    code: 'SUPPLIER_VAT_STALE',
    title: 'VAT verification is out of date',
    message: 'The last successful VAT check for {supplierName} was {lastCheckedDate}. Verification must be refreshed before the self-bill can be emitted.',
    userAction: 'Re-verify the supplier VAT number',
  },
  // ctx: supplierName, deregisteredOn
  SUPPLIER_VAT_DEREGISTERED: {
    code: 'SUPPLIER_VAT_DEREGISTERED',
    title: 'Supplier has deregistered from VAT',
    message: 'HMRC records show that {supplierName} deregistered from VAT on {deregisteredOn}. VAT must not be charged on self-bills to this supplier from that date.',
    userAction: 'Update supplier settings and renew the agreement',
  },
  // ctx: number
  SB_NUMBER_COLLISION: {
    code: 'SB_NUMBER_COLLISION',
    title: 'Duplicate self-bill number',
    message: 'Self-bill number {number} already exists for this user. The sequence has drifted — re-allocate from next_selfbill_number().',
    userAction: 'Retry the emission',
  },
  // ctx: supplierName, periodLabel
  DUPLICATE_BILL_FOR_PERIOD: {
    code: 'DUPLICATE_BILL_FOR_PERIOD',
    title: 'Bill already exists for this period',
    message: 'A bill from {supplierName} already exists for period {periodLabel}. Issuing a second self-bill would double-count the expense.',
    userAction: 'Review the existing bill before proceeding',
  },
  // ctx: none
  MISSING_MARKER_STATEMENT: {
    code: 'MISSING_MARKER_STATEMENT',
    title: 'Mandatory HMRC markers missing',
    message: 'The self-bill PDF is missing one or more mandatory HMRC marker phrases. Emission blocked to protect compliance.',
    userAction: 'Regenerate the PDF from the current template',
  },
  // ctx: supplierName
  SEQUENCE_LOCKED: {
    code: 'SEQUENCE_LOCKED',
    title: 'Invoice number sequence is busy',
    message: 'The self-bill number sequence for {supplierName} is locked by another operation. Please retry in a moment.',
    userAction: 'Retry',
  },
  // ctx: billId, sbaId
  DUPLICATE_WITH_SBA: {
    code: 'DUPLICATE_WITH_SBA',
    title: 'Bill already linked to a self-billing agreement',
    message: 'Bill {billId} is already linked to self-billing agreement {sbaId}. Linking to a second agreement would break the audit chain.',
    userAction: 'Unlink the existing agreement first',
  },
  // ctx: billId
  DUPLICATE_LEDGER_ENTRY: {
    code: 'DUPLICATE_LEDGER_ENTRY',
    title: 'Ledger entry already posted',
    message: 'A ledger entry for bill {billId} already exists. Posting twice would double the accounting impact.',
    userAction: 'Void the existing entry before reposting',
  },
  // ctx: taxPoint, periodStart, periodEnd
  TAX_POINT_OUT_OF_PERIOD: {
    code: 'TAX_POINT_OUT_OF_PERIOD',
    title: 'Tax point falls outside the agreement period',
    message: 'The tax point {taxPoint} falls outside the agreement window ({periodStart} → {periodEnd}). Self-bills can only cover supplies made during the agreement.',
    userAction: 'Adjust the tax point or use a different agreement',
  },
});

export function getSbError(code, ctx = {}) {
  const entry = SB_ERRORS[code];
  if (!entry) {
    return { code: 'UNKNOWN', title: 'Unknown error', message: code, userAction: null };
  }
  const message = entry.message.replace(/\{(\w+)\}/g, (_, k) =>
    ctx[k] != null ? String(ctx[k]) : `{${k}}`
  );
  return { ...entry, message };
}

export class SelfBillingError extends Error {
  constructor(code, ctx = {}) {
    const entry = getSbError(code, ctx);
    super(entry.message);
    this.name = 'SelfBillingError';
    this.code = code;
    this.title = entry.title;
    this.userAction = entry.userAction;
    this.ctx = ctx;
  }
}