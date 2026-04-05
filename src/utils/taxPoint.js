/**
 * Calculates the HMRC tax point (time of supply) for a UK invoice.
 *
 * Rules (VAT Act 1994, s.6):
 * - Basic tax point = supply date (date goods delivered / services performed)
 * - If invoice issued within 14 days of basic tax point → actual tax point = invoice date
 * - If payment received before basic tax point → tax point = payment date
 *
 * @param {string} issueDate - Invoice issue date (YYYY-MM-DD)
 * @param {string} supplyDate - Date of supply (YYYY-MM-DD)
 * @param {string|null} earlyPaymentDate - Date payment received before supply (YYYY-MM-DD), if any
 * @returns {{ taxPoint: string, rule: string }}
 */
export function calculateTaxPoint(issueDate, supplyDate, earlyPaymentDate = null) {
  if (!issueDate || !supplyDate) {
    return { taxPoint: issueDate || supplyDate || '', rule: 'incomplete' };
  }

  const issue = new Date(issueDate);
  const supply = new Date(supplyDate);

  // Rule 1: If payment received before supply → tax point = payment date
  if (earlyPaymentDate) {
    const payment = new Date(earlyPaymentDate);
    if (payment < supply) {
      return { taxPoint: earlyPaymentDate, rule: 'early_payment' };
    }
  }

  // Rule 2: If invoice issued within 14 days of supply → tax point = invoice date
  const daysDiff = Math.floor((issue - supply) / (1000 * 60 * 60 * 24));
  if (daysDiff >= 0 && daysDiff <= 14) {
    return { taxPoint: issueDate, rule: '14_day_rule' };
  }

  // Default: Basic tax point = supply date
  return { taxPoint: supplyDate, rule: 'basic' };
}

/** Human-readable explanation of the tax point rule applied */
export function taxPointExplanation(rule) {
  switch (rule) {
    case '14_day_rule': return 'Invoice issued within 14 days of supply — tax point is invoice date';
    case 'early_payment': return 'Payment received before supply — tax point is payment date';
    case 'basic': return 'Basic tax point — date of supply';
    default: return '';
  }
}
