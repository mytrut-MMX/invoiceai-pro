/**
 * ITSA (Income Tax Self Assessment) quarterly update calculation engine.
 *
 * Calculates income, expenses, and profit for an ITSA quarter,
 * mapping expense categories to HMRC Self Assessment boxes.
 *
 * Supports both Cash and Accrual accounting bases:
 *   - Cash:    income = payments received in period; expenses = paid in period
 *   - Accrual: income = invoices issued in period; expenses = incurred in period
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round half-away-from-zero to 2 decimal places. */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** True when `dateStr` (YYYY-MM-DD or ISO) falls within [start, end] inclusive. */
function inPeriod(dateStr, periodStart, periodEnd) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= periodStart && d <= periodEnd;
}

// ---------------------------------------------------------------------------
// HMRC SA box mapping for self-employment (SE) expenses
// ---------------------------------------------------------------------------

/**
 * Maps InvoiceSaga expense category codes to HMRC Self Assessment
 * self-employment supplementary page (SA103S) expense categories.
 *
 * SA103S boxes:
 *   costOfGoods          – Box 10: Cost of goods bought for resale
 *   constructionCosts    – Box 11: Construction industry subcontractor costs
 *   staffCosts           – Box 12: Wages, salaries, other staff costs
 *   premisesCosts        – Box 13: Car, van, travel expenses
 *   repairsAndMaintenance– Box 14: Rent, rates, power, insurance
 *   generalAdmin         – Box 15: Repairs and maintenance
 *   advertising          – Box 16: Phone, fax, stationery, other office costs
 *   entertainment        – Box 17: Advertising and business entertainment
 *   interest             – Box 18: Interest on bank/other loans
 *   otherExpenses        – Box 19: Other allowable business expenses
 */
const SA_BOX_MAP = {
  '100': 'advertising',          // Advertising
  '110': 'travelAndMotor',       // Automobile
  '404': 'generalAdmin',         // Bank Charges
  '420': 'advertising',          // Client Entertainment (SA groups with advertising)
  '300': 'otherExpenses',        // Equipment (capital → AIA; revenue → other)
  '430': 'travelAndMotor',       // Fuel
  '440': 'premisesCosts',        // Insurance
  '460': 'generalAdmin',         // IT & Software
  '261': 'travelAndMotor',       // Meals & Subsistence
  '480': 'generalAdmin',         // Office Supplies
  '490': 'generalAdmin',         // Postage & Courier
  '500': 'otherExpenses',        // Professional Services
  '510': 'premisesCosts',        // Rent & Rates
  '520': 'repairsAndMaintenance',// Repairs & Maintenance
  '530': 'generalAdmin',         // Stationery
  '315': 'constructionCosts',    // Subcontractor Labour
  '316': 'constructionCosts',    // Subcontractor Materials
  '540': 'generalAdmin',         // Subscriptions
  '550': 'travelAndMotor',       // Travel
  '560': 'premisesCosts',        // Utilities
  '570': 'staffCosts',           // Wages & Salaries
  '999': 'otherExpenses',        // Other
};

/** Human-readable labels for each SA box key. */
export const SA_BOX_LABELS = {
  costOfGoods:           'Cost of goods bought for resale',
  constructionCosts:     'Construction industry subcontractor costs',
  staffCosts:            'Wages, salaries & other staff costs',
  travelAndMotor:        'Car, van & travel expenses',
  premisesCosts:         'Rent, rates, power & insurance',
  repairsAndMaintenance: 'Repairs & maintenance of property and equipment',
  generalAdmin:          'Phone, fax, stationery & other office costs',
  advertising:           'Advertising & business entertainment',
  interest:              'Interest on bank & other loans',
  otherExpenses:         'Other allowable business expenses',
};

// ---------------------------------------------------------------------------
// Income calculators
// ---------------------------------------------------------------------------

function calcCashIncome(invoices, payments, periodStart, periodEnd) {
  let totalIncome = 0;

  // Prefer explicit payments array if provided
  if (payments && payments.length > 0) {
    for (const pmt of payments) {
      const pmtDate = pmt.payment_date || pmt.date || pmt.paid_at;
      if (!inPeriod(pmtDate, periodStart, periodEnd)) continue;
      totalIncome += Number(pmt.amount || 0);
    }
    return totalIncome;
  }

  // Fallback: invoices with a payment/paid date in period
  for (const inv of invoices) {
    const paidDate = inv.payment_date || inv.paid_date || inv.paid_at;
    if (!paidDate || !inPeriod(paidDate, periodStart, periodEnd)) continue;
    totalIncome += Number(inv.net_amount ?? inv.subtotal ?? inv.amount ?? 0);
  }
  return totalIncome;
}

function calcAccrualIncome(invoices, periodStart, periodEnd) {
  let totalIncome = 0;

  for (const inv of invoices) {
    const issueDate = inv.issue_date || inv.date || inv.tax_point;
    if (!inPeriod(issueDate, periodStart, periodEnd)) continue;
    totalIncome += Number(inv.net_amount ?? inv.subtotal ?? inv.amount ?? 0);
  }
  return totalIncome;
}

// ---------------------------------------------------------------------------
// Expense calculators
// ---------------------------------------------------------------------------

function calcCashExpenses(expenses, periodStart, periodEnd) {
  let totalExpenses = 0;
  const breakdown = {};

  for (const exp of expenses) {
    const paidDate = exp.paid_date || exp.payment_date || exp.paid_at || exp.date;
    if (!inPeriod(paidDate, periodStart, periodEnd)) continue;

    const amount = Number(exp.amount || 0);
    totalExpenses += amount;

    const categoryCode = exp.category_code || exp.code || '';
    const saBox = SA_BOX_MAP[categoryCode] || 'otherExpenses';
    breakdown[saBox] = (breakdown[saBox] || 0) + amount;
  }

  return { totalExpenses, breakdown };
}

function calcAccrualExpenses(expenses, periodStart, periodEnd) {
  let totalExpenses = 0;
  const breakdown = {};

  for (const exp of expenses) {
    const dateField = exp.date || exp.expense_date || exp.issue_date;
    if (!inPeriod(dateField, periodStart, periodEnd)) continue;

    const amount = Number(exp.amount || 0);
    totalExpenses += amount;

    const categoryCode = exp.category_code || exp.code || '';
    const saBox = SA_BOX_MAP[categoryCode] || 'otherExpenses';
    breakdown[saBox] = (breakdown[saBox] || 0) + amount;
  }

  return { totalExpenses, breakdown };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Calculate ITSA quarterly update figures for a given period.
 *
 * @param {Array} invoices  - Sales invoices (with issue_date, payment_date, net_amount, etc.)
 * @param {Array} expenses  - Business expenses (with date, amount, category_code, etc.)
 * @param {Array} payments  - Payment records (optional, used in cash basis for income)
 * @param {{ periodStart: string, periodEnd: string }} period - YYYY-MM-DD bounds (inclusive)
 * @param {string} basis    - 'cash' or 'accrual'
 * @returns {{
 *   totalIncome: number,
 *   totalExpenses: number,
 *   profit: number,
 *   expenseBreakdown: Record<string, number>
 * }}
 */
export function calculateITSAQuarter(invoices = [], expenses = [], payments = [], period = {}, basis = 'cash') {
  const { periodStart, periodEnd } = period;

  // --- Income ---
  const totalIncome = round2(
    basis === 'cash'
      ? calcCashIncome(invoices, payments, periodStart, periodEnd)
      : calcAccrualIncome(invoices, periodStart, periodEnd)
  );

  // --- Expenses ---
  const { totalExpenses: rawExpenses, breakdown: rawBreakdown } =
    basis === 'cash'
      ? calcCashExpenses(expenses, periodStart, periodEnd)
      : calcAccrualExpenses(expenses, periodStart, periodEnd);

  const totalExpenses = round2(rawExpenses);

  // Round each breakdown category
  const expenseBreakdown = {};
  for (const [key, val] of Object.entries(rawBreakdown)) {
    expenseBreakdown[key] = round2(val);
  }

  const profit = round2(totalIncome - totalExpenses);

  return { totalIncome, totalExpenses, profit, expenseBreakdown };
}

// ---------------------------------------------------------------------------
// ITSA period generation helpers
// ---------------------------------------------------------------------------

/**
 * Generate ITSA quarterly periods for a given tax year.
 *
 * @param {string} taxYear - e.g. '2026-27'
 * @returns {Array<{ quarter: string, taxYear: string, periodStart: string, periodEnd: string, submissionDeadline: string, label: string }>}
 */
export function generateITSAPeriods(taxYear) {
  const startYear = parseInt(taxYear.split('-')[0], 10);
  if (isNaN(startYear)) return [];

  const endYear = startYear + 1;

  return [
    {
      quarter: 'Q1', taxYear,
      periodStart: `${startYear}-04-06`, periodEnd: `${startYear}-07-05`,
      submissionDeadline: `${startYear}-08-05`,
      label: `Q1: 6 Apr ${startYear} – 5 Jul ${startYear}`,
    },
    {
      quarter: 'Q2', taxYear,
      periodStart: `${startYear}-07-06`, periodEnd: `${startYear}-10-05`,
      submissionDeadline: `${startYear}-11-05`,
      label: `Q2: 6 Jul ${startYear} – 5 Oct ${startYear}`,
    },
    {
      quarter: 'Q3', taxYear,
      periodStart: `${startYear}-10-06`, periodEnd: `${endYear}-01-05`,
      submissionDeadline: `${endYear}-02-05`,
      label: `Q3: 6 Oct ${startYear} – 5 Jan ${endYear}`,
    },
    {
      quarter: 'Q4', taxYear,
      periodStart: `${endYear}-01-06`, periodEnd: `${endYear}-04-05`,
      submissionDeadline: `${endYear}-05-05`,
      label: `Q4: 6 Jan ${endYear} – 5 Apr ${endYear}`,
    },
  ];
}

/**
 * Generate available ITSA tax year strings for a range of years.
 *
 * @param {number} [yearsBack=2]
 * @returns {string[]} e.g. ['2026-27', '2025-26', '2024-25']
 */
export function getITSATaxYears(yearsBack = 2) {
  const now = new Date();
  // Tax year starts 6 Apr: before 6 Apr we're in previous tax year
  const currentYear = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const currentTaxYearStart = (month > 4 || (month === 4 && day >= 6)) ? currentYear : currentYear - 1;

  const years = [];
  for (let y = currentTaxYearStart; y >= currentTaxYearStart - yearsBack; y--) {
    const short = String(y + 1).slice(2);
    years.push(`${y}-${short}`);
  }
  return years;
}
