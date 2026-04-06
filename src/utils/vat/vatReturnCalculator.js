/**
 * VAT Return calculation engine for HMRC 9-box model.
 *
 * Supports all four VAT schemes: Standard, Cash Accounting, Flat Rate, Annual.
 * Respects tax_type semantics:
 *   - standard / reduced  → contributes to box1 (output VAT) and box6 (sales ex VAT)
 *   - zero_rated           → contributes to box6 only (VAT amount is £0)
 *   - exempt               → excluded from box1 AND box6
 *   - outside_scope         → excluded entirely
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round half-away-from-zero to 2 decimal places (HMRC convention). */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** True when `dateStr` (YYYY-MM-DD or ISO) falls within [start, end] inclusive. */
function inPeriod(dateStr, periodStart, periodEnd) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= periodStart && d <= periodEnd;
}

/**
 * Determine whether a line item contributes output VAT, sales value, or nothing.
 *
 * @returns {{ includeVAT: boolean, includeSales: boolean }}
 */
function classifyTaxType(taxType) {
  switch (taxType) {
    case 'standard':
    case 'reduced':
      return { includeVAT: true, includeSales: true };
    case 'zero_rated':
      return { includeVAT: false, includeSales: true };
    case 'exempt':
    case 'outside_scope':
    default:
      return { includeVAT: false, includeSales: taxType !== 'outside_scope' && taxType !== 'exempt' };
  }
}

// ---------------------------------------------------------------------------
// Scheme-specific output VAT (box1) calculators
// ---------------------------------------------------------------------------

function calcStandardBox1(invoices, periodStart, periodEnd) {
  let vatDue = 0;
  let salesExVat = 0;

  for (const inv of invoices) {
    const taxPoint = inv.tax_point || inv.taxPoint || inv.issue_date || inv.date;
    if (!inPeriod(taxPoint, periodStart, periodEnd)) continue;

    const items = inv.items || inv.line_items || [];
    for (const item of items) {
      const { includeVAT, includeSales } = classifyTaxType(item.tax_type || 'standard');
      const net = Number(item.net_amount ?? item.amount ?? 0);
      const vat = Number(item.vat_amount ?? item.tax ?? 0);

      if (includeSales) salesExVat += net;
      if (includeVAT) vatDue += vat;
    }

    // Fallback: invoice-level totals when no line items exist
    if (items.length === 0) {
      const { includeVAT, includeSales } = classifyTaxType(inv.tax_type || 'standard');
      const net = Number(inv.net_amount ?? inv.subtotal ?? 0);
      const vat = Number(inv.vat_amount ?? inv.tax ?? 0);
      if (includeSales) salesExVat += net;
      if (includeVAT) vatDue += vat;
    }
  }

  return { vatDue, salesExVat };
}

function calcCashBox1(invoices, periodStart, periodEnd) {
  let vatDue = 0;
  let salesExVat = 0;

  for (const inv of invoices) {
    // Cash Accounting: only count if payment was received within the period
    const paymentDate = inv.payment_date || inv.paid_date || inv.paid_at;
    if (!paymentDate || !inPeriod(paymentDate, periodStart, periodEnd)) continue;

    const items = inv.items || inv.line_items || [];
    for (const item of items) {
      const { includeVAT, includeSales } = classifyTaxType(item.tax_type || 'standard');
      const net = Number(item.net_amount ?? item.amount ?? 0);
      const vat = Number(item.vat_amount ?? item.tax ?? 0);

      if (includeSales) salesExVat += net;
      if (includeVAT) vatDue += vat;
    }

    if (items.length === 0) {
      const { includeVAT, includeSales } = classifyTaxType(inv.tax_type || 'standard');
      const net = Number(inv.net_amount ?? inv.subtotal ?? 0);
      const vat = Number(inv.vat_amount ?? inv.tax ?? 0);
      if (includeSales) salesExVat += net;
      if (includeVAT) vatDue += vat;
    }
  }

  return { vatDue, salesExVat };
}

function calcFlatRateBox1(invoices, periodStart, periodEnd, flatRatePct) {
  let grossTurnover = 0;
  let salesExVat = 0;

  for (const inv of invoices) {
    const taxPoint = inv.tax_point || inv.taxPoint || inv.issue_date || inv.date;
    if (!inPeriod(taxPoint, periodStart, periodEnd)) continue;

    const items = inv.items || inv.line_items || [];
    for (const item of items) {
      const { includeSales } = classifyTaxType(item.tax_type || 'standard');
      if (!includeSales) continue;
      const net = Number(item.net_amount ?? item.amount ?? 0);
      const vat = Number(item.vat_amount ?? item.tax ?? 0);
      salesExVat += net;
      grossTurnover += net + vat;
    }

    if (items.length === 0) {
      const { includeSales } = classifyTaxType(inv.tax_type || 'standard');
      if (includeSales) {
        const net = Number(inv.net_amount ?? inv.subtotal ?? 0);
        const vat = Number(inv.vat_amount ?? inv.tax ?? 0);
        salesExVat += net;
        grossTurnover += net + vat;
      }
    }
  }

  const vatDue = grossTurnover * (flatRatePct / 100);
  return { vatDue, salesExVat, grossTurnover };
}

// ---------------------------------------------------------------------------
// Input VAT (box4) calculators
// ---------------------------------------------------------------------------

function calcStandardBox4(bills, expenses, periodStart, periodEnd) {
  let vatReclaimed = 0;
  let purchasesExVat = 0;

  for (const bill of bills) {
    const dateField = bill.tax_point || bill.date || bill.issue_date;
    if (!inPeriod(dateField, periodStart, periodEnd)) continue;

    const net = Number(bill.net_amount ?? bill.subtotal ?? bill.amount ?? 0);
    const vat = Number(bill.vat_amount ?? bill.tax ?? 0);
    purchasesExVat += net;
    vatReclaimed += vat;
  }

  for (const exp of expenses) {
    const dateField = exp.date || exp.expense_date;
    if (!inPeriod(dateField, periodStart, periodEnd)) continue;

    const net = Number(exp.net_amount ?? exp.amount ?? 0);
    const vat = Number(exp.vat_amount ?? exp.tax ?? 0);
    purchasesExVat += net;
    vatReclaimed += vat;
  }

  return { vatReclaimed, purchasesExVat };
}

function calcCashBox4(bills, expenses, periodStart, periodEnd) {
  let vatReclaimed = 0;
  let purchasesExVat = 0;

  for (const bill of bills) {
    const paidDate = bill.paid_date || bill.payment_date || bill.paid_at;
    if (!paidDate || !inPeriod(paidDate, periodStart, periodEnd)) continue;

    const net = Number(bill.net_amount ?? bill.subtotal ?? bill.amount ?? 0);
    const vat = Number(bill.vat_amount ?? bill.tax ?? 0);
    purchasesExVat += net;
    vatReclaimed += vat;
  }

  for (const exp of expenses) {
    const paidDate = exp.paid_date || exp.payment_date || exp.paid_at;
    if (!paidDate || !inPeriod(paidDate, periodStart, periodEnd)) continue;

    const net = Number(exp.net_amount ?? exp.amount ?? 0);
    const vat = Number(exp.vat_amount ?? exp.tax ?? 0);
    purchasesExVat += net;
    vatReclaimed += vat;
  }

  return { vatReclaimed, purchasesExVat };
}

function calcFlatRateBox4(expenses, periodStart, periodEnd) {
  let vatReclaimed = 0;
  let purchasesExVat = 0;

  // Under FRS, only capital assets over £2,000 (inc VAT) qualify for input VAT recovery
  const CAPITAL_THRESHOLD = 2000;

  for (const exp of expenses) {
    const dateField = exp.date || exp.expense_date;
    if (!inPeriod(dateField, periodStart, periodEnd)) continue;

    const net = Number(exp.net_amount ?? exp.amount ?? 0);
    const vat = Number(exp.vat_amount ?? exp.tax ?? 0);
    purchasesExVat += net;

    if (exp.is_capital_asset && (net + vat) > CAPITAL_THRESHOLD) {
      vatReclaimed += vat;
    }
  }

  return { vatReclaimed, purchasesExVat };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Calculate the HMRC 9-box VAT return for a given period and scheme.
 *
 * @param {Array} invoices  - Sales invoices (with items/line_items, tax_point, payment_date, etc.)
 * @param {Array} bills     - Purchase bills
 * @param {Array} expenses  - Expenses
 * @param {{ periodStart: string, periodEnd: string }} period - YYYY-MM-DD bounds (inclusive)
 * @param {string} scheme   - One of: 'Standard', 'Cash Accounting', 'Flat Rate', 'Annual'
 * @param {{ flatRatePct?: number, box2?: number, box8?: number, box9?: number }} [options]
 * @returns {{ box1: number, box2: number, box3: number, box4: number, box5: number,
 *             box6: number, box7: number, box8: number, box9: number,
 *             flatRateTurnover: number|null, flatRatePct: number|null }}
 */
export function calculateVATReturn(invoices = [], bills = [], expenses = [], period = {}, scheme = 'Standard', options = {}) {
  const { periodStart, periodEnd } = period;
  const flatRatePct = Number(options.flatRatePct || 0);

  // --- Box 1 & Box 6 (output side) ---
  let box1Result;
  if (scheme === 'Flat Rate') {
    box1Result = calcFlatRateBox1(invoices, periodStart, periodEnd, flatRatePct);
  } else if (scheme === 'Cash Accounting') {
    box1Result = calcCashBox1(invoices, periodStart, periodEnd);
  } else {
    // Standard and Annual use the same logic (Annual = single annual period)
    box1Result = calcStandardBox1(invoices, periodStart, periodEnd);
  }

  // --- Box 4 & Box 7 (input side) ---
  let box4Result;
  if (scheme === 'Flat Rate') {
    box4Result = calcFlatRateBox4(expenses, periodStart, periodEnd);
  } else if (scheme === 'Cash Accounting') {
    box4Result = calcCashBox4(bills, expenses, periodStart, periodEnd);
  } else {
    box4Result = calcStandardBox4(bills, expenses, periodStart, periodEnd);
  }

  const box1 = round2(box1Result.vatDue);
  const box2 = round2(Number(options.box2 || 0));       // VAT due on acquisitions (manual / EC)
  const box3 = round2(box1 + box2);
  const box4 = round2(box4Result.vatReclaimed);
  const box5 = round2(box3 - box4);
  const box6 = round2(box1Result.salesExVat);
  const box7 = round2(box4Result.purchasesExVat);
  const box8 = round2(Number(options.box8 || 0));        // EU supplies (NI only)
  const box9 = round2(Number(options.box9 || 0));        // EU acquisitions (NI only)

  return {
    box1, box2, box3, box4, box5, box6, box7, box8, box9,
    flatRateTurnover: scheme === 'Flat Rate' ? round2(box1Result.grossTurnover || 0) : null,
    flatRatePct: scheme === 'Flat Rate' ? flatRatePct : null,
  };
}
