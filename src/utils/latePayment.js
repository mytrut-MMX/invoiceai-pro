/**
 * UK Late Payment of Commercial Debts (Interest) Act 1998
 * Calculator for statutory interest and fixed compensation.
 *
 * APPLIES ONLY TO B2B TRANSACTIONS.
 */

// Bank of England base rate — update periodically
// TODO: Fetch via API (https://www.bankofengland.co.uk/boeapps/database/)
const BOE_BASE_RATE = 4.5; // As of April 2026 — verify current rate
const STATUTORY_RATE = 8; // Fixed by the Act
const ANNUAL_RATE = BOE_BASE_RATE + STATUTORY_RATE; // e.g. 12.5%

/**
 * Calculate statutory interest on an overdue invoice.
 * @param {number} invoiceAmount - Original invoice amount (gross)
 * @param {string} dueDate - Due date (YYYY-MM-DD)
 * @param {string} [calcDate] - Date to calculate to (default: today)
 * @returns {{ dailyRate: number, daysOverdue: number, interest: number, annualRate: number }}
 */
export function calculateStatutoryInterest(invoiceAmount, dueDate, calcDate = null) {
  const due = new Date(dueDate);
  const calc = calcDate ? new Date(calcDate) : new Date();

  const daysOverdue = Math.max(0, Math.floor((calc - due) / (1000 * 60 * 60 * 24)));
  const dailyRate = (invoiceAmount * ANNUAL_RATE / 100) / 365;
  const interest = dailyRate * daysOverdue;

  return {
    dailyRate: Math.round(dailyRate * 1000) / 1000,
    daysOverdue,
    interest: Math.round(interest * 100) / 100,
    annualRate: ANNUAL_RATE,
  };
}

/**
 * Get fixed compensation tier for a late payment.
 * @param {number} invoiceAmount
 * @returns {number} Fixed compensation amount in GBP
 */
export function getFixedCompensation(invoiceAmount) {
  if (invoiceAmount < 1000) return 40;
  if (invoiceAmount < 10000) return 70;
  return 100;
}

/**
 * Full late payment calculation for an overdue B2B invoice.
 * @param {object} invoice - { total, due_date, status }
 * @returns {{ eligible: boolean, daysOverdue: number, interest: number, compensation: number, totalClaim: number, dailyRate: number, annualRate: number, legalBasis: string }}
 */
export function calculateLatePaymentClaim(invoice) {
  if (!invoice.due_date || invoice.status === "Paid" || invoice.status === "Void") {
    return { eligible: false, daysOverdue: 0, interest: 0, compensation: 0, totalClaim: 0 };
  }

  const due = new Date(invoice.due_date);
  const today = new Date();

  if (today <= due) {
    return { eligible: false, daysOverdue: 0, interest: 0, compensation: 0, totalClaim: 0 };
  }

  const amount = Number(invoice.total || 0);
  const { dailyRate, daysOverdue, interest, annualRate } = calculateStatutoryInterest(amount, invoice.due_date);
  const compensation = getFixedCompensation(amount);
  const totalClaim = Math.round((interest + compensation) * 100) / 100;

  return {
    eligible: true,
    daysOverdue,
    interest,
    compensation,
    totalClaim,
    dailyRate,
    annualRate,
    legalBasis: "Late Payment of Commercial Debts (Interest) Act 1998",
  };
}

export { BOE_BASE_RATE, STATUTORY_RATE, ANNUAL_RATE };
