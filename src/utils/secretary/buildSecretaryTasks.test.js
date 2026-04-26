import { describe, it, expect, vi } from "vitest";
import { FALLBACK_CALENDARS } from "./bankHolidays";

vi.mock("./bankHolidays", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getBankHolidays: vi.fn(async () => actual.FALLBACK_CALENDARS["england-and-wales"]),
  };
});

const { buildSecretaryTasks, summariseTasks } = await import("./buildSecretaryTasks");

describe("buildSecretaryTasks (aggregator)", () => {
  it("emits setup items when org is unconfigured and no operational data", async () => {
    // Empty org → treated as sole trader (no crn), so SA deadlines are also generated;
    // setup checklist fires multiple items. No data → no operational tasks.
    const tasks = await buildSecretaryTasks({}, {}, "2025-06-15");
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.some(t => t.category === "setup")).toBe(true);
    expect(tasks.some(t => t.category === "operational")).toBe(false);
  });

  it("handles undefined orgSettings and data without throwing", async () => {
    const tasks = await buildSecretaryTasks(undefined, undefined, "2025-06-15");
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("merges setup + deadlines + operational tasks", async () => {
    const orgSettings = {
      vatReg: "Yes",
      vatNum: "GB123",
      vatStaggerGroup: 1,
      crn: "12345678",
      orgName: "Acme",
      street: "1 High St", city: "London", postcode: "EC1A 1AA",
      bankAcc: "12345678",
      branding: { logoUrl: "https://x" },
      industry: "Construction",
    };
    const data = {
      invoices: [{ status: "Sent", due_date: "2025-05-01", total: 1000 }], // 45d overdue
    };
    const tasks = await buildSecretaryTasks(orgSettings, data, "2025-06-15");
    // Should contain at least one VAT deadline + one overdue-invoices task; no setup items.
    expect(tasks.find(t => t.category === "vat")).toBeDefined();
    expect(tasks.find(t => t.id === "ops-overdue-invoices")).toBeDefined();
    expect(tasks.find(t => t.category === "setup")).toBeUndefined();
  });

  it("sorts by severity (critical → warning → info), then by days_until", async () => {
    const orgSettings = {}; // empty → multiple setup items
    const data = {
      invoices: [{ status: "Sent", due_date: "2025-05-01", total: 1000 }], // critical
      expenses: [{ receipt: "" }],                                         // info
    };
    const tasks = await buildSecretaryTasks(orgSettings, data, "2025-06-15");
    const ranks = tasks.map(t => ({ critical: 0, warning: 1, info: 2 }[t.severity]));
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
    }
    // First task should be the critical overdue-invoices
    expect(tasks[0].severity).toBe("critical");
    expect(tasks[0].id).toBe("ops-overdue-invoices");
  });

  it("within same severity, sorts by days_until ascending (deadlines beat operational with no days_until)", async () => {
    const orgSettings = { vatReg: "Yes", vatStaggerGroup: 1 };
    // today close to a VAT deadline → critical
    const tasks = await buildSecretaryTasks(orgSettings, {}, "2025-05-05"); // 2d to 7 May VAT
    const criticals = tasks.filter(t => t.severity === "critical");
    // The VAT deadline (days_until=2) should come before any other critical without days_until.
    expect(criticals[0].days_until).toBeLessThanOrEqual(7);
  });

  describe("summariseTasks", () => {
    it("counts by severity", () => {
      const tasks = [
        { severity: "critical" }, { severity: "critical" },
        { severity: "warning" },
        { severity: "info" }, { severity: "info" }, { severity: "info" },
      ];
      expect(summariseTasks(tasks)).toEqual({ total: 6, critical: 2, warning: 1, info: 3 });
    });

    it("returns zeros for empty list", () => {
      expect(summariseTasks([])).toEqual({ total: 0, critical: 0, warning: 0, info: 0 });
    });
  });
});
