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

import { SA_CATEGORY_MAP, SA_CATEGORY_LABELS, mapExpenseToHMRC } from './hmrcCategoryMap.js';

// Re-export for consumers that imported from here previously
export { SA_CATEGORY_LABELS as SA_BOX_LABELS };

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

    const { hmrcCode } = mapExpenseToHMRC(exp);
    breakdown[hmrcCode] = (breakdown[hmrcCode] || 0) + amount;
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

    const { hmrcCode } = mapExpenseToHMRC(exp);
    breakdown[hmrcCode] = (breakdown[hmrcCode] || 0) + amount;
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
