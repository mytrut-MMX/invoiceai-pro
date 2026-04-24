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
