import { describe, it, expect, beforeEach } from "vitest";

// Vitest defaults to the node environment in this repo, so localStorage is
// undefined. Polyfill a minimal in-memory shim before importing the helper.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

const { getCompanyLogoUrl, getCompanyLogoSize, isLogoEnabled, migrateLegacyLogo } =
  await import("./logoHelper");

beforeEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
});

describe("getCompanyLogoUrl", () => {
  it("returns branding.logoUrl when set", () => {
    expect(getCompanyLogoUrl({ branding: { logoUrl: "https://x/logo.png" } })).toBe("https://x/logo.png");
  });
  it("falls back to legacy logo field", () => {
    expect(getCompanyLogoUrl({ logo: "data:image/png;base64,..." })).toBe("data:image/png;base64,...");
  });
  it("falls back to company_logo field", () => {
    expect(getCompanyLogoUrl({ company_logo: "url://legacy" })).toBe("url://legacy");
  });
  it("returns empty string when showLogo is false", () => {
    expect(getCompanyLogoUrl({ branding: { logoUrl: "x", showLogo: false } })).toBe("");
  });
  it("returns empty string when no source", () => {
    expect(getCompanyLogoUrl({})).toBe("");
    expect(getCompanyLogoUrl(null)).toBe("");
  });
  it("prefers canonical over legacy", () => {
    expect(getCompanyLogoUrl({ branding: { logoUrl: "new" }, logo: "old" })).toBe("new");
  });
});

describe("getCompanyLogoSize", () => {
  it("returns override when given", () => {
    expect(getCompanyLogoSize({}, 80)).toBe(80);
  });
  it("returns branding.logoSize", () => {
    expect(getCompanyLogoSize({ branding: { logoSize: 64 } })).toBe(64);
  });
  it("falls back to legacy logoSize", () => {
    expect(getCompanyLogoSize({ logoSize: 40 })).toBe(40);
  });
  it("falls back to company_logo_size", () => {
    expect(getCompanyLogoSize({ company_logo_size: 60 })).toBe(60);
  });
  it("defaults to 52", () => {
    expect(getCompanyLogoSize({})).toBe(52);
    expect(getCompanyLogoSize(null)).toBe(52);
  });
});

describe("isLogoEnabled", () => {
  it("true when canonical URL present and showLogo not disabled", () => {
    expect(isLogoEnabled({ branding: { logoUrl: "x" } })).toBe(true);
  });
  it("false when showLogo explicitly false", () => {
    expect(isLogoEnabled({ branding: { logoUrl: "x", showLogo: false } })).toBe(false);
  });
  it("true when only legacy logo present", () => {
    expect(isLogoEnabled({ logo: "x" })).toBe(true);
  });
  it("false when no logo anywhere", () => {
    expect(isLogoEnabled({})).toBe(false);
  });
});

describe("migrateLegacyLogo", () => {
  it("no-ops when branding.logoUrl already set", () => {
    const input = { branding: { logoUrl: "new" }, logo: "old" };
    const result = migrateLegacyLogo(input);
    expect(result.migrated).toBe(false);
    expect(result.orgSettings).toBe(input);
  });
  it("copies legacy logo to branding.logoUrl", () => {
    const result = migrateLegacyLogo({ logo: "data:abc", logoSize: 80 });
    expect(result.migrated).toBe(true);
    expect(result.orgSettings.branding.logoUrl).toBe("data:abc");
    expect(result.orgSettings.branding.logoSize).toBe(80);
    expect(result.orgSettings.branding.showLogo).toBe(true);
  });
  it("preserves existing branding fields when migrating", () => {
    const result = migrateLegacyLogo({ logo: "x", branding: { accentColor: "#fff" } });
    expect(result.orgSettings.branding.accentColor).toBe("#fff");
    expect(result.orgSettings.branding.logoUrl).toBe("x");
  });
  it("respects existing showLogo=false during migration", () => {
    const result = migrateLegacyLogo({ logo: "x", branding: { showLogo: false } });
    expect(result.orgSettings.branding.showLogo).toBe(false);
  });
  it("returns migrated: false when nothing to migrate", () => {
    const result = migrateLegacyLogo({});
    expect(result.migrated).toBe(false);
  });
  it("falls back to localStorage when no DB legacy", () => {
    localStorage.setItem("ai_invoice_logo", "ls-logo-data");
    localStorage.setItem("ai_invoice_logo_size", "70");
    const result = migrateLegacyLogo({});
    expect(result.migrated).toBe(true);
    expect(result.orgSettings.branding.logoUrl).toBe("ls-logo-data");
    expect(result.orgSettings.branding.logoSize).toBe(70);
  });
});