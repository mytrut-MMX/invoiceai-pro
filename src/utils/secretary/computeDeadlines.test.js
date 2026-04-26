import { describe, it, expect } from "vitest";
import { computeDeadlines } from "./computeDeadlines";
import { FALLBACK_CALENDARS } from "./bankHolidays";

const ENG = FALLBACK_CALENDARS["england-and-wales"];

describe("computeDeadlines", () => {
  describe("VAT", () => {
    it("VAT-registered company on stagger 1, today 1 May 2025 → Q ending Mar 2025 due 7 May 2025 (no roll, weekday)", () => {
      const orgSettings = { vatReg: "Yes", vatStaggerGroup: 1, crn: "12345678" };
      const deadlines = computeDeadlines(orgSettings, "2025-05-01", ENG);
      const q1 = deadlines.find(d => d.id === "vat-2025-03-31");
      expect(q1).toBeDefined();
      expect(q1.due_date).toBe("2025-05-07");
      expect(q1.due_date_raw).toBe("2025-05-07");
      expect(q1.category).toBe("vat");
    });

    it("non-VAT-registered company → no VAT deadlines", () => {
      const orgSettings = { vatReg: "No" };
      const deadlines = computeDeadlines(orgSettings, "2025-05-01", ENG);
      expect(deadlines.filter(d => d.category === "vat")).toEqual([]);
    });
  });

  describe("Self Assessment", () => {
    it("sole trader, today 15 Jan 2026 → SA online filing due 31 Jan 2026 (Sat) → effective 2 Feb 2026", () => {
      const orgSettings = {};
      const deadlines = computeDeadlines(orgSettings, "2026-01-15", ENG);
      const sa = deadlines.find(d => d.id === "sa-filing-2025-04-05");
      expect(sa).toBeDefined();
      expect(sa.due_date_raw).toBe("2026-01-31");
      expect(sa.due_date).toBe("2026-02-02");
    });

    it("limited company without directorSelfAssessment → no SA deadlines", () => {
      const orgSettings = { crn: "12345678" };
      const deadlines = computeDeadlines(orgSettings, "2025-05-01", ENG);
      expect(deadlines.filter(d => d.category === "sa")).toEqual([]);
    });
  });

  describe("Companies House — NO roll-forward", () => {
    it("limited company with FY ending 31 Jan 2026 (Sat) → accounts due 31 Oct 2026 (raw=effective, NO roll)", () => {
      const orgSettings = { crn: "12345678", financialYearStart: 2 };
      const deadlines = computeDeadlines(orgSettings, "2026-09-01", ENG);
      const ch = deadlines.find(d => d.obligation === "ch_accounts" && d.due_date_raw === "2026-10-31");
      expect(ch).toBeDefined();
      expect(ch.due_date).toBe("2026-10-31");
      expect(ch.due_date).toBe(ch.due_date_raw);
    });
  });

  describe("PAYE — rolls BACKWARD for payment", () => {
    it("PAYE payment for tax month ending 5 Mar 2026 → due 22 Mar 2026 (Sun) → must clear 20 Mar 2026 (Fri)", () => {
      const orgSettings = { payroll: { active: true } };
      const deadlines = computeDeadlines(orgSettings, "2026-03-01", ENG);
      const paye = deadlines.find(d => d.id === "paye-2026-3");
      expect(paye).toBeDefined();
      expect(paye.due_date_raw).toBe("2026-03-22");
      expect(paye.due_date).toBe("2026-03-20");
    });
  });

  describe("Sole trader — no CT, no CH", () => {
    it("sole trader sees no CT or CH deadlines", () => {
      const orgSettings = { vatReg: "No" };
      const deadlines = computeDeadlines(orgSettings, "2025-06-01", ENG);
      expect(deadlines.filter(d => d.category === "ct")).toEqual([]);
      expect(deadlines.filter(d => d.category === "ch")).toEqual([]);
    });
  });

  describe("Severity rules", () => {
    it("≤7 days = critical, 8–30 = warning, >30 = info", () => {
      const orgSettings = { vatReg: "Yes", vatStaggerGroup: 1 };
      const d1 = computeDeadlines(orgSettings, "2025-05-05", ENG).find(d => d.id === "vat-2025-03-31");
      expect(d1?.severity).toBe("critical");
      const d2 = computeDeadlines(orgSettings, "2025-04-20", ENG).find(d => d.id === "vat-2025-03-31");
      expect(d2?.severity).toBe("warning");
      const d3 = computeDeadlines(orgSettings, "2025-04-01", ENG).find(d => d.id === "vat-2025-03-31");
      expect(d3?.severity).toBe("info");
    });
  });

  describe("Output shape", () => {
    it("every deadline has source_url and stable id", () => {
      const orgSettings = { vatReg: "Yes", crn: "12345678" };
      const deadlines = computeDeadlines(orgSettings, "2025-06-01", ENG);
      expect(deadlines.length).toBeGreaterThan(0);
      for (const d of deadlines) {
        expect(d.source_url).toMatch(/^https:\/\/(www\.gov\.uk|developer\.service\.hmrc\.gov\.uk|find-and-update)/);
        expect(d.id).toBeTruthy();
        expect(d.severity).toMatch(/^(critical|warning|info)$/);
        expect(d.category).toMatch(/^(vat|sa|ct|ch|rti|cis|p11d|itsa)$/);
      }
    });
  });
});
