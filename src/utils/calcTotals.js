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
        const r = Number(it.tax_rate || 0); if (!r) return acc;
        if (!acc[r]) acc[r] = { rate: r, amount: 0 };
        const base = Number(it.amount || 0) - (subtotal > 0 ? discAmt * (Number(it.amount || 0) / subtotal) : 0);
        acc[r].amount += base * (r / 100);
        return acc;
      }, {}))
    : [];
  const vatTotal = taxBreakdown.reduce((s, t) => s + t.amount, 0);
  const gross = afterDisc + ship + vatTotal;
  const customerCIS = customer?.cis || {
    registered: !!customer?.taxDetails?.cisRegistered,
    rateValue: parseCisRate(customer?.taxDetails?.cisRate, cisDefaultRate),
    rate: customer?.taxDetails?.cisRate,
  };
  const hasCISItems = cisEnabled && customerCIS?.registered && items.some(i => i?.cis?.enabled || i?.cisApplicable);
  // Guard: if subtotal is 0 there is no discount base to apportion
  const cisDiscAmt = subtotal === 0 ? 0 : discAmt;
  const cisDed = hasCISItems
    ? items.reduce((sum, item) => {
        if (!item?.cis?.enabled && !item?.cisApplicable) return sum;
        const qty = Number(item.quantity ?? item.qty) || 1;
        const lineGross = Number(item.amount) || ((Number(item.rate) || 0) * qty);
        // Apply proportional discount to this line
        const lineNet = subtotal > 0 ? lineGross * (1 - cisDiscAmt / subtotal) : lineGross;
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
