import { parseCisRate } from "./helpers";

export function calcTotals(items, discType, discVal, shipping, isVat, customer, cisEnabled, cisDefaultRate, isEstimate = false) {
  const subtotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const discAmt = discType === "percent"
    ? subtotal * (Number(discVal) / 100)
    : Math.min(Number(discVal) || 0, subtotal);
  const afterDisc = subtotal - discAmt;
  const ship = Number(shipping) || 0;
  const taxBreakdown = isVat
    ? Object.values(items.reduce((acc, it) => {
        const taxType = it.tax_type || 'standard';
        // Exempt and outside-scope items are excluded from VAT breakdown entirely
        if (taxType === 'exempt' || taxType === 'outside_scope') return acc;
        const r = Number(it.tax_rate || 0);
        // Zero-rated items appear in breakdown (with £0) but non-zero standard/reduced are grouped by rate
        const key = taxType === 'zero_rated' ? '0_zero_rated' : String(r);
        if (!r && taxType !== 'zero_rated') return acc;
        if (!acc[key]) acc[key] = { rate: r, amount: 0, type: taxType };
        const base = Number(it.amount || 0) - (subtotal > 0 ? discAmt * (Number(it.amount || 0) / subtotal) : 0);
        acc[key].amount += base * (r / 100);
        return acc;
      }, {}))
    : [];
  const vatTotal = taxBreakdown.reduce((s, t) => s + t.amount, 0);
  const gross = afterDisc + ship + vatTotal;
  const customerCIS = {
    registered: customer?.cis?.registered ?? !!customer?.taxDetails?.cisRegistered,
    rateValue: customer?.cis?.rateValue
      ?? parseCisRate(customer?.cis?.rate ?? customer?.taxDetails?.cisRate, cisDefaultRate),
    rate: customer?.cis?.rate ?? customer?.taxDetails?.cisRate,
  };
  const hasCISItems = cisEnabled && customerCIS?.registered && items.some(i => i?.cis?.enabled || i?.cisApplicable);
  const cisDed = hasCISItems
    ? items.reduce((sum, item) => {
        if (!item?.cis?.enabled && !item?.cisApplicable) return sum;
        const qty = Number(item.quantity ?? item.qty) || 1;
        const lineGross = Number(item.amount) || ((Number(item.rate) || 0) * qty);
        // Aplică reducerea proporțională a discount-ului pe această linie
        const lineNet = subtotal > 0
          ? lineGross - (lineGross / subtotal) * discAmt
          : lineGross;
        const labourShare = item?.cis?.labour ?? (item?.cisApplicable ? 100 : 0);
        const labourAmount = lineNet * (labourShare / 100);
        const rateValue = customerCIS?.rateValue ?? 20;
        return sum + (labourAmount * rateValue / 100);
      }, 0)
    : 0;

  if (isEstimate) {
    return { subtotal, discountAmount: discAmt, shipping: ship, taxBreakdown, cisDeduction: 0, cisEstimate: cisDed, hasCISItems, customerCIS, total: gross, grossTotal: gross };
  }
  return { subtotal, discountAmount: discAmt, shipping: ship, taxBreakdown, cisDeduction: cisDed, hasCISItems, customerCIS, total: gross - cisDed, grossTotal: gross };
}
