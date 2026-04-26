import { describe, it, expect } from "vitest";
import { detectImageFormat, resolveLogoSizeMm } from "./pdfShared";

describe("detectImageFormat", () => {
  it("PNG default for empty/invalid", () => {
    expect(detectImageFormat("")).toBe("PNG");
    expect(detectImageFormat(null)).toBe("PNG");
    expect(detectImageFormat("not-a-data-url")).toBe("PNG");
  });
  it("detects PNG", () => {
    expect(detectImageFormat("data:image/png;base64,iVBOR...")).toBe("PNG");
  });
  it("detects JPEG (both jpg and jpeg)", () => {
    expect(detectImageFormat("data:image/jpeg;base64,/9j/...")).toBe("JPEG");
    expect(detectImageFormat("data:image/jpg;base64,/9j/...")).toBe("JPEG");
  });
  it("detects WEBP", () => {
    expect(detectImageFormat("data:image/webp;base64,UklGR...")).toBe("WEBP");
  });
  it("falls back to PNG for SVG (jsPDF can't render)", () => {
    expect(detectImageFormat("data:image/svg+xml;base64,PHN2...")).toBe("PNG");
  });
});

describe("resolveLogoSizeMm", () => {
  it("medium default", () => {
    expect(resolveLogoSizeMm()).toBe(16);
    expect(resolveLogoSizeMm("medium")).toBe(16);
  });
  it("small / large", () => {
    expect(resolveLogoSizeMm("small")).toBe(10);
    expect(resolveLogoSizeMm("large")).toBe(22);
  });
  it("numeric input divides by 3 with clamp", () => {
    expect(resolveLogoSizeMm(48)).toBe(16); // 48/3=16
    expect(resolveLogoSizeMm(10)).toBe(6);  // clamp lower bound
    expect(resolveLogoSizeMm(200)).toBe(40); // clamp upper bound
  });
});
