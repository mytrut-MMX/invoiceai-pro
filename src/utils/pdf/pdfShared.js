import jsPDF from "jspdf";

export const PAGE_W = 210;
export const ML = 18;
export const MR = 18;
export const CR = PAGE_W - MR;
export const CONTENT_W = CR - ML;
export const PAGE_H = 297;
export const FOOT_Y = PAGE_H - 14;
export const SAFE_BOTTOM = FOOT_Y - 8;
export const CONT_TOP = 20;

export const PT = 0.3528;
export const ascent = (pt) => pt * 0.72 * PT;

export const INK = [26, 26, 26];
export const BODY = [85, 85, 85];
export const MUTED = [136, 136, 136];
export const FAINT = [170, 170, 170];
export const LINE = [235, 235, 235];
export const STRIPE = [248, 248, 248];

export function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return [30, 107, 224];
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [30, 107, 224];
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function setRgb(doc, rgb, kind = "text") {
  const [r, g, b] = rgb;
  if (kind === "text") doc.setTextColor(r, g, b);
  else if (kind === "draw") doc.setDrawColor(r, g, b);
  else if (kind === "fill") doc.setFillColor(r, g, b);
}

export function fmtMoney(sym, v) {
  return `${sym || "£"}${Number(v || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

export function fmtDate(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function sanitize(s) {
  return String(s || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function stampFooters(doc, org, footerText) {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setRgb(doc, LINE, "draw");
    doc.setLineWidth(0.2);
    doc.line(ML, FOOT_Y - 4, CR, FOOT_Y - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setRgb(doc, FAINT);
    if (footerText) {
      const lines = doc.splitTextToSize(footerText, CONTENT_W);
      let fy = FOOT_Y;
      lines.forEach((ln) => { doc.text(ln, PAGE_W / 2, fy, { align: "center" }); fy += 3.2; });
    } else {
      const left = [org.orgName, org.vatNum ? `VAT ${org.vatNum}` : null, org.crn ? `CRN ${org.crn}` : null]
        .filter(Boolean).join(" · ");
      doc.text(left, ML, FOOT_Y);
      doc.text(`Page ${p} of ${totalPages}`, CR, FOOT_Y, { align: "right" });
    }
  }
}

export function blendWithWhite(rgb, opacity) {
  return rgb.map((c) => Math.round(255 - (255 - c) * opacity));
}

export function createDoc() {
  return new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
}

export function createBreaker() {
  const state = { y: 0 };
  function checkBreak(doc, needed) {
    if (state.y + needed > SAFE_BOTTOM) {
      doc.addPage();
      state.y = CONT_TOP;
      return true;
    }
    return false;
  }
  return {
    checkBreak,
    get y() { return state.y; },
    set y(val) { state.y = val; },
  };
}

/**
 * Resolves a logo URL (http/https or data:) into a data URL string for jsPDF.
 * Returns "" on failure.
 */
export async function resolveLogoDataUrl(logoUrl) {
  if (!logoUrl) return "";
  if (logoUrl.startsWith("data:")) return logoUrl;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return "";
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

/**
 * Detects image format from a data URL. Defaults to PNG.
 */
export function detectImageFormat(dataUrl) {
  if (!dataUrl) return "PNG";
  const m = /^data:image\/([a-zA-Z0-9+]+)/.exec(dataUrl);
  if (!m) return "PNG";
  const fmt = m[1].toUpperCase();
  if (fmt === "JPG" || fmt === "JPEG") return "JPEG";
  if (fmt === "PNG") return "PNG";
  if (fmt === "WEBP") return "WEBP";
  // jsPDF doesn't support SVG raster — caller should rasterize first
  if (fmt === "SVG+XML") return "PNG";
  return "PNG";
}

/**
 * Resolves logoSize string ("small"|"medium"|"large") OR number to mm height.
 * Defaults to medium (16mm).
 */
export function resolveLogoSizeMm(size) {
  if (typeof size === "number") return Math.max(6, Math.min(40, size / 3));
  if (size === "small") return 10;
  if (size === "large") return 22;
  return 16;
}

/**
 * Draws a logo on the current page given a resolved data URL.
 * Returns { width, height } actually used in mm, or null if not drawn.
 */
export function drawLogo(doc, dataUrl, { x, y, size = "medium", maxWidth = 60 }) {
  if (!dataUrl) return null;
  const heightMm = resolveLogoSizeMm(size);
  const widthMm = Math.min(maxWidth, heightMm * 3); // 3:1 max aspect cap
  try {
    const fmt = detectImageFormat(dataUrl);
    doc.addImage(dataUrl, fmt, x, y, widthMm, heightMm, undefined, "FAST");
    return { width: widthMm, height: heightMm };
  } catch {
    return null;
  }
}
