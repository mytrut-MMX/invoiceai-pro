/**
 * generateCorporationTaxCsvFlat — single-row CSV summary of a CT period.
 *
 * Intended for accountant import into Excel / Sheets / accounting software.
 * One header row + one data row; no formatting, no symbols. RFC 4180 quoting.
 * UTF-8 BOM prepended so Excel detects the encoding correctly (£ symbols in
 * notes etc. would otherwise mojibake).
 *
 * Companion of generateCorporationTaxPdf — same input shape (the period row
 * as persisted in `corporation_tax_periods`); pure builder, no side effects.
 */

const COLUMNS = [
  "period_start",
  "period_end",
  "accounting_profit",
  "disallowable_expenses",
  "capital_allowances",
  "other_adjustments",
  "associated_companies_count",
  "augmented_profits_adjustment",
  "loss_carried_forward_in",
  "loss_used",
  "loss_unused",
  "tax_adjusted_profit",
  "ct_rate_applied",
  "ct_estimated",
  "marginal_relief",
  "rate_bracket",
  "notes",
];

/**
 * RFC 4180 escape: wrap in double quotes if the cell contains a comma, a
 * double quote, or a newline; double up any internal double quotes.
 */
function csvCell(value) {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvDate(d) {
  if (!d) return "";
  // Period dates are stored as YYYY-MM-DD; pass through, defensively slicing
  // ISO timestamps back to the date portion.
  return String(d).slice(0, 10);
}

function csvDecimal(n) {
  if (n == null || n === "") return "";
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2);
}

function csvRate(n) {
  if (n == null || n === "") return "";
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  return String(num);
}

function csvInt(n) {
  if (n == null || n === "") return "";
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  return String(Math.trunc(num));
}

/**
 * Build a single-row CSV summary of a CT period.
 *
 * @param {Object} period - row from corporation_tax_periods. Must include:
 *   period_start, period_end, accounting_profit, disallowable_expenses,
 *   capital_allowances, other_adjustments, tax_adjusted_profit,
 *   ct_rate_applied, ct_estimated, rate_bracket, adjustments_notes.
 * @returns {Blob} CSV blob (text/csv; charset=utf-8) with leading UTF-8 BOM.
 */
export function generateCorporationTaxCsvFlat(period) {
  const lossInRaw = period?.loss_carried_forward_in;
  const hasLoss = lossInRaw != null && lossInRaw !== "";
  const lossIn = Number(lossInRaw) || 0;
  const taxAdjProfit = Number(period?.tax_adjusted_profit) || 0;
  const lossUsed = lossIn > 0 && taxAdjProfit > 0 ? Math.min(lossIn, taxAdjProfit) : 0;
  const lossUnused = Math.max(0, lossIn - lossUsed);

  const row = [
    csvDate(period?.period_start),
    csvDate(period?.period_end),
    csvDecimal(period?.accounting_profit),
    csvDecimal(period?.disallowable_expenses),
    csvDecimal(period?.capital_allowances),
    csvDecimal(period?.other_adjustments),
    csvInt(period?.associated_companies_count),
    csvDecimal(period?.augmented_profits_adjustment),
    hasLoss ? csvDecimal(lossIn) : "",
    hasLoss ? csvDecimal(lossUsed) : "",
    hasLoss ? csvDecimal(lossUnused) : "",
    csvDecimal(period?.tax_adjusted_profit),
    csvRate(period?.ct_rate_applied),
    csvDecimal(period?.ct_estimated),
    csvDecimal(period?.marginal_relief),
    period?.rate_bracket ? String(period.rate_bracket).toLowerCase() : "",
    period?.adjustments_notes || "",
  ].map(csvCell);

  const csv =
    "\uFEFF" +
    COLUMNS.join(",") +
    "\r\n" +
    row.join(",") +
    "\r\n";

  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}
