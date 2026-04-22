/**
 * computeSelfBilledInvoice — pure compute engine for self-billed invoices.
 * VAT is driven by the supplier's status/rate, never the buyer's. Tax point
 * follows HMRC's 14-day rule (VAT Notice 700/62). Reverse charge is only
 * legal when both parties are VAT registered and the invoice carries VAT;
 * for labour-only CIS suppliers it applies to the whole invoice, for mixed
 * supplies only to the CIS lines. Mirrors computeBillCis.js: returns a
 * fully-computed shape, never throws — validation failures are pushed to
 * errors/warnings arrays for per-field UI rendering.
 */

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const daysBetween = (a, b) => {
  const MS = 24 * 60 * 60 * 1000;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.round((ta - tb) / MS);
};

const CIS_RATE_MAP = { gross_0: 0, standard_20: 20, unverified_30: 30 };

export function computeSelfBilledInvoice(input) {
  // Deep-clone line items so callers' arrays/objects cannot be mutated.
  const lineItems = Array.isArray(input.lineItems)
    ? input.lineItems.map((li) => ({ ...li }))
    : [];

  const errors = [];
  const warnings = [];

  // Early exit on empty line items — still return a fully-shaped result.
  if (lineItems.length === 0) {
    errors.push({
      code: 'SB_NO_LINE_ITEMS',
      message: 'At least one line item is required.',
      field: 'lineItems',
    });
    return {
      netAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      cisDeduction: 0,
      amountPayable: 0,
      vatIncluded: false,
      taxPoint: input.issueDate || null,
      warnings,
      errors,
      breakdown: [],
      lineItemResults: [],
    };
  }

  // Resolve VAT inclusion from SUPPLIER status (never the buyer's).
  let vatIncluded = false;
  const vatStatus = input.supplierVatStatus;
  if (vatStatus === 'valid') {
    if (input.ourVatRegistered === true) {
      vatIncluded = true;
    } else {
      errors.push({
        code: 'SBA_VAT_MISMATCH',
        message: 'Both parties must be VAT-registered for a self-bill to include VAT.',
        field: 'ourVatRegistered',
      });
    }
  } else if (vatStatus === 'invalid') {
    errors.push({
      code: 'SUPPLIER_VAT_INVALID',
      message: 'Supplier VAT number failed HMRC verification.',
      field: 'supplierVatStatus',
    });
  } else if (vatStatus === 'deregistered') {
    errors.push({
      code: 'SUPPLIER_VAT_DEREGISTERED',
      message: 'Supplier has deregistered from VAT.',
      field: 'supplierVatStatus',
    });
  } else if (vatStatus === 'unchecked') {
    warnings.push({
      code: 'SUPPLIER_VAT_UNCHECKED',
      message: 'Supplier VAT status has not been verified.',
      field: 'supplierVatStatus',
    });
  }

  if (input.supplierVatStale === true) {
    warnings.push({
      code: 'SUPPLIER_VAT_STALE',
      message: 'Supplier VAT verification is out of date.',
      field: 'supplierVatStatus',
    });
  }

  // Tax point resolution — 14-day rule around supply date.
  const absDays = Math.abs(daysBetween(input.issueDate, input.supplyDate));
  const taxPoint = absDays <= 14 ? input.issueDate : input.supplyDate;

  if (absDays > 30) {
    warnings.push({
      code: 'SB_INVALID_DATE_RANGE',
      message: 'Supply date cannot be more than 30 days from issue date.',
      field: 'supplyDate',
    });
  }

  // Reverse charge only meaningful when VAT would otherwise apply.
  const rcEligible =
    input.applyReverseCharge === true &&
    vatIncluded &&
    input.ourVatRegistered === true;

  // CIS config.
  const cisActive = input.supplierCisRate != null;
  const cisPct = cisActive ? CIS_RATE_MAP[input.supplierCisRate] ?? 0 : 0;

  const lineItemResults = [];
  const breakdownMap = new Map(); // key = supplier tax rate (number)

  lineItems.forEach((li, index) => {
    const qty = Number(li.quantity) || 0;
    const rate = Number(li.rate) || 0;
    const supplierRate = Number(li.taxRate) || 0;
    const lineNet = round2(qty * rate);

    // RC scope: labour-only → CIS lines only; else → whole invoice.
    const rcAppliesToLine =
      rcEligible &&
      (input.supplierCisLabourOnly === true ? li.cisApplicable === true : true);

    const lineTax =
      vatIncluded && !rcAppliesToLine ? round2((lineNet * supplierRate) / 100) : 0;

    // Per-line CIS split (same pattern as computeBillCis at bill level):
    // cisApplicable=true → labour; cisApplicable=false → materials.
    const lineIsCisLabour = cisActive && li.cisApplicable === true;
    const lineCisLabour = lineIsCisLabour ? lineNet : 0;
    const lineCisMaterials =
      cisActive && li.cisApplicable === false ? lineNet : 0;

    lineItemResults.push({
      index,
      lineNet,
      lineTax,
      lineCisLabour,
      lineCisMaterials,
    });

    if (vatIncluded) {
      const bucket = breakdownMap.get(supplierRate) || {
        taxableAmount: 0,
        taxAmount: 0,
      };
      bucket.taxableAmount = round2(bucket.taxableAmount + lineNet);
      bucket.taxAmount = round2(bucket.taxAmount + lineTax);
      breakdownMap.set(supplierRate, bucket);
    }
  });

  const netAmount = round2(lineItemResults.reduce((s, l) => s + l.lineNet, 0));
  const taxAmount = round2(lineItemResults.reduce((s, l) => s + l.lineTax, 0));
  const totalAmount = round2(netAmount + taxAmount);

  const totalLabour = lineItemResults.reduce((s, l) => s + l.lineCisLabour, 0);
  const cisDeduction = cisActive ? round2((totalLabour * cisPct) / 100) : 0;
  const amountPayable = round2(totalAmount - cisDeduction);

  const breakdown = Array.from(breakdownMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rate, v]) => ({
      rate,
      taxableAmount: round2(v.taxableAmount),
      taxAmount: round2(v.taxAmount),
    }));

  return {
    netAmount,
    taxAmount,
    totalAmount,
    cisDeduction,
    amountPayable,
    vatIncluded,
    taxPoint,
    warnings,
    errors,
    breakdown,
    lineItemResults,
  };
}