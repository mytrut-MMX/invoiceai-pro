import { describe, it, expect } from "vitest";
import { buildSetupChecklist } from "./buildSetupChecklist";

describe("buildSetupChecklist", () => {
  it("returns empty array for fully configured org", () => {
    const fullySetUp = {
      orgName: "Acme Ltd",
      street: "1 High St",
      city: "London",
      postcode: "EC1A 1AA",
      vatReg: "Yes",
      vatNum: "GB123456789",
      bankAcc: "12345678",
      branding: { logoUrl: "https://example.com/logo.png" },
      industry: "Construction",
    };
    expect(buildSetupChecklist(fullySetUp)).toEqual([]);
  });

  it("flags missing org name", () => {
    const items = buildSetupChecklist({ orgName: "" });
    expect(items.find(i => i.id === "setup-org-name")).toBeDefined();
  });

  it("flags incomplete address (missing postcode)", () => {
    const items = buildSetupChecklist({ orgName: "Acme", street: "1 High St", city: "London", postcode: "" });
    expect(items.find(i => i.id === "setup-address")).toBeDefined();
  });

  it("flags missing VAT number when vatReg=Yes", () => {
    const items = buildSetupChecklist({ vatReg: "Yes", vatNum: "" });
    expect(items.find(i => i.id === "setup-vat-number")).toBeDefined();
  });

  it("does NOT flag missing VAT number when not VAT-registered", () => {
    const items = buildSetupChecklist({ vatReg: "No" });
    expect(items.find(i => i.id === "setup-vat-number")).toBeUndefined();
  });

  it("flags missing bank details when neither bankAcc nor bankIban set", () => {
    const items = buildSetupChecklist({ bankAcc: "", bankIban: "" });
    expect(items.find(i => i.id === "setup-bank-details")).toBeDefined();
  });

  it("does NOT flag bank details if bankIban present even without bankAcc", () => {
    const items = buildSetupChecklist({ bankIban: "GB29NWBK60161331926819" });
    expect(items.find(i => i.id === "setup-bank-details")).toBeUndefined();
  });

  it("flags missing logo", () => {
    const items = buildSetupChecklist({});
    expect(items.find(i => i.id === "setup-logo")).toBeDefined();
  });

  it("flags missing industry", () => {
    const items = buildSetupChecklist({ industry: "" });
    expect(items.find(i => i.id === "setup-industry")).toBeDefined();
  });

  it("every item has consistent shape", () => {
    const items = buildSetupChecklist({});
    for (const item of items) {
      expect(item.category).toBe("setup");
      expect(item.obligation).toBe("setup_check");
      expect(["critical", "warning", "info"]).toContain(item.severity);
      expect(item.title).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.action_label).toBeTruthy();
      expect(item.action_route).toMatch(/^\/settings/);
      expect(item.due_date).toBeUndefined();
      expect(item.days_until).toBeUndefined();
    }
  });

  it("handles undefined/null orgSettings without throwing", () => {
    expect(() => buildSetupChecklist(undefined)).not.toThrow();
    expect(() => buildSetupChecklist(null)).not.toThrow();
  });
});
