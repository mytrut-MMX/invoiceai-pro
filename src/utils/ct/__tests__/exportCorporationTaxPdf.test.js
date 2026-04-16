import { describe, it, expect, vi, beforeEach } from "vitest";

// exportCorporationTaxPdf transitively imports generateCorporationTaxPdf →
// html2pdf.js, which needs `self` at module load. Stub the PDF module and
// supabase so Node can evaluate the module under test.
const generatePdfBlob = vi.fn();
vi.mock("../generateCorporationTaxPdf", () => ({
  generateCorporationTaxPdfBlob: (...args) => generatePdfBlob(...args),
}));

// Chainable supabase mock covering:
//   from('corporation_tax_periods').select('*').eq(id).single()
//   from('business_profiles').select('org_settings').eq(user_id).maybeSingle()
//   from('ct_export_log').insert({...}).select('id').single()
//   storage.from('ct-exports').upload(path, blob, opts)
const getUserFn = vi.fn();

const periodSingleFn = vi.fn();
const profileMaybeSingleFn = vi.fn();
const logSingleFn = vi.fn();
const logInsertFn = vi.fn();
const uploadFn = vi.fn();

function fromChain(table) {
  if (table === "corporation_tax_periods") {
    return {
      select: () => ({
        eq: () => ({ single: periodSingleFn }),
      }),
    };
  }
  if (table === "business_profiles") {
    return {
      select: () => ({
        eq: () => ({ maybeSingle: profileMaybeSingleFn }),
      }),
    };
  }
  if (table === "ct_export_log") {
    return {
      insert: (row) => {
        logInsertFn(row);
        return { select: () => ({ single: logSingleFn }) };
      },
    };
  }
  return {};
}

vi.mock("../../../lib/supabase", () => ({
  supabase: {
    auth: { getUser: getUserFn },
    from: (table) => fromChain(table),
    storage: { from: () => ({ upload: uploadFn }) },
  },
}));

const { exportCorporationTaxPdf } = await import("../exportCorporationTaxPdf");

// JSDOM provides URL / document / HTMLAnchorElement — mock the bits that can
// otherwise leak between tests.
beforeEach(() => {
  generatePdfBlob.mockReset();
  getUserFn.mockReset();
  periodSingleFn.mockReset();
  profileMaybeSingleFn.mockReset();
  logSingleFn.mockReset();
  logInsertFn.mockClear();
  uploadFn.mockReset();

  // Provide the URL.createObjectURL / revokeObjectURL that happydom/JSDOM may
  // not expose by default.
  if (typeof URL.createObjectURL !== "function") {
    URL.createObjectURL = vi.fn(() => "blob:mock");
  } else {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
  }
  if (typeof URL.revokeObjectURL !== "function") {
    URL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  }
});

const PERIOD_ROW = {
  id: "period-1",
  user_id: "user-1",
  period_start: "2025-04-01",
  period_end: "2026-03-31",
  payment_due_date: "2027-01-01",
  filing_due_date: "2027-03-31",
  disallowable_expenses: 500,
  capital_allowances: 1000,
  other_adjustments: 0,
  accounting_profit: 40000,
  tax_adjusted_profit: 39500,
  ct_rate_applied: 19,
  ct_estimated: 7505,
  rate_bracket: "small",
  adjustments_notes: null,
  locked: false,
  status: "draft",
};

const PROFILE_ROW = {
  org_settings: { companyName: "SEMICORP LTD", crn: "12345678" },
};

describe("exportCorporationTaxPdf", () => {
  it("happy path: fetches period+profile, generates PDF, uploads, logs, triggers download", async () => {
    getUserFn.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    periodSingleFn.mockResolvedValue({ data: PERIOD_ROW, error: null });
    profileMaybeSingleFn.mockResolvedValue({ data: PROFILE_ROW, error: null });

    const fakeBlob = new Blob(["pdf"], { type: "application/pdf" });
    generatePdfBlob.mockResolvedValue({ success: true, blob: fakeBlob, filename: "CT600_SEMICORP_LTD_2026-03-31.pdf" });

    uploadFn.mockResolvedValue({ data: { path: "x" }, error: null });
    logSingleFn.mockResolvedValue({ data: { id: "log-1" }, error: null });

    const res = await exportCorporationTaxPdf({ periodId: "period-1" });

    expect(res.success).toBe(true);
    expect(res.logId).toBe("log-1");
    expect(res.warning).toBeUndefined();

    // Storage path convention: {user_id}/{period_id}/{timestamp}.pdf
    expect(uploadFn).toHaveBeenCalledTimes(1);
    const [pathArg, blobArg, optsArg] = uploadFn.mock.calls[0];
    expect(pathArg).toMatch(/^user-1\/period-1\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.pdf$/);
    expect(blobArg).toBe(fakeBlob);
    expect(optsArg).toMatchObject({ contentType: "application/pdf", upsert: false });
    expect(res.storagePath).toBe(pathArg);

    // PDF generation received the persisted snapshot, not a recompute.
    expect(generatePdfBlob).toHaveBeenCalledTimes(1);
    const genArg = generatePdfBlob.mock.calls[0][0];
    expect(genArg.company).toEqual({ companyName: "SEMICORP LTD", name: null, crn: "12345678" });
    expect(genArg.period).toBe(PERIOD_ROW);
    expect(genArg.calc).toMatchObject({
      accountingProfit: 40000,
      taxAdjustedProfit: 39500,
      ctEstimated: 7505,
      rateBracket: "small",
      warnings: [],
    });

    // Audit row carries the immutable snapshot.
    expect(logInsertFn).toHaveBeenCalledTimes(1);
    const logRow = logInsertFn.mock.calls[0][0];
    expect(logRow).toMatchObject({
      user_id: "user-1",
      period_id: "period-1",
      export_type: "pdf",
      storage_path: pathArg,
      period_start: "2025-04-01",
      period_end: "2026-03-31",
      accounting_profit: 40000,
      tax_adjusted_profit: 39500,
      ct_estimated: 7505,
      rate_bracket: "small",
    });
  });

  it("storage upload failure returns { success: false, stage: 'storage' } and skips audit", async () => {
    getUserFn.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    periodSingleFn.mockResolvedValue({ data: PERIOD_ROW, error: null });
    profileMaybeSingleFn.mockResolvedValue({ data: PROFILE_ROW, error: null });

    const fakeBlob = new Blob(["pdf"], { type: "application/pdf" });
    generatePdfBlob.mockResolvedValue({ success: true, blob: fakeBlob, filename: "x.pdf" });
    uploadFn.mockResolvedValue({ data: null, error: { message: "bucket forbidden" } });

    const res = await exportCorporationTaxPdf({ periodId: "period-1" });

    expect(res).toEqual({ success: false, stage: "storage", error: "bucket forbidden" });
    expect(logInsertFn).not.toHaveBeenCalled();
  });

  it("log insert failure after successful upload returns success with warning flag", async () => {
    getUserFn.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    periodSingleFn.mockResolvedValue({ data: PERIOD_ROW, error: null });
    profileMaybeSingleFn.mockResolvedValue({ data: PROFILE_ROW, error: null });

    const fakeBlob = new Blob(["pdf"], { type: "application/pdf" });
    generatePdfBlob.mockResolvedValue({ success: true, blob: fakeBlob, filename: "x.pdf" });
    uploadFn.mockResolvedValue({ data: { path: "x" }, error: null });
    logSingleFn.mockResolvedValue({ data: null, error: { message: "rls denied" } });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await exportCorporationTaxPdf({ periodId: "period-1" });
    warn.mockRestore();

    expect(res.success).toBe(true);
    expect(res.warning).toBe("log-insert-failed");
    expect(res.error).toBe("rls denied");
    expect(res.logId).toBeNull();
    expect(res.storagePath).toMatch(/^user-1\/period-1\//);
  });
});
