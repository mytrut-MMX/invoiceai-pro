import { describe, it, expect } from "vitest";
import { generateCorporationTaxCsvDetailed } from "../generateCorporationTaxCsvDetailed";

async function readBlobText(blob) {
  const buf = await blob.arrayBuffer();
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(buf);
}

const SMALL_PERIOD = {
  period_start: "2024-04-01",
  period_end: "2025-03-31",
  payment_due_date: "2026-01-01",
  filing_due_date: "2026-03-31",
  accounting_profit: 80000,
  disallowable_expenses: 1500,
  capital_allowances: 500,
  other_adjustments: 1000,
  tax_adjusted_profit: 82000,
  ct_rate_applied: 25,
  ct_estimated: 20500,
  rate_bracket: "marginal_zone",
  adjustments_notes: "Includes director's car",
};

describe("generateCorporationTaxCsvDetailed", () => {
  it("happy path: section headers present and values on the correct lines", async () => {
    const blob = generateCorporationTaxCsvDetailed({
      ...SMALL_PERIOD,
      rate_bracket: "small",
      ct_rate_applied: 19,
      ct_estimated: 15580,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/csv;charset=utf-8");

    const text = await readBlobText(blob);
    const lines = text.replace(/^\uFEFF/, "").split("\r\n");

    expect(lines[0]).toBe("INVOICESAGA CT600 ESTIMATE");
    expect(lines).toContain("PERIOD");
    expect(lines).toContain("COMPUTATION");
    expect(lines).toContain("TAX");
    expect(lines).toContain("NOTES");

    expect(lines).toContain("Start,2024-04-01");
    expect(lines).toContain("End,2025-03-31");
    expect(lines).toContain("Payment due,2026-01-01");
    expect(lines).toContain("Filing due,2026-03-31");

    expect(lines).toContain("Accounting profit,80000.00");
    expect(lines).toContain("Disallowable expenses,+1500.00");
    expect(lines).toContain("Capital allowances,-500.00");
    expect(lines).toContain("Other adjustments,+1000.00");
    expect(lines).toContain("Tax-adjusted profit,82000.00");

    expect(lines).toContain("Rate applied,19%");
    expect(lines).toContain("Rate bracket,small");
    expect(lines).toContain("CT estimated,15580.00");

    // Notes section: header on its own line, content on next.
    const notesIdx = lines.indexOf("NOTES");
    expect(lines[notesIdx + 1]).toBe("Includes director's car");
  });

  it("empty notes are rendered as the literal 'None' placeholder", async () => {
    const blob = generateCorporationTaxCsvDetailed({
      ...SMALL_PERIOD,
      adjustments_notes: null,
    });
    const text = await readBlobText(blob);
    const lines = text.replace(/^\uFEFF/, "").split("\r\n");

    const notesIdx = lines.indexOf("NOTES");
    expect(notesIdx).toBeGreaterThan(-1);
    expect(lines[notesIdx + 1]).toBe("None");
  });

  it("marginal zone bracket emits the marginal-relief warning row", async () => {
    const blob = generateCorporationTaxCsvDetailed(SMALL_PERIOD);
    const text = await readBlobText(blob);

    expect(text).toContain("Rate bracket,marginal_zone");
    expect(text).toContain("Warning,Marginal relief is not calculated in Phase 1.");
  });

  it("prepends a UTF-8 BOM so Excel detects encoding correctly", async () => {
    const blob = generateCorporationTaxCsvDetailed(SMALL_PERIOD);
    const text = await readBlobText(blob);
    expect(text.charCodeAt(0)).toBe(0xfeff);
  });
});
