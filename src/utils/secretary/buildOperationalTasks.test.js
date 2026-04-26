import { describe, it, expect } from "vitest";
import { buildOperationalTasks } from "./buildOperationalTasks";

const TODAY = "2025-06-15";

describe("buildOperationalTasks", () => {
  it("returns empty array when nothing is pending", () => {
    expect(buildOperationalTasks({}, TODAY)).toEqual([]);
  });

  it("handles undefined data without throwing", () => {
    expect(() => buildOperationalTasks(undefined, TODAY)).not.toThrow();
    expect(buildOperationalTasks(undefined, TODAY)).toEqual([]);
  });

  describe("overdue invoices", () => {
    it("aggregates count + total + oldest days; warning when oldest ≤ 30", () => {
      const data = {
        invoices: [
          { status: "Sent",    due_date: "2025-06-01", total: 1000 }, // 14 days overdue
          { status: "Partial", due_date: "2025-06-10", total:  500 }, //  5 days
        ],
      };
      const tasks = buildOperationalTasks(data, TODAY);
      const t = tasks.find(x => x.id === "ops-overdue-invoices");
      expect(t).toBeDefined();
      expect(t.count).toBe(2);
      expect(t.total).toBe(1500);
      expect(t.severity).toBe("warning");
      expect(t.description).toContain("14 days overdue");
    });

    it("severity is critical when oldest > 30 days", () => {
      const data = {
        invoices: [
          { status: "Sent", due_date: "2025-05-01", total: 2000 }, // 45 days
        ],
      };
      const t = buildOperationalTasks(data, TODAY).find(x => x.id === "ops-overdue-invoices");
      expect(t.severity).toBe("critical");
    });

    it("ignores Paid and Draft invoices and future-dated ones", () => {
      const data = {
        invoices: [
          { status: "Paid",  due_date: "2025-06-01", total: 1000 },
          { status: "Draft", due_date: "2025-06-01", total: 1000 },
          { status: "Sent",  due_date: "2025-12-01", total: 1000 }, // future
        ],
      };
      expect(buildOperationalTasks(data, TODAY).find(x => x.id === "ops-overdue-invoices")).toBeUndefined();
    });
  });

  describe("bills due soon / overdue", () => {
    it("flags bills due within 7 days as warning", () => {
      const data = {
        bills: [
          { status: "Approved", due_date: "2025-06-18", total: 400 },
          { status: "Approved", due_date: "2025-06-21", total: 600 },
          { status: "Approved", due_date: "2025-07-15", total: 999 }, // out of range
        ],
      };
      const t = buildOperationalTasks(data, TODAY).find(x => x.id === "ops-bills-due-soon");
      expect(t).toBeDefined();
      expect(t.count).toBe(2);
      expect(t.total).toBe(1000);
      expect(t.severity).toBe("warning");
    });

    it("flags overdue bills as critical", () => {
      const data = {
        bills: [{ status: "Approved", due_date: "2025-06-01", total: 800 }],
      };
      const t = buildOperationalTasks(data, TODAY).find(x => x.id === "ops-overdue-bills");
      expect(t).toBeDefined();
      expect(t.severity).toBe("critical");
    });

    it("ignores Paid bills entirely", () => {
      const data = {
        bills: [
          { status: "Paid", due_date: "2025-06-01", total: 800 },
          { status: "Paid", due_date: "2025-06-18", total: 400 },
        ],
      };
      const tasks = buildOperationalTasks(data, TODAY);
      expect(tasks.find(x => x.id === "ops-bills-due-soon")).toBeUndefined();
      expect(tasks.find(x => x.id === "ops-overdue-bills")).toBeUndefined();
    });
  });

  describe("expenses", () => {
    it("flags expenses missing receipts", () => {
      const data = {
        expenses: [
          { receipt: "", category: "Travel" },
          { receipt: "https://x", category: "Travel" },
          { receipt: "   ", category: "Travel" },
        ],
      };
      const t = buildOperationalTasks(data, TODAY).find(x => x.id === "ops-expenses-no-receipt");
      expect(t).toBeDefined();
      expect(t.count).toBe(2);
      expect(t.severity).toBe("info");
    });

    it("flags expenses without category", () => {
      const data = {
        expenses: [
          { receipt: "https://x", category: "" },
          { receipt: "https://x", category: "Office" },
        ],
      };
      const t = buildOperationalTasks(data, TODAY).find(x => x.id === "ops-expenses-no-category");
      expect(t).toBeDefined();
      expect(t.count).toBe(1);
    });
  });

  describe("self-billing agreements", () => {
    it("flags pending countersign (lowercase enum value)", () => {
      const data = {
        agreements: [
          { status: "pending_countersign" },
          { status: "active" },
          { status: "pending_countersign" },
        ],
      };
      const t = buildOperationalTasks(data, TODAY).find(x => x.id === "ops-pending-sbas");
      expect(t).toBeDefined();
      expect(t.count).toBe(2);
    });

    it("does NOT flag uppercase 'PENDING_COUNTERSIGN' (constant key, not stored value)", () => {
      const data = { agreements: [{ status: "PENDING_COUNTERSIGN" }] };
      expect(buildOperationalTasks(data, TODAY).find(x => x.id === "ops-pending-sbas")).toBeUndefined();
    });
  });

  describe("output shape", () => {
    it("every task has required fields and no due_date / days_until", () => {
      const data = {
        invoices: [{ status: "Sent", due_date: "2025-06-01", total: 100 }],
        bills:    [{ status: "Approved", due_date: "2025-06-18", total: 200 }],
        expenses: [{ receipt: "" }],
        agreements: [{ status: "pending_countersign" }],
      };
      const tasks = buildOperationalTasks(data, TODAY);
      expect(tasks.length).toBeGreaterThan(0);
      for (const t of tasks) {
        expect(t.category).toBe("operational");
        expect(["critical", "warning", "info"]).toContain(t.severity);
        expect(t.title).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(t.action_route).toMatch(/^\//);
        expect(t.due_date).toBeUndefined();
        expect(t.days_until).toBeUndefined();
      }
    });
  });
});
