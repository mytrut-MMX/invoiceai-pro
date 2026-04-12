/**
 * computeBillCis — single source of truth for CIS deduction, DRC VAT, totals,
 * and bill_type classification on supplier bills.
 *
 * This helper is pure: it has zero imports, zero side effects, and no coupling
 * to React, Supabase, or any UI layer. It is consumed by:
 *   - BillFormPanel.jsx            (live totals while editing a bill)
 *   - the bulk bill import flow    (batch classification)
 *   - future CIS300 submission     (monthly subcontractor return aggregation)
 *
 * Why DRC (Domestic Reverse Charge) requires vatRegistered:
 *   Under HMRC rules, only VAT-registered buyers can self-account for VAT on a
 *   reverse-charge supply. If the caller's org is not VAT-registered, we fall
 *   back to treating the bill as standard (non-DRC), because the buyer has no
 *   VAT return in which to report the reverse charge. In that scenario the
 *   supplier should not have issued a DRC invoice in the first place, but we
 *   degrade gracefully rather than producing nonsensical tax amounts.
 *
 * CIS deduction formula:
 *   cisDeduction = cisPct × labour (ex-VAT)
 *   - NEVER applied to materials
 *   - NEVER applied to VAT
 *   - Rate is resolved from cisRate: gross_0 → 0%, standard_20 → 20%,
 *     unverified_30 → 30%. Unknown rates degrade to 0% but the bill is still
 *     classified as CIS for reporting.
 *
 * Migration 026 column mapping (bills table):
 *   labour_amount              ← labourAmount
 *   materials_amount           ← materialsAmount
 *   cis_deduction              ← cisDeduction
 *   reverse_charge_vat_amount  ← reverseChargeVatAmount
 *   bill_type                  ← billType ('standard' | 'cis' | 'reverse_charge' | 'cis_reverse_charge')
 *
 * postBillEntry.js mapping:
 *   The returned billType directly selects one of the four dispatch cases in
 *   postBillEntry — standard AP, CIS-with-withholding, DRC self-account, or
 *   combined CIS+DRC. The amount fields returned here (netAmount, taxAmount,
 *   reverseChargeVatAmount, cisDeduction, total, amountPayable) are the exact
 *   inputs those ledger postings expect.
 */

/**
 * Compute CIS deduction, DRC VAT, totals, and bill_type classification
 * for a bill given its inputs.
 *
 * @param {object} params
 * @param {number} params.labourAmount     - gross labour component (net of VAT)
 * @param {number} params.materialsAmount  - gross materials component (net of VAT)
 * @param {number} params.taxRate          - VAT rate as percentage (0, 5, 20)
 * @param {string|null} params.cisRate     - 'gross_0' | 'standard_20' | 'unverified_30' | null
 *                                            Pass null if supplier is not CIS.
 * @param {boolean} params.isReverseCharge - true if DRC applies (VAT reverse charge)
 * @param {boolean} params.vatRegistered   - caller's org VAT registration status
 *
 * @returns {{
 *   labourAmount: number,
 *   materialsAmount: number,
 *   netAmount: number,
 *   taxAmount: number,
 *   reverseChargeVatAmount: number,
 *   cisDeduction: number,
 *   total: number,
 *   amountPayable: number,
 *   billType: 'standard' | 'cis' | 'reverse_charge' | 'cis_reverse_charge',
 * }}
 */
export function computeBillCis({ labourAmount, materialsAmount, taxRate, cisRate, isReverseCharge, vatRegistered }) {
  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

  // Coerce inputs — strings from form fields, nulls, undefined
  const labour    = Math.max(0, Number(labourAmount) || 0);
  const materials = Math.max(0, Number(materialsAmount) || 0);
  const rate      = Math.max(0, Number(taxRate) || 0);
  const isCis     = cisRate != null && cisRate !== '';
  const vatReg    = !!vatRegistered;
  const drc       = !!isReverseCharge;

  const netAmount = round2(labour + materials);

  // VAT handling
  // - DRC: supplier charges ZERO VAT on the invoice. We self-account both input
  //   and output VAT at the same amount for VAT return purposes.
  // - Non-DRC: supplier charges VAT at taxRate on the NET amount.
  // - If org is not VAT registered, we still record supplier-charged VAT as a
  //   cost but don't compute DRC (buyer-side DRC requires VAT registration).

  let taxAmount = 0;
  let reverseChargeVatAmount = 0;

  if (drc && vatReg) {
    // DRC: zero on-invoice VAT, separate tracked reverse charge amount
    taxAmount = 0;
    reverseChargeVatAmount = round2(netAmount * rate / 100);
  } else {
    // Standard VAT charged on invoice
    taxAmount = round2(netAmount * rate / 100);
    reverseChargeVatAmount = 0;
  }

  // CIS deduction: applied ONLY to labour, ONLY from net (pre-VAT) amount
  // HMRC rule: deduction is computed on labour excluding VAT.
  const cisRateMap = { gross_0: 0, standard_20: 20, unverified_30: 30 };
  const cisPct = isCis ? (cisRateMap[cisRate] ?? 0) : 0;
  const cisDeduction = isCis ? round2(labour * cisPct / 100) : 0;

  const total = round2(netAmount + taxAmount);
  const amountPayable = round2(total - cisDeduction);

  // Classify bill_type for postBillEntry dispatch
  let billType;
  if (isCis && drc && vatReg)        billType = 'cis_reverse_charge';
  else if (isCis)                     billType = 'cis';
  else if (drc && vatReg)             billType = 'reverse_charge';
  else                                billType = 'standard';

  return {
    labourAmount: round2(labour),
    materialsAmount: round2(materials),
    netAmount,
    taxAmount,
    reverseChargeVatAmount,
    cisDeduction,
    total,
    amountPayable,
    billType,
  };
}
