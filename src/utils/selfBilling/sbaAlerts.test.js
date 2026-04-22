import { describe, it, expect } from "vitest";
import { computeSbaAlerts } from "./sbaAlerts.js";

const TODAY = new Date("2026-04-22T00:00:00.000Z");
const addDays = (n) => {
  const d = new Date(TODAY); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const sba = (overrides = {}) => ({
  id: "sba-1", direction: "issued",
  supplier_id: "sup-1", supplier: { id: "sup-1", name: "Acme Ltd" },
  status: "active", end_date: addDays(30), ...overrides,
});

describe("computeSbaAlerts", () => {
  it("exactly 30 days out → info", () => {
    const [a] = computeSbaAlerts({ activeSbas: [sba({ end_date: addDays(30) })], today: TODAY });
    expect(a.severity).toBe("info");
    expect(a.daysToExpiry).toBe(30);
    expect(a.actionLabel).toBe("Review agreement");
  });

  it("exactly 14 days out → warning", () => {
    const [a] = computeSbaAlerts({ activeSbas: [sba({ end_date: addDays(14) })], today: TODAY });
    expect(a.severity).toBe("warning");
    expect(a.daysToExpiry).toBe(14);
    expect(a.actionLabel).toBe("Renew agreement");
  });

  it("exactly 7 days out → critical", () => {
    const [a] = computeSbaAlerts({ activeSbas: [sba({ end_date: addDays(7) })], today: TODAY });
    expect(a.severity).toBe("critical");
    expect(a.daysToExpiry).toBe(7);
    expect(a.title).toMatch(/expires in 7 days/);
  });

  it("1 day out → critical, singular 'day'", () => {
    const [a] = computeSbaAlerts({ activeSbas: [sba({ end_date: addDays(1) })], today: TODAY });
    expect(a.severity).toBe("critical");
    expect(a.title).toMatch(/expires in 1 day$/);
  });

  it("0 days out → critical 'Expired'", () => {
    const [a] = computeSbaAlerts({ activeSbas: [sba({ end_date: addDays(0) })], today: TODAY });
    expect(a.severity).toBe("critical");
    expect(a.title).toMatch(/^Expired — /);
  });

  it("past end_date → critical 'Expired'", () => {
    const [a] = computeSbaAlerts({ activeSbas: [sba({ end_date: addDays(-3) })], today: TODAY });
    expect(a.severity).toBe("critical");
    expect(a.title).toMatch(/^Expired — /);
    expect(a.daysToExpiry).toBe(-3);
  });

  it("31+ days out → no alert", () => {
    const out = computeSbaAlerts({ activeSbas: [sba({ end_date: addDays(31) })], today: TODAY });
    expect(out).toEqual([]);
  });

  it("multiple SBAs → one alert each, correct severity each", () => {
    const out = computeSbaAlerts({
      activeSbas: [
        sba({ id: "a", end_date: addDays(30) }),
        sba({ id: "b", end_date: addDays(14) }),
        sba({ id: "c", end_date: addDays(3) }),
        sba({ id: "d", end_date: addDays(45) }), // out of window
      ],
      today: TODAY,
    });
    expect(out).toHaveLength(3);
    expect(out.find((x) => x.id === "sba_renewal_a").severity).toBe("info");
    expect(out.find((x) => x.id === "sba_renewal_b").severity).toBe("warning");
    expect(out.find((x) => x.id === "sba_renewal_c").severity).toBe("critical");
  });

  it("deterministic output for a fixed `today`", () => {
    const input = { activeSbas: [sba({ end_date: addDays(10) })], today: TODAY };
    expect(computeSbaAlerts(input)).toEqual(computeSbaAlerts(input));
  });

  it("issued direction → routes to /suppliers/{id}", () => {
    const [a] = computeSbaAlerts({
      activeSbas: [sba({ direction: "issued", supplier_id: "sup-42", end_date: addDays(10) })],
      today: TODAY,
    });
    expect(a.actionHref).toBe("/suppliers/sup-42?tab=self-billing");
    expect(a.direction).toBe("issued");
  });

  it("received direction → routes to /customers/{id}", () => {
    const [a] = computeSbaAlerts({
      activeSbas: [{
        id: "s2", direction: "received",
        customer_id: "cus-9", customer: { id: "cus-9", name: "Big Customer" },
        end_date: addDays(5),
      }],
      today: TODAY,
    });
    expect(a.actionHref).toBe("/customers/cus-9?tab=self-billing");
    expect(a.direction).toBe("received");
  });

  it("missing end_date → skipped (no crash)", () => {
    const out = computeSbaAlerts({
      activeSbas: [{ id: "weird", direction: "issued", supplier: { name: "X" } }],
      today: TODAY,
    });
    expect(out).toEqual([]);
  });
});
