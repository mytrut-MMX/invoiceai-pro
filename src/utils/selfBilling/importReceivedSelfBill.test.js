import { vi, describe, it, expect, beforeEach } from "vitest";

// Shared state the mock factories close over. vi.hoisted so they can.
const ctx = vi.hoisted(() => ({
  agreement: null, duplicates: [], saveError: null, uploadError: null,
  insertedInvoices: [], insertedLines: [], insertedEmissionLogs: [], uploadedPaths: [],
}));

vi.mock("../../lib/selfBilling/sbaService.js", () => ({
  getActiveSbaForCustomer: vi.fn(async () => ctx.agreement),
}));

vi.mock("../../lib/dataAccess.js", () => ({
  saveInvoice: vi.fn(async (userId, inv) => {
    ctx.insertedInvoices.push(inv);
    return ctx.saveError ? { error: ctx.saveError } : { data: inv, error: null };
  }),
}));

vi.mock("../ledger/fetchUserAccounts.js", () => ({
  fetchUserAccounts: vi.fn(async () => ({ accounts: [], userId: "user-1" })),
}));

vi.mock("../ledger/ledgerService.js", () => ({
  postInvoiceEntry: vi.fn(async () => ({ success: true })),
}));

vi.mock("../../lib/supabase.js", () => ({
  supabaseReady: true,
  supabase: {
    from: (table) => {
      if (table === "invoices") return {
        select: () => ({ eq: function () { return this; }, limit: () => Promise.resolve({ data: ctx.duplicates, error: null }) }),
      };
      if (table === "self_billing_emission_log") return {
        insert: (row) => { ctx.insertedEmissionLogs.push(row); return Promise.resolve({ error: null }); },
      };
      return {};
    },
    storage: {
      from: () => ({
        upload: (path, bytes) => {
          if (ctx.uploadError) return Promise.resolve({ error: ctx.uploadError });
          ctx.uploadedPaths.push({ path, size: bytes?.byteLength || bytes?.length || 0 });
          return Promise.resolve({ error: null });
        },
      }),
    },
  },
}));

import { importReceivedSelfBill } from "./importReceivedSelfBill.js";

const AGREEMENT = {
  id: "agr-1", version: 1, direction: "received",
  customer: { id: "cus-1", name: "Big Customer Ltd" },
};
const baseInput = (o = {}) => ({
  userId: "user-1", customerId: "cus-1",
  customerSbRef: "BC-SB-0042",
  issueDate: "2026-04-20", supplyDate: "2026-04-15", taxPoint: "2026-04-20",
  lineItems: [{ description: "Consulting", amount: 1000 }],
  vatRate: 20, vatAmount: 200, totalAmount: 1200,
  pdfBytes: new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]), // "%PDF-1.4"
  ...o,
});

beforeEach(() => {
  ctx.agreement = AGREEMENT;
  ctx.duplicates = []; ctx.saveError = null; ctx.uploadError = null;
  ctx.insertedInvoices = []; ctx.insertedEmissionLogs = []; ctx.uploadedPaths = [];
  vi.clearAllMocks();
});

describe("importReceivedSelfBill", () => {
  it("happy path: saves invoice + logs 'received' emission", async () => {
    const out = await importReceivedSelfBill(baseInput());
    expect(out.received_as_self_bill).toBe(true);
    expect(out.received_sb_agreement_id).toBe("agr-1");
    expect(out.received_sb_customer_ref).toBe("BC-SB-0042");
    expect(ctx.insertedInvoices).toHaveLength(1);
    expect(ctx.insertedEmissionLogs[0]).toMatchObject({
      emission_type: "received", bill_id: null, supplier_id: null,
      agreement_id: "agr-1", self_bill_number: "BC-SB-0042",
    });
  });

  it("throws SBA_NOT_ACTIVE when no active received agreement exists", async () => {
    ctx.agreement = null;
    await expect(importReceivedSelfBill(baseInput()))
      .rejects.toMatchObject({ code: "SBA_NOT_ACTIVE" });
    expect(ctx.insertedInvoices).toHaveLength(0);
  });

  it("rejects duplicate customer reference with DUPLICATE_WITH_SBA", async () => {
    ctx.duplicates = [{ id: "prev-invoice" }];
    await expect(importReceivedSelfBill(baseInput()))
      .rejects.toMatchObject({ code: "DUPLICATE_WITH_SBA" });
    expect(ctx.insertedInvoices).toHaveLength(0);
  });

  it("rejects total mismatch (net + vat ≠ total beyond tolerance)", async () => {
    await expect(importReceivedSelfBill(baseInput({ totalAmount: 9999 })))
      .rejects.toMatchObject({ code: "SBA_NOT_ACTIVE" });
    expect(ctx.insertedInvoices).toHaveLength(0);
  });

  it("rejects empty lineItems", async () => {
    await expect(importReceivedSelfBill(baseInput({ lineItems: [] })))
      .rejects.toMatchObject({ code: "SBA_NOT_ACTIVE" });
  });

  it("rejects missing customerSbRef", async () => {
    await expect(importReceivedSelfBill(baseInput({ customerSbRef: "   " })))
      .rejects.toMatchObject({ code: "SBA_NOT_ACTIVE" });
  });

  it("invoice persists even if PDF upload fails (best-effort)", async () => {
    ctx.uploadError = { message: "storage 500" };
    const out = await importReceivedSelfBill(baseInput());
    expect(out.received_as_self_bill).toBe(true);
    expect(ctx.insertedInvoices).toHaveLength(1);
    expect(ctx.insertedEmissionLogs).toHaveLength(0);
  });

  it("emission log carries a 64-char hex sha256 of the PDF bytes", async () => {
    await importReceivedSelfBill(baseInput());
    expect(ctx.insertedEmissionLogs[0].pdf_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not mutate the caller's lineItems array", async () => {
    const items = [{ description: "Consulting", amount: 1000 }];
    const snapshot = JSON.parse(JSON.stringify(items));
    await importReceivedSelfBill(baseInput({ lineItems: items }));
    expect(items).toEqual(snapshot);
  });
});
