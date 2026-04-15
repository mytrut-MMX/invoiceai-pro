import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase BEFORE importing the module under test.
//
// list path chain: from('...').select().order()  → thenable
// create path chain: from('...').insert(...).select().single() → thenable
const selectFn = vi.fn();
const orderFn = vi.fn();
const insertFn = vi.fn();
const insertSelectFn = vi.fn();
const insertSingleFn = vi.fn();

const fromSpy = vi.fn(() => ({
  select: (...args) => {
    selectFn(...args);
    return { order: orderFn };
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
}));

const getUserFn = vi.fn();

vi.mock("../../../lib/supabase", () => ({
  supabase: {
    from: fromSpy,
    auth: { getUser: getUserFn },
  },
}));

const {
  listCorporationTaxPeriods,
  createCorporationTaxPeriod,
  fetchCompaniesHousePrefill,
} = await import("../ctPeriods");

beforeEach(() => {
  fromSpy.mockClear();
  selectFn.mockClear();
  orderFn.mockReset();
  insertFn.mockClear();
  insertSelectFn.mockClear();
  insertSingleFn.mockReset();
  getUserFn.mockReset();
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
