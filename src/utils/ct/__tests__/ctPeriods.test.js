import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase BEFORE importing the module under test.
//
// list path chain:     from().select().order()                          → thenable
// create path chain:   from().insert(...).select().single()             → thenable
// get path chain:      from().select().eq(id).single()                  → thenable
// update path chain:   from().update(row).eq(id).select().single()      → thenable
// delete path chain:   from().delete().eq(id)                           → thenable
const selectFn = vi.fn();
const orderFn = vi.fn();
const insertFn = vi.fn();
const insertSelectFn = vi.fn();
const insertSingleFn = vi.fn();

const selectEqFn = vi.fn();
const selectSingleFn = vi.fn();

const updateFn = vi.fn();
const updateEqFn = vi.fn();
const updateSelectFn = vi.fn();
const updateSingleFn = vi.fn();

const deleteFn = vi.fn();
const deleteEqFn = vi.fn();

const fromSpy = vi.fn(() => ({
  select: (...args) => {
    selectFn(...args);
    return {
      order: orderFn,
      eq: (...eqArgs) => {
        selectEqFn(...eqArgs);
        return { single: selectSingleFn };
      },
    };
  },
  insert: (...args) => {
    insertFn(...args);
    return {
      select: () => {
        insertSelectFn();
        return { single: insertSingleFn };
      },
    };
  },
  update: (...args) => {
    updateFn(...args);
    return {
      eq: (...eqArgs) => {
        updateEqFn(...eqArgs);
        return {
          select: () => {
            updateSelectFn();
            return { single: updateSingleFn };
          },
        };
      },
    };
  },
  delete: (...args) => {
    deleteFn(...args);
    return { eq: deleteEqFn };
  },
}));

const getUserFn = vi.fn();
const rpcFn = vi.fn();

vi.mock("../../../lib/supabase", () => ({
  supabase: {
    from: fromSpy,
    auth: { getUser: getUserFn },
    rpc: rpcFn,
  },
}));

const {
  listCorporationTaxPeriods,
  createCorporationTaxPeriod,
  fetchCompaniesHousePrefill,
  getCorporationTaxPeriod,
  updateCorporationTaxPeriod,
  deleteCorporationTaxPeriod,
  unlockCorporationTaxPeriod,
  setCorporationTaxPeriodStatus,
} = await import("../ctPeriods");

beforeEach(() => {
  fromSpy.mockClear();
  selectFn.mockClear();
  orderFn.mockReset();
  insertFn.mockClear();
  insertSelectFn.mockClear();
  insertSingleFn.mockReset();
  selectEqFn.mockClear();
  selectSingleFn.mockReset();
  updateFn.mockClear();
  updateEqFn.mockClear();
  updateSelectFn.mockClear();
  updateSingleFn.mockReset();
  deleteFn.mockClear();
  deleteEqFn.mockReset();
  getUserFn.mockReset();
  rpcFn.mockReset();
});

describe("listCorporationTaxPeriods", () => {
  it("returns periods on success", async () => {
    getUserFn.mockResolvedValue({ data: { user: { id: "u1" } } });
    const rows = [
      { id: "p1", period_end: "2026-03-31" },
      { id: "p2", period_end: "2025-03-31" },
    ];
    orderFn.mockResolvedValue({ data: rows, error: null });

    const r = await listCorporationTaxPeriods();

    expect(r.success).toBe(true);
    expect(r.periods).toEqual(rows);
    expect(fromSpy).toHaveBeenCalledWith("corporation_tax_periods");
    expect(orderFn).toHaveBeenCalledWith("period_end", { ascending: false });
  });

  it("returns error on Supabase failure", async () => {
    getUserFn.mockResolvedValue({ data: { user: { id: "u1" } } });
    orderFn.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const r = await listCorporationTaxPeriods();

    expect(r.success).toBe(false);
    expect(r.error).toBe("permission denied");
  });

  it("returns Not signed in when no user", async () => {
    getUserFn.mockResolvedValue({ data: { user: null } });

    const r = await listCorporationTaxPeriods();

    expect(r).toEqual({ success: false, error: "Not signed in" });
  });
});

describe("createCorporationTaxPeriod", () => {
  it("inserts a period with computed payment + filing due dates", async () => {
    getUserFn.mockResolvedValue({ data: { user: { id: "u1" } } });
    const inserted = { id: "p1", period_start: "2025-04-01", period_end: "2026-03-31" };
    insertSingleFn.mockResolvedValue({ data: inserted, error: null });

    const r = await createCorporationTaxPeriod({
      periodStart: "2025-04-01",
      periodEnd: "2026-03-31",
      source: "companies_house",
      disallowableExpenses: 100,
      capitalAllowances: 50,
      otherAdjustments: -25,
      adjustmentsNotes: "test",
    });

    expect(r.success).toBe(true);
    expect(r.period).toEqual(inserted);
    // Assert payload shape on insert
    const payload = insertFn.mock.calls[0][0];
    expect(payload.user_id).toBe("u1");
    expect(payload.period_start).toBe("2025-04-01");
    expect(payload.period_end).toBe("2026-03-31");
    // period_end 2026-03-31 + 9 months + 1 day = 2027-01-01
    expect(payload.payment_due_date).toBe("2027-01-01");
    // period_end 2026-03-31 + 12 months = 2027-03-31
    expect(payload.filing_due_date).toBe("2027-03-31");
    expect(payload.source).toBe("companies_house");
    expect(payload.companies_house_synced_at).toBeTruthy();
    expect(payload.disallowable_expenses).toBe(100);
    expect(payload.capital_allowances).toBe(50);
    expect(payload.other_adjustments).toBe(-25);
    expect(payload.adjustments_notes).toBe("test");
  });
});

describe("fetchCompaniesHousePrefill", () => {
  it("maps nextAccounts into periodStart/periodEnd", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        companyName: "Acme Ltd",
        nextAccounts: {
          period_start_on: "2025-04-01",
          period_end_on: "2026-03-31",
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const r = await fetchCompaniesHousePrefill("12345678");

    expect(r).toEqual({
      success: true,
      periodStart: "2025-04-01",
      periodEnd: "2026-03-31",
      companyName: "Acme Ltd",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/companies-house?crn=12345678",
    );
    vi.unstubAllGlobals();
  });

  it("propagates proxy error responses", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: false, error: "Company not found" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const r = await fetchCompaniesHousePrefill("99999999");

    expect(r).toEqual({ success: false, error: "Company not found" });
    vi.unstubAllGlobals();
  });
});

describe("getCorporationTaxPeriod", () => {
  it("returns the period on success", async () => {
    const row = {
      id: "p1",
      period_start: "2025-04-01",
      period_end: "2026-03-31",
      locked: false,
    };
    selectSingleFn.mockResolvedValue({ data: row, error: null });

    const r = await getCorporationTaxPeriod("p1");

    expect(r).toEqual({ success: true, period: row });
    expect(fromSpy).toHaveBeenCalledWith("corporation_tax_periods");
    expect(selectEqFn).toHaveBeenCalledWith("id", "p1");
  });

  it("returns error when the period is not found", async () => {
    selectSingleFn.mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });

    const r = await getCorporationTaxPeriod("missing");

    expect(r).toEqual({ success: false, error: "No rows found" });
  });
});

describe("updateCorporationTaxPeriod", () => {
  it("maps camelCase patch to snake_case columns and returns the updated row", async () => {
    const updated = { id: "p1", ct_estimated: 4750 };
    updateSingleFn.mockResolvedValue({ data: updated, error: null });

    const r = await updateCorporationTaxPeriod("p1", {
      disallowableExpenses: 1000,
      capitalAllowances: 500,
      otherAdjustments: -250,
      adjustmentsNotes: "notes",
      accountingProfit: 25000,
      taxAdjustedProfit: 25250,
      ctRateApplied: 19,
      ctEstimated: 4797,
      rateBracket: "small",
      computedAt: "2026-04-15T00:00:00.000Z",
    });

    expect(r).toEqual({ success: true, period: updated });
    const row = updateFn.mock.calls[0][0];
    expect(row).toEqual({
      disallowable_expenses: 1000,
      capital_allowances: 500,
      other_adjustments: -250,
      adjustments_notes: "notes",
      accounting_profit: 25000,
      tax_adjusted_profit: 25250,
      ct_rate_applied: 19,
      ct_estimated: 4797,
      rate_bracket: "small",
      computed_at: "2026-04-15T00:00:00.000Z",
    });
    expect(updateEqFn).toHaveBeenCalledWith("id", "p1");
  });
});

describe("deleteCorporationTaxPeriod", () => {
  it("deletes by id and returns success", async () => {
    deleteEqFn.mockResolvedValue({ error: null });

    const r = await deleteCorporationTaxPeriod("p1");

    expect(r).toEqual({ success: true });
    expect(fromSpy).toHaveBeenCalledWith("corporation_tax_periods");
    expect(deleteEqFn).toHaveBeenCalledWith("id", "p1");
  });
});

describe("setCorporationTaxPeriodStatus", () => {
  it("transitions draft → finalized and sets locked=true", async () => {
    const updated = { id: "p1", status: "finalized", locked: true };
    updateSingleFn.mockResolvedValue({ data: updated, error: null });

    const r = await setCorporationTaxPeriodStatus("p1", "finalized");

    expect(r).toEqual({ success: true, period: updated });
    expect(updateFn).toHaveBeenCalledWith({ status: "finalized", locked: true });
    expect(updateEqFn).toHaveBeenCalledWith("id", "p1");
  });
});

describe("unlockCorporationTaxPeriod", () => {
  it("calls unlock_ct_period RPC and returns the unlocked period", async () => {
    const unlocked = { id: "p1", status: "draft", locked: false };
    rpcFn.mockResolvedValue({ data: unlocked, error: null });

    const r = await unlockCorporationTaxPeriod("p1", "client made an error");

    expect(r).toEqual({ success: true, period: unlocked });
    expect(rpcFn).toHaveBeenCalledWith("unlock_ct_period", {
      p_period_id: "p1",
      p_reason: "client made an error",
    });
  });

  it("propagates RPC errors", async () => {
    rpcFn.mockResolvedValue({
      data: null,
      error: { message: "Period not found or not owned by user" },
    });

    const r = await unlockCorporationTaxPeriod("p1", "valid reason here");

    expect(r).toEqual({
      success: false,
      error: "Period not found or not owned by user",
    });
  });

  it("rejects a too-short reason without calling the RPC", async () => {
    const r = await unlockCorporationTaxPeriod("p1", "  too  ");

    expect(r).toEqual({
      success: false,
      error: "Reason must be at least 5 characters",
    });
    expect(rpcFn).not.toHaveBeenCalled();
  });
});
