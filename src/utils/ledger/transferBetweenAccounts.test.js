import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsertEntry = vi.fn();
const mockInsertLines = vi.fn();
const mockSelect = vi.fn();

vi.mock("../../lib/supabase", () => ({
  supabaseReady: true,
  supabase: {
    from: vi.fn((table) => {
      if (table === "accounts") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [{ id: "a1" }, { id: "a2" }], error: null }),
          }),
        };
      }
      if (table === "journal_entries") {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: "je1" }, error: null }),
            }),
          }),
        };
      }
      if (table === "journal_lines") {
        return { insert: () => Promise.resolve({ error: null }) };
      }
    }),
  },
}));

const { transferBetweenAccounts } = await import("./transferBetweenAccounts");

const baseOpts = {
  fromAccountId: "a1",
  toAccountId: "a2",
  date: "2026-04-19",
  memo: "test",
  userId: "u1",
};

describe("transferBetweenAccounts — amount validation", () => {
  it("rejects NaN", async () => {
    const { error } = await transferBetweenAccounts({ ...baseOpts, amount: NaN });
    expect(error).toMatch(/greater than zero/);
  });

  it("rejects Infinity", async () => {
    const { error } = await transferBetweenAccounts({ ...baseOpts, amount: Infinity });
    expect(error).toMatch(/greater than zero/);
  });

  it("rejects 0.001 (rounds to 0.00)", async () => {
    const { error } = await transferBetweenAccounts({ ...baseOpts, amount: 0.001 });
    expect(error).toMatch(/at least 0\.01 after rounding/);
  });

  it("rejects 0.004 (rounds to 0.00)", async () => {
    const { error } = await transferBetweenAccounts({ ...baseOpts, amount: 0.004 });
    expect(error).toMatch(/at least 0\.01 after rounding/);
  });

  it("accepts 0.005 (rounds to 0.01)", async () => {
    const { error, journalEntry } = await transferBetweenAccounts({ ...baseOpts, amount: 0.005 });
    expect(error).toBeNull();
    expect(journalEntry).toBeTruthy();
  });
});
