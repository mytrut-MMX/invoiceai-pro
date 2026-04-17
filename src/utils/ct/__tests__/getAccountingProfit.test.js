import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase BEFORE importing the module under test. The new
// implementation calls supabase.rpc("get_accounting_profit", {...}) which
// resolves to { data, error }.
vi.mock("../../../lib/supabase", () => ({
  supabase: { rpc: vi.fn() },
}));

const { supabase } = await import("../../../lib/supabase");
const { getAccountingProfit } = await import("../getAccountingProfit");

const baseInput = {
  userId: "user-123",
  periodStart: "2026-01-01",
  periodEnd: "2026-12-31",
};

beforeEach(() => {
  supabase.rpc.mockReset();
});

describe("getAccountingProfit", () => {
  it("returns all-zero totals on an empty period", async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const r = await getAccountingProfit(baseInput);

    expect(r).toEqual({
      success: true,
      revenue: 0,
      expenses: 0,
      accountingProfit: 0,
    });
  });

  it("aggregates revenue (credit−debit) and expenses (debit−credit) correctly", async () => {
    // Revenue: 1,000 + 500 credit, 50 debit (contra) => 1,450
    // Expense: 200 + 300 debit, 25 credit (contra)   => 475
    // Profit: 1,450 - 475 = 975
    supabase.rpc.mockResolvedValue({
      data: [{ revenue: 1450, expenses: 475, accounting_profit: 975 }],
      error: null,
    });

    const r = await getAccountingProfit(baseInput);

    expect(r.success).toBe(true);
    expect(r.revenue).toBe(1450);
    expect(r.expenses).toBe(475);
    expect(r.accountingProfit).toBe(975);
  });

  it("returns success=false with error message on Supabase error", async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const r = await getAccountingProfit(baseInput);

    expect(r.success).toBe(false);
    expect(r.error).toBe("permission denied");
  });
});
