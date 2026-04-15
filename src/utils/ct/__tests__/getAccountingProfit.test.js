import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase BEFORE importing the module under test. The query builder
// chains .select().eq().gte().lte().in() — each step returns the same
// builder, and the final `.in()` is awaited as a thenable resolving to
// { data, error }.
const builder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn(),
};

vi.mock("../../../lib/supabase", () => ({
  supabase: { from: vi.fn(() => builder) },
}));

const { getAccountingProfit } = await import("../getAccountingProfit");

const baseInput = {
  userId: "user-123",
  periodStart: "2026-01-01",
  periodEnd: "2026-12-31",
};

beforeEach(() => {
  builder.select.mockClear();
  builder.eq.mockClear();
  builder.gte.mockClear();
  builder.lte.mockClear();
  builder.in.mockReset();
});

describe("getAccountingProfit", () => {
  it("returns all-zero totals on an empty period", async () => {
    builder.in.mockResolvedValue({ data: [], error: null });

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
    builder.in.mockResolvedValue({
      data: [
        { debit: 0, credit: 1000, accounts: { type: "revenue" } },
        { debit: 0, credit: 500, accounts: { type: "revenue" } },
        { debit: 50, credit: 0, accounts: { type: "revenue" } },
        { debit: 200, credit: 0, accounts: { type: "expense" } },
        { debit: 300, credit: 0, accounts: { type: "expense" } },
        { debit: 0, credit: 25, accounts: { type: "expense" } },
      ],
      error: null,
    });

    const r = await getAccountingProfit(baseInput);

    expect(r.success).toBe(true);
    expect(r.revenue).toBe(1450);
    expect(r.expenses).toBe(475);
    expect(r.accountingProfit).toBe(975);
  });

  it("returns success=false with error message on Supabase error", async () => {
    builder.in.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const r = await getAccountingProfit(baseInput);

    expect(r.success).toBe(false);
    expect(r.error).toBe("permission denied");
  });
});
