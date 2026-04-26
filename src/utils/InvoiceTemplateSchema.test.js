import { describe, it, expect, beforeEach } from "vitest";

// Polyfill localStorage + window for node test env (vitest defaults to node here)
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}
if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis;
}

const { getTemplates, saveTemplate, STORAGE_KEY, TEMPLATE_STORAGE_VERSION, DEFAULT_TEMPLATE } =
  await import("./InvoiceTemplateSchema");

beforeEach(() => localStorage.clear());

describe("template schema migration v1 → v2", () => {
  it("DEFAULT_TEMPLATE has showLogo: true", () => {
    expect(DEFAULT_TEMPLATE.layout.showLogo).toBe(true);
  });

  it("v1 template gets showLogo: true after read", () => {
    const v1Payload = {
      version: 1,
      templates: [{ id: "tpl_x", name: "Old", layout: { colorScheme: "classic" } }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1Payload));

    const templates = getTemplates();
    expect(templates[0].layout.showLogo).toBe(true);
  });

  it("v1 array-only payload migrates", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: "a", layout: {} },
      { id: "b", layout: { showLogo: false } }, // explicit false preserved
    ]));
    const templates = getTemplates();
    expect(templates[0].layout.showLogo).toBe(true);
    expect(templates[1].layout.showLogo).toBe(false);
  });

  it("migrated templates persist back at version 2", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, templates: [{ id: "a", layout: {} }] }));
    getTemplates(); // triggers migration write
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.version).toBe(TEMPLATE_STORAGE_VERSION);
    expect(stored.templates[0].layout.showLogo).toBe(true);
  });

  it("v2 templates pass through unchanged", () => {
    const v2 = { version: 2, templates: [{ id: "x", layout: { showLogo: false } }] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2));
    const templates = getTemplates();
    expect(templates[0].layout.showLogo).toBe(false);
  });

  it("saveTemplate preserves showLogo", () => {
    const t = saveTemplate({ name: "T", layout: { showLogo: false } });
    expect(t.layout.showLogo).toBe(false);
  });
});
