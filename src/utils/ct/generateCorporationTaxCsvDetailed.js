/**
 * generateCorporationTaxCsvDetailed — multi-section, human-readable CSV of a
 * CT period.
 *
 * Mirrors the layout of the PDF (period meta → computation → tax → notes), so
 * accountants who prefer CSV get the same structure. Section headers are on
 * their own line in UPPERCASE, separated by blank lines. UTF-8 BOM prepended
 * for Excel.
 *
 * Pure builder — no side effects, same input shape as the flat variant.
 */

const MARGINAL_WARNING =
  "Marginal relief is not calculated in Phase 1. CT estimated at the full " +
  "main rate (25%); your actual liability may be lower.";

/**
 * RFC 4180 escape (same rules as the flat variant): wrap in double quotes if
 * the cell contains a comma, a double quote, or a newline; double up any
 * internal double quotes.
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
  return String(d).slice(0, 10);
}

function csvDecimal(n) {
  if (n == null || n === "") return "";
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2);
}

function signedDecimal(n, sign) {
  const v = csvDecimal(n);
  if (v === "") return "";
  return `${sign}${v}`;
}

function row(label, value) {
  return `${csvCell(label)},${csvCell(value)}`;
}

/**
 * Build a multi-section CSV summary of a CT period.
 *
 * @param {Object} period - row from corporation_tax_periods. Same fields as
 *   the flat variant; additionally uses payment_due_date / filing_due_date
 *   in the PERIOD section.
 * @returns {Blob} CSV blob (text/csv; charset=utf-8) with leading UTF-8 BOM.
 */
export function generateCorporationTaxCsvDetailed(period) {
  const lines = [];

  lines.push("INVOICESAGA CT600 ESTIMATE");
  lines.push("This is an estimate only — not a CT600 tax return");
  lines.push("");

  lines.push("PERIOD");
  lines.push(row("Start", csvDate(period?.period_start)));
  lines.push(row("End", csvDate(period?.period_end)));
  lines.push(row("Payment due", csvDate(period?.payment_due_date)));
  lines.push(row("Filing due", csvDate(period?.filing_due_date)));
  lines.push("");

  lines.push("COMPUTATION");
  lines.push(row("Accounting profit", csvDecimal(period?.accounting_profit)));
  lines.push(row("Disallowable expenses", signedDecimal(period?.disallowable_expenses, "+")));
  lines.push(row("Capital allowances", signedDecimal(period?.capital_allowances, "-")));
  lines.push(row("Other adjustments", signedDecimal(period?.other_adjustments, "+")));
  const associatedCount = Number(period?.associated_companies_count) || 0;
  if (associatedCount > 0) {
    lines.push(row("Associated companies", String(associatedCount)));
  }
  const augmentedAdj = Number(period?.augmented_profits_adjustment) || 0;
  if (augmentedAdj > 0) {
    lines.push(row("Augmented profits adjustment", signedDecimal(augmentedAdj, "+")));
  }
  lines.push(row("Tax-adjusted profit", csvDecimal(period?.tax_adjusted_profit)));
  lines.push("");

  lines.push("TAX");
  const rate = period?.ct_rate_applied;
  lines.push(row("Rate applied", rate == null || rate === "" ? "" : `${Number(rate)}%`));
  lines.push(row(
    "Rate bracket",
    period?.rate_bracket ? String(period.rate_bracket).toLowerCase() : "",
  ));
  lines.push(row("CT estimated", csvDecimal(period?.ct_estimated)));
  const marginalRelief = Number(period?.marginal_relief) || 0;
  if (marginalRelief > 0) {
    lines.push(row("Marginal relief", signedDecimal(marginalRelief, "-")));
  }
  if (period?.rate_bracket === "marginal_zone") {
    lines.push(row("Warning", MARGINAL_WARNING));
  }
  lines.push("");

  lines.push("NOTES");
  lines.push(csvCell(period?.adjustments_notes || "None"));

  const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}
