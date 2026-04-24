/**
 * generateInvoicePdf — builds an invoice/quote PDF with native jsPDF vector text.
 * Produces selectable, ~15KB output.
 *
 * Renders a classic-layout A4 document mirroring the "classic" variant of
 * A4InvoiceDoc.jsx: accented header band, two-column bill-to/meta, items
 * table, totals, notes, footer. The other A4InvoiceDoc template variants
 * (modern/minimal/branded) still display in the on-screen preview; the emailed
 * attachment always uses this classic layout.
 */

// TODO: Rule 1 — file is 399 lines (cap 350). Extract drawHeaderBand + drawMetaRows helpers.
import jsPDF from "jspdf";

const PAGE_W = 210;
const ML = 18;
const MR = 18;
const CR = PAGE_W - MR;
const CONTENT_W = CR - ML;

const PT = 0.3528;
const ascent = (pt) => pt * 0.72 * PT;

function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return [30, 107, 224];
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [30, 107, 224];
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function setRgb(doc, rgb, kind = "text") {
  const [r, g, b] = rgb;
  if (kind === "text") doc.setTextColor(r, g, b);
  else if (kind === "draw") doc.setDrawColor(r, g, b);
  else if (kind === "fill") doc.setFillColor(r, g, b);
}

const INK = [26, 26, 26];
const BODY = [85, 85, 85];
const MUTED = [136, 136, 136];
const FAINT = [170, 170, 170];
const LINE = [235, 235, 235];
const STRIPE = [248, 248, 248];

const PAGE_H = 297;
const FOOT_Y = PAGE_H - 14;
const SAFE_BOTTOM = FOOT_Y - 8;
const CONT_TOP = 20;

function stampFooters(doc, org, footerText) {
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

function fmtMoney(sym, v) {
  return `${sym || "\u00A3"}${Number(v || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

function fmtDate(d) {
  if (!d) return "\u2014";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "\u2014";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function sanitize(s) {
  return String(s || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

/* ─── core builder ───────────────────────────────────────────────────────── */

function buildDoc({ data, currSymbol, isVat, orgSettings, accentColor, footerText }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const {
    docNumber, customer, issueDate, dueDate, paymentTerms, items = [],
    subtotal, discountAmount, shipping, taxBreakdown = [], cisDeduction, total,
    notes, terms, docType,
  } = data || {};

  const isQuote = docType === "quote";
  const docLabel = isQuote ? "Quote" : "Invoice";
  const sym = currSymbol || "\u00A3";
  const org = orgSettings || {};
  const accent = hexToRgb(accentColor || "#1e6be0");

  let y;
  function checkBreak(needed) {
    if (y + needed > SAFE_BOTTOM) {
      doc.addPage();
      y = CONT_TOP;
      return true;
    }
    return false;
  }

  /* ── HEADER BAND ── */
  const bandH = 32;
  setRgb(doc, accent, "fill");
  doc.rect(0, 0, PAGE_W, bandH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(org.orgName || "Your Company", ML, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const orgLines = [
    org.street, [org.city, org.country].filter(Boolean).join(", "),
    org.email, org.vatNum ? `VAT ${org.vatNum}` : null,
  ].filter(Boolean);
  y = 19;
  orgLines.forEach((ln) => { doc.text(ln, ML, y); y += 3.5; });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(docLabel.toUpperCase(), CR, 16, { align: "right" });
  doc.setFontSize(11);
  doc.text(docNumber || "INV-0001", CR, 22, { align: "right" });

  /* ── TWO-COLUMN BLOCK: Bill To + Meta ── */
  y = bandH + 10;
  const colW = (CONTENT_W - 8) / 2;
  const rightColX = ML + colW + 8;

  const labelStyle = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setRgb(doc, FAINT);
  };

  labelStyle();
  doc.text("BILL TO", ML, y);
  labelStyle();
  doc.text(`${docLabel.toUpperCase()} DETAILS`, rightColX, y);
  y += 5;

  const ba = customer?.billingAddress || {};
  const billLines = customer ? [
    customer.companyName || customer.name,
    customer.companyName && customer.name && customer.companyName !== customer.name ? customer.name : null,
    ba.street1 || ba.street,
    [ba.city, ba.zip || ba.postcode].filter(Boolean).join(", "),
    ba.country, customer.email,
  ].filter(Boolean) : ["No customer selected"];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setRgb(doc, BODY);
  let leftY = y;
  billLines.forEach((ln, i) => {
    if (i === 0) {
      doc.setFont("helvetica", "bold");
      setRgb(doc, INK);
    } else {
      doc.setFont("helvetica", "normal");
      setRgb(doc, BODY);
    }
    doc.text(String(ln), ML, leftY + ascent(9));
    leftY += 4.5;
  });

  const metaRows = [
    [`${docLabel} No`, docNumber || "INV-0001"],
    ["Issue Date", fmtDate(issueDate)],
    [isQuote ? "Valid Until" : "Due Date", fmtDate(dueDate)],
    [isQuote ? "Validity" : "Payment Terms", paymentTerms || (isQuote ? "Valid 30 days" : "Net 30")],
  ];
  let rightY = y;
  metaRows.forEach(([l, v]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setRgb(doc, MUTED);
    doc.text(l, rightColX, rightY + ascent(9));
    doc.setFont("helvetica", "bold");
    setRgb(doc, INK);
    doc.text(String(v), CR, rightY + ascent(9), { align: "right" });
    setRgb(doc, LINE, "draw");
    doc.setLineWidth(0.2);
    doc.line(rightColX, rightY + 5, CR, rightY + 5);
    rightY += 5;
  });

  y = Math.max(leftY, rightY) + 6;
  setRgb(doc, accent, "draw");
  doc.setLineWidth(0.6);
  doc.line(ML, y, CR, y);
  y += 5;

  /* ── ITEMS TABLE ── */
  const hasVat = !!isVat;
  const cols = hasVat
    ? [
        { key: "description", w: 0.42, a: "left",  label: "Description" },
        { key: "quantity",    w: 0.10, a: "right", label: "Qty" },
        { key: "rate",        w: 0.16, a: "right", label: "Unit Price" },
        { key: "tax",         w: 0.10, a: "right", label: "Tax" },
        { key: "amount",      w: 0.22, a: "right", label: "Amount" },
      ]
    : [
        { key: "description", w: 0.50, a: "left",  label: "Description" },
        { key: "quantity",    w: 0.12, a: "right", label: "Qty" },
        { key: "rate",        w: 0.18, a: "right", label: "Unit Price" },
        { key: "amount",      w: 0.20, a: "right", label: "Amount" },
      ];

  const xs = [];
  let cx = ML;
  cols.forEach((c) => { xs.push(cx); cx += c.w * CONTENT_W; });
  const widths = cols.map((c) => c.w * CONTENT_W);
  const pad = 3;

  const headH = 8;
  function drawTableHeader() {
    setRgb(doc, accent, "fill");
    doc.rect(ML, y, CONTENT_W, headH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    cols.forEach((c, i) => {
      const tx = c.a === "right" ? xs[i] + widths[i] - pad : xs[i] + pad;
      doc.text(c.label.toUpperCase(), tx, y + ascent(8) + 2.5, c.a === "right" ? { align: "right" } : undefined);
    });
    y += headH;
  }
  drawTableHeader();

  const visibleItems = items.filter((it) => (it.name || it.description) || Number(it.amount) > 0);
  visibleItems.forEach((it, idx) => {
    const descLines = [];
    const primary = it.name || `Item ${idx + 1}`;
    descLines.push({ text: primary, bold: true });
    if (it.description) descLines.push({ text: it.description, bold: false });

    const wrappedDesc = descLines
      .map((d) => doc.splitTextToSize(d.text, widths[0] - pad * 2).map((t) => ({ text: t, bold: d.bold })))
      .flat();
    const descH = wrappedDesc.length * 4.5 + 2;
    const rowH = Math.max(descH, 8);
    if (checkBreak(rowH)) drawTableHeader();

    if (idx % 2 === 0) {
      setRgb(doc, STRIPE, "fill");
      doc.rect(ML, y, CONTENT_W, rowH, "F");
    }

    let dy = y + ascent(9) + 1.5;
    wrappedDesc.forEach((d) => {
      doc.setFont("helvetica", d.bold ? "bold" : "normal");
      doc.setFontSize(d.bold ? 9 : 8);
      setRgb(doc, d.bold ? INK : BODY);
      doc.text(d.text, xs[0] + pad, dy);
      dy += 4.5;
    });

    const valueBase = y + ascent(9) + 1.5;
    cols.slice(1).forEach((c, ci) => {
      const i = ci + 1;
      const tx = c.a === "right" ? xs[i] + widths[i] - pad : xs[i] + pad;
      let value = "";
      if (c.key === "quantity") value = String(it.quantity ?? "\u2014");
      else if (c.key === "rate") value = fmtMoney(sym, it.rate);
      else if (c.key === "tax") value = hasVat ? `${it.tax_rate ?? 0}%` : "\u2014";
      else if (c.key === "amount") value = fmtMoney(sym, it.amount);
      doc.setFont("helvetica", c.key === "amount" ? "bold" : "normal");
      doc.setFontSize(9);
      setRgb(doc, c.key === "amount" ? INK : BODY);
      doc.text(value, tx, valueBase, c.a === "right" ? { align: "right" } : undefined);
    });

    setRgb(doc, LINE, "draw");
    doc.setLineWidth(0.2);
    doc.line(ML, y + rowH, CR, y + rowH);
    y += rowH;
  });

  /* ── TOTALS ── */
  const totalsW = 72;
  const totalsX = CR - totalsW;

  const rows = [
    ["Subtotal", fmtMoney(sym, subtotal || 0)],
    ...(Number(discountAmount) > 0 ? [["Discount", `\u2212 ${fmtMoney(sym, discountAmount)}`]] : []),
    ...(Number(shipping) > 0 ? [["Shipping", fmtMoney(sym, shipping)]] : []),
    ...(hasVat ? (taxBreakdown || []).map((tb) => [`VAT ${tb.rate}%`, fmtMoney(sym, tb.amount)]) : []),
    ...(Number(cisDeduction) > 0 ? [[isQuote ? "CIS Deduction (Est.)" : "CIS Deduction", `\u2212 ${fmtMoney(sym, cisDeduction)}`]] : []),
  ];
  checkBreak(4 + rows.length * 5 + 1 + 9 + 6);
  y += 4;
  rows.forEach(([l, v]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setRgb(doc, MUTED);
    doc.text(l, totalsX, y + ascent(9));
    setRgb(doc, BODY);
    doc.text(v, CR, y + ascent(9), { align: "right" });
    setRgb(doc, LINE, "draw");
    doc.setLineWidth(0.2);
    doc.line(totalsX, y + 5, CR, y + 5);
    y += 5;
  });

  y += 1;
  const totalBarH = 9;
  setRgb(doc, accent, "fill");
  doc.rect(totalsX - 2, y, totalsW + 2, totalBarH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(isQuote ? "Quote Total" : "Total Due", totalsX + 2, y + ascent(10) + 2);
  doc.setFontSize(11);
  doc.text(fmtMoney(sym, total || 0), CR - 2, y + ascent(11) + 2, { align: "right" });
  y += totalBarH + 6;

  /* ── NOTES / TERMS ── */
  if (notes || terms) {
    checkBreak(30);
    setRgb(doc, LINE, "draw");
    doc.setLineWidth(0.2);
    doc.line(ML, y, CR, y);
    y += 4;

    const blocks = [];
    if (notes) blocks.push({ label: "NOTES", text: notes });
    if (terms) blocks.push({ label: "PAYMENT TERMS", text: terms });

    const colCount = blocks.length;
    const bcW = (CONTENT_W - (colCount - 1) * 6) / colCount;
    let bx = ML;
    let maxH = 0;
    blocks.forEach((b) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setRgb(doc, FAINT);
      doc.text(b.label, bx, y + ascent(7));

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setRgb(doc, BODY);
      const lines = doc.splitTextToSize(String(b.text), bcW);
      let by = y + 5;
      lines.forEach((ln) => {
        doc.text(ln, bx, by + ascent(8));
        by += 4;
      });
      maxH = Math.max(maxH, by - y);
      bx += bcW + 6;
    });
    y += maxH + 4;
  }

  stampFooters(doc, org, footerText);
  return doc;
}

/* ─── public API ─────────────────────────────────────────────────────────── */

/**
 * Build an invoice/quote PDF and return it as a Blob (for email attachment).
 *
 * @returns {Promise<{ success: true, blob: Blob, filename: string } | { success: false, error: string }>}
 */
export async function generateInvoicePdfBlob({ data, currSymbol, isVat, orgSettings, accentColor, footerText }) {
  try {
    const docNum = sanitize(data?.docNumber || "document");
    const docTypeLabel = data?.docType === "quote" ? "Quote" : "Invoice";
    const filename = `${docTypeLabel}-${docNum}.pdf`;
    const doc = buildDoc({ data, currSymbol, isVat, orgSettings, accentColor, footerText });
    const blob = doc.output("blob");
    return { success: true, blob, filename };
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed" };
  }
}
