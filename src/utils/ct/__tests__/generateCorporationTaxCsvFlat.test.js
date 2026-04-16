import { describe, it, expect } from "vitest";
import { generateCorporationTaxCsvFlat } from "../generateCorporationTaxCsvFlat";

const HEADER =
  "period_start,period_end,accounting_profit,disallowable_expenses," +
  "capital_allowances,other_adjustments,associated_companies_count," +
  "augmented_profits_adjustment,tax_adjusted_profit," +
  "ct_rate_applied,ct_estimated,marginal_relief,rate_bracket,notes";

async function readBlobText(blob) {
  // Decode with ignoreBOM so the leading U+FEFF survives — we test for it.
  const buf = await blob.arrayBuffer();
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(buf);
}

const SMALL_PERIOD = {
  period_start: "2024-04-01",
  period_end: "2025-03-31",
  accounting_profit: 40000,
  disallowable_expenses: 1500,
  capital_allowances: 500,
  other_adjustments: 1000,
  tax_adjusted_profit: 42000,
  ct_rate_applied: 19,
  ct_estimated: 7980,
  rate_bracket: "small",
  adjustments_notes: "Standard adjustments",
};

describe("generateCorporationTaxCsvFlat", () => {
  it("happy path: produces a valid header row and a single data row in column order", async () => {
    const blob = generateCorporationTaxCsvFlat(SMALL_PERIOD);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/csv;charset=utf-8");

    const text = await readBlobText(blob);
    // Strip BOM for line-by-line inspection.
    const lines = text.replace(/^\uFEFF/, "").split("\r\n");

    expect(lines[0]).toBe(HEADER);
    expect(lines[1]).toBe(
      "2024-04-01,2025-03-31,40000.00,1500.00,500.00,1000.00,,," +
        "42000.00,19,7980.00,,small,Standard adjustments",
    );
    expect(lines[0].split(",")).toHaveLength(14);
    expect(lines[1].split(",")).toHaveLength(14);
  });

  it("loss bracket: zero CT estimated, rate 0", async () => {
    const blob = generateCorporationTaxCsvFlat({
      ...SMALL_PERIOD,
      accounting_profit: -2000,
      tax_adjusted_profit: -2000,
      ct_rate_applied: 0,
      ct_estimated: 0,
      rate_bracket: "loss",
      adjustments_notes: null,
    });
    const text = await readBlobText(blob);
    const dataRow = text.replace(/^\uFEFF/, "").split("\r\n")[1];

    // Notes was null → empty string (not the literal word "null").
    expect(dataRow.endsWith(",loss,")).toBe(true);
    expect(dataRow).toContain("-2000.00");
    expect(dataRow).toContain(",0.00,,loss,");
  });

  it("escapes notes that contain commas, quotes and newlines (RFC 4180)", async () => {
    const blob = generateCorporationTaxCsvFlat({
      ...SMALL_PERIOD,
      adjustments_notes: 'Hello, "world"\nsecond line',
    });
    const text = await readBlobText(blob);
    // The whole notes cell must be wrapped in quotes; internal " doubled.
    expect(text).toContain('"Hello, ""world""\nsecond line"');
  });

  it("prepends a UTF-8 BOM so Excel detects encoding correctly", async () => {
    const blob = generateCorporationTaxCsvFlat(SMALL_PERIOD);
    const text = await readBlobText(blob);
    expect(text.charCodeAt(0)).toBe(0xfeff);
  });
});
