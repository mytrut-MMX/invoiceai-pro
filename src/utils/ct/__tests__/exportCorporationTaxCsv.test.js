import { describe, it, expect, vi, beforeEach } from "vitest";

// Chainable supabase mock — same shape as the PDF orchestrator test, minus
// business_profiles (CSV filename is date-based, no company-name fetch).
const getUserFn = vi.fn();
const periodSingleFn = vi.fn();
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

const { exportCorporationTaxCsv } = await import("../exportCorporationTaxCsv");

beforeEach(() => {
  getUserFn.mockReset();
  periodSingleFn.mockReset();
  logSingleFn.mockReset();
  logInsertFn.mockClear();
  uploadFn.mockReset();

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
  status: "finalized",
};

describe("exportCorporationTaxCsv", () => {
  it("happy path flat: fetches period, uploads .csv, logs csv-flat, returns filename", async () => {
    getUserFn.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    periodSingleFn.mockResolvedValue({ data: PERIOD_ROW, error: null });
    uploadFn.mockResolvedValue({ data: { path: "x" }, error: null });
    logSingleFn.mockResolvedValue({ data: { id: "log-1" }, error: null });

    const res = await exportCorporationTaxCsv("period-1", "flat");

    expect(res.success).toBe(true);
    expect(res.logId).toBe("log-1");
    expect(res.warning).toBeUndefined();
    expect(res.filename).toBe("corporation-tax-2025-04-01-2026-03-31-flat.csv");

    // Storage path convention: {user_id}/{period_id}/{timestamp}.csv
    expect(uploadFn).toHaveBeenCalledTimes(1);
    const [pathArg, blobArg, optsArg] = uploadFn.mock.calls[0];
    expect(pathArg).toMatch(/^user-1\/period-1\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("text/csv;charset=utf-8");
    expect(optsArg).toMatchObject({
      contentType: "text/csv;charset=utf-8",
      upsert: false,
    });
    expect(res.storagePath).toBe(pathArg);

    // Audit row carries the snapshot AND the variant-specific export_type.
    expect(logInsertFn).toHaveBeenCalledTimes(1);
    const logRow = logInsertFn.mock.calls[0][0];
    expect(logRow).toMatchObject({
      user_id: "user-1",
      period_id: "period-1",
      export_type: "csv-flat",
      storage_path: pathArg,
      period_start: "2025-04-01",
      period_end: "2026-03-31",
      accounting_profit: 40000,
      tax_adjusted_profit: 39500,
      ct_estimated: 7505,
      rate_bracket: "small",
    });
  });

  it("happy path detailed: logs csv-detailed and uses the detailed filename", async () => {
    getUserFn.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    periodSingleFn.mockResolvedValue({ data: PERIOD_ROW, error: null });
    uploadFn.mockResolvedValue({ data: { path: "x" }, error: null });
    logSingleFn.mockResolvedValue({ data: { id: "log-2" }, error: null });

    const res = await exportCorporationTaxCsv("period-1", "detailed");

    expect(res.success).toBe(true);
    expect(res.filename).toBe("corporation-tax-2025-04-01-2026-03-31-detailed.csv");
    expect(logInsertFn.mock.calls[0][0].export_type).toBe("csv-detailed");
  });

  it("storage upload failure returns { success: false, stage: 'storage' } and skips audit", async () => {
    getUserFn.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    periodSingleFn.mockResolvedValue({ data: PERIOD_ROW, error: null });
    uploadFn.mockResolvedValue({ data: null, error: { message: "bucket forbidden" } });

    const res = await exportCorporationTaxCsv("period-1", "flat");

    expect(res).toEqual({ success: false, stage: "storage", error: "bucket forbidden" });
    expect(logInsertFn).not.toHaveBeenCalled();
  });

  it("rejects unknown variants with stage: 'csv'", async () => {
    const res = await exportCorporationTaxCsv("period-1", "xml");
    expect(res).toMatchObject({ success: false, stage: "csv" });
    expect(getUserFn).not.toHaveBeenCalled();
  });
});
