import { describe, it, expect } from "vitest";
import { DEFAULT_TEMPLATE } from "../../utils/InvoiceTemplateSchema";

// We test the schema shape that the editor relies on. Full UI tests would need
// jsdom; out of scope.

describe("InvoiceTemplateEditorModal — schema integration", () => {
  it("DEFAULT_TEMPLATE has all 9 schema sections that the editor exposes", () => {
    expect(DEFAULT_TEMPLATE.layout).toBeDefined();
    expect(DEFAULT_TEMPLATE.sections).toBeDefined();
    expect(DEFAULT_TEMPLATE.fromFields).toBeDefined();
    expect(DEFAULT_TEMPLATE.toFields).toBeDefined();
    expect(DEFAULT_TEMPLATE.invoiceFields).toBeDefined();
    expect(DEFAULT_TEMPLATE.lineItemColumns).toBeDefined();
    expect(DEFAULT_TEMPLATE.totalsBlock).toBeDefined();
    expect(DEFAULT_TEMPLATE.bankFields).toBeDefined();
    expect(DEFAULT_TEMPLATE.customText).toBeDefined();
  });

  it("layout has fontFamily, logoPosition, logoSize, showLogo", () => {
    expect(DEFAULT_TEMPLATE.layout.fontFamily).toBeDefined();
    expect(DEFAULT_TEMPLATE.layout.logoPosition).toBeDefined();
    expect(DEFAULT_TEMPLATE.layout.logoSize).toBeDefined();
    expect(DEFAULT_TEMPLATE.layout.showLogo).toBe(true);
  });

  it("section toggles include all 8 sections", () => {
    const expectedSections = ["header", "fromBlock", "toBlock", "bankDetails", "notes", "footer", "signature", "watermark"];
    for (const s of expectedSections) {
      expect(DEFAULT_TEMPLATE.sections).toHaveProperty(s);
    }
  });

  it("customText has headerNote, footerNote, paymentTerms, watermarkText", () => {
    expect(DEFAULT_TEMPLATE.customText).toHaveProperty("headerNote");
    expect(DEFAULT_TEMPLATE.customText).toHaveProperty("footerNote");
    expect(DEFAULT_TEMPLATE.customText).toHaveProperty("paymentTerms");
    expect(DEFAULT_TEMPLATE.customText).toHaveProperty("watermarkText");
  });
});
