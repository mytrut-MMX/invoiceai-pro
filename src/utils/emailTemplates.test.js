import { describe, it, expect } from "vitest";
import {
  buildInvoiceEmail,
  buildQuoteEmail,
  buildCISStatementEmail,
  buildPaymentConfirmationEmail,
} from "./emailTemplates";

const SAMPLE_INVOICE = { invoiceNumber: "INV-001", issueDate: "2025-06-01", dueDate: "2025-06-30", total: 1000, currency: "GBP" };
const SAMPLE_QUOTE   = { quoteNumber: "QT-001",  issueDate: "2025-06-01", expiryDate: "2025-06-30", total: 500,  currency: "GBP" };
const SAMPLE_CUSTOMER = { contactName: "Jane Doe", companyName: "Client Ltd" };

describe("email templates — logo rendering", () => {
  it("renders logo when company has branding.logoUrl set", () => {
    const company = { orgName: "Acme", branding: { logoUrl: "https://x.test/logo.png" } };
    const html = buildInvoiceEmail({ invoice: SAMPLE_INVOICE, company, customer: SAMPLE_CUSTOMER });
    expect(html).toContain("https://x.test/logo.png");
    expect(html).toContain('<img');
    expect(html).not.toMatch(/>IS</);
  });

  it("renders IS badge when no logo configured", () => {
    const company = { orgName: "Acme" };
    const html = buildInvoiceEmail({ invoice: SAMPLE_INVOICE, company, customer: SAMPLE_CUSTOMER });
    expect(html).not.toContain('<img');
    expect(html).toMatch(/>IS</);
  });

  it("renders IS badge when branding.showLogo is false", () => {
    const company = { orgName: "Acme", branding: { logoUrl: "https://x.test/logo.png", showLogo: false } };
    const html = buildInvoiceEmail({ invoice: SAMPLE_INVOICE, company, customer: SAMPLE_CUSTOMER });
    expect(html).not.toContain("https://x.test/logo.png");
    expect(html).toMatch(/>IS</);
  });

  it("falls back to legacy logo field", () => {
    const company = { orgName: "Acme", logo: "https://legacy.test/logo.png" };
    const html = buildInvoiceEmail({ invoice: SAMPLE_INVOICE, company, customer: SAMPLE_CUSTOMER });
    expect(html).toContain("https://legacy.test/logo.png");
  });

  it("skips oversized base64 logo (>30KB)", () => {
    const bigBase64 = "data:image/png;base64," + "A".repeat(35 * 1024);
    const company = { orgName: "Acme", branding: { logoUrl: bigBase64 } };
    const html = buildInvoiceEmail({ invoice: SAMPLE_INVOICE, company, customer: SAMPLE_CUSTOMER });
    expect(html).not.toContain(bigBase64);
    expect(html).toMatch(/>IS</);
  });

  it("renders logo in quote email", () => {
    const company = { orgName: "Acme", branding: { logoUrl: "https://x.test/q.png" } };
    const html = buildQuoteEmail({ quote: SAMPLE_QUOTE, company, customer: SAMPLE_CUSTOMER });
    expect(html).toContain("https://x.test/q.png");
  });

  it("renders logo in CIS email (uses contractor as company source)", () => {
    const contractor = { name: "ContractorCo", branding: { logoUrl: "https://x.test/cis.png" } };
    const html = buildCISStatementEmail({
      contractor,
      subcontractor: { name: "Sub" },
      period: { label: "Mar 2025" },
      amounts: { gross_amount: 100, cis_deducted: 20 },
      personalMessage: "",
    });
    expect(html).toContain("https://x.test/cis.png");
  });

  it("renders logo in payment confirmation email", () => {
    const company = { orgName: "Acme", branding: { logoUrl: "https://x.test/p.png" } };
    const html = buildPaymentConfirmationEmail({
      invoice: SAMPLE_INVOICE,
      payment: { amount: 1000, date: "2025-06-15" },
      company,
      customer: SAMPLE_CUSTOMER,
    });
    expect(html).toContain("https://x.test/p.png");
  });

  it("escapes special chars in logo URL", () => {
    const company = { orgName: "Acme", branding: { logoUrl: 'https://x.test/logo.png?a="b"&c=<d>' } };
    const html = buildInvoiceEmail({ invoice: SAMPLE_INVOICE, company, customer: SAMPLE_CUSTOMER });
    expect(html).toContain("&quot;b&quot;");
    expect(html).toContain("&amp;c=&lt;d&gt;");
    expect(html).not.toContain('?a="b"&c=<d>');
  });
});
