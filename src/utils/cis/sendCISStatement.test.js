import { describe, it, expect, vi } from "vitest";

// sendCISStatement transitively imports generateCISStatementPdf → jsPDF,
// which touches browser globals at module load. These tests only exercise
// toIsoDate, so stub the PDF module and the supabase client so Node can
// evaluate the module under test.
vi.mock("./generateCISStatementPdf", () => ({
  generateCISStatementBlob: vi.fn(),
}));
vi.mock("../../lib/supabase", () => ({ supabase: null }));

const { toIsoDate } = await import("./sendCISStatement");

// Tests run on CI which may be in any timezone. toIsoDate uses an explicit
// timeZone: "Europe/London" via Intl.DateTimeFormat, so every Date input below
// is expressed as an absolute instant (UTC Z or explicit offset) to keep these
// tests deterministic regardless of the host TZ.

describe("toIsoDate", () => {
  it("returns empty string for null", () => {
    expect(toIsoDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(toIsoDate(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(toIsoDate("")).toBe("");
  });

  it("is idempotent for already-formatted YYYY-MM-DD strings", () => {
    expect(toIsoDate("2026-05-05")).toBe("2026-05-05");
  });

  it("extracts date portion from an ISO datetime string", () => {
    expect(toIsoDate("2026-05-05T14:30:00Z")).toBe("2026-05-05");
  });

  it("formats a Date constructed at 23:30 UK local during BST (May 5)", () => {
    // 23:30 BST on May 5 = 22:30Z — matches spec case 6.
    const d = new Date("2026-05-05T23:30:00+01:00");
    expect(toIsoDate(d)).toBe("2026-05-05");
  });

  it("formats a Date constructed at 23:30 UK local during GMT (Jan 5)", () => {
    // 23:30 GMT on Jan 5 = 23:30Z — matches spec case 7.
    const d = new Date("2026-01-05T23:30:00+00:00");
    expect(toIsoDate(d)).toBe("2026-01-05");
  });

  it("formats late-night BST instants to the London calendar day", () => {
    // 22:30Z during BST = 23:30 BST on May 5 — matches spec case 8.
    const d = new Date("2026-05-05T22:30:00Z");
    expect(toIsoDate(d)).toBe("2026-05-05");
  });

  it("returns empty string for an unparseable date input", () => {
    expect(toIsoDate("not-a-date")).toBe("");
  });

  // Regression: the bug this patch fixes. 23:30Z during BST is 00:30 BST the
  // NEXT day — the old toISOString().slice() impl returned the UTC day
  // ("2026-05-05"), corrupting the storage path and log row. We now return
  // the London calendar day ("2026-05-06").
  it("rolls over to the next London day when UTC instant is late on BST night", () => {
    const d = new Date("2026-05-05T23:30:00Z");
    expect(toIsoDate(d)).toBe("2026-05-06");
  });
});
