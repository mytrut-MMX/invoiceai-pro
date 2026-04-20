/**
 * generateCISStatementPdf — builds a CIS Payment & Deduction Statement PDF
 * with native jsPDF vector text. Selectable text, ~15KB output.
 *
 * Layout replicates the Alliance Facade Services HMRC reference PDF:
 * Helvetica (Nimbus Sans analogue), line color #ccced2, margins 21mm sides.
 * Font sizes: 19.2 / 15.6 / 12.6 / 7.8 pt. Footer is pinned to absolute Y
 * coordinates (pageHeight - 27 / -25 / -18) so body content cannot push it.
 */

import jsPDF from "jspdf";

/* ─── layout constants ───────────────────────────────────────────────────── */

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 21;
const MR = 21;
const MT = 16;
const CR = PAGE_W - MR;

const LINE = [204, 206, 210];        // #ccced2

const PT = 0.3528;                    // 1pt -> mm

const F_TITLE = 19.2;
const F_NAME = 15.6;
const F_HEADING = 12.6;
const F_BODY = 7.8;

/* Helvetica ascent ≈ 0.72 × fontSize (baseline-to-top) */
const ascent = (pt) => pt * 0.72 * PT;
/* Full line height in mm */
const lineH = (pt) => pt * PT;

/* ─── formatting helpers ─────────────────────────────────────────────────── */

const NUM = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmt = (v) => NUM.format(Number(v || 0));

function fmtShort(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtLong(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function fmtMonthYear(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-GB", {
    month: "long", year: "numeric",
  });
}

function periodRange(start, end) {
  if (!start || !end) return "\u2014";
  const s = new Date(start);
  const e = new Date(end);
  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMonth = s.toLocaleDateString("en-GB", { month: "long" });
  const eMonth = e.toLocaleDateString("en-GB", { month: "long" });
  const eYear = e.getFullYear();
  if (s.getFullYear() === eYear) {
    return `${sDay} ${sMonth} to ${eDay} ${eMonth} ${eYear}`;
  }
  return `${sDay} ${sMonth} ${s.getFullYear()} to ${eDay} ${eMonth} ${eYear}`;
}

function sanitize(s) {
  return String(s || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function filenameFor({ subcontractor, period }) {
  const name = subcontractor?.name || "Subcontractor";
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : name;
  const dateIso = period?.period_end
    ? new Date(period.period_end).toISOString().split("T")[0]
    : "";
  return `CIS_PDS_${sanitize(last)}_${sanitize(dateIso)}.pdf`;
}

/* ─── drawing primitives ─────────────────────────────────────────────────── */

function setLinePen(doc) {
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setLineWidth(0.75 * PT);
}

/**
 * Section heading: bold 12.6pt label with full-width rule 4pt below baseline.
 * Returns the rule Y — caller is expected to add the explicit mm gap
 * (usually 13mm) before drawing content below.
 */
function drawSectionHeading(doc, text, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(F_HEADING);
  doc.setTextColor(17, 17, 17);

  const baseline = y + ascent(F_HEADING);
  doc.text(text, ML, baseline);
  const ruleY = baseline + 4 * PT;
  setLinePen(doc);
  doc.line(ML, ruleY, CR, ruleY);
  return ruleY;
}

/**
 * KV row (fixed 10mm height, matching Alliance row-to-row rhythm).
 * Label left, value right, bottom rule at y + 10.
 */
function drawKVRow(doc, label, value, xL, xR, y, { bold = false, mono = false } = {}) {
  const rowH = 8;
  const baseline = y + 5.2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(F_BODY);
  doc.setTextColor(34, 34, 34);
  doc.text(label, xL, baseline);

  doc.setFont(mono ? "courier" : "helvetica", bold ? "bold" : "normal");
  doc.setTextColor(17, 17, 17);
  doc.text(String(value), xR, baseline, { align: "right" });

  const ruleY = y + rowH;
  setLinePen(doc);
  doc.line(xL, ruleY, xR, ruleY);
  return ruleY;
}

/**
 * 9-column source invoices table.
 * Header row (7mm), then a 2mm extra gap, then data rows (7mm each) —
 * giving ~9mm from header baseline to first data row baseline.
 */
function drawInvoicesTable(doc, rows, y) {
  const widthW = CR - ML;
  const cols = [
    { label: "Reference",    w: 0.14, align: "left" },
    { label: "Invoice date", w: 0.12, align: "left" },
    { label: "Payment date", w: 0.14, align: "left" },
    { label: "Gross (A)",    w: 0.09, align: "right" },
    { label: "Materials",    w: 0.10, align: "right" },
    { label: "Non-CIS",      w: 0.09, align: "right" },
    { label: "Labour",       w: 0.10, align: "right" },
    { label: "CIS (B)",      w: 0.08, align: "right" },
    { label: "Paid (A - B)", w: 0.14, align: "right" },
  ];

  const colX = [];
  let cx = ML;
  for (const c of cols) {
    colX.push(cx);
    cx += c.w * widthW;
  }
  const rightEdges = colX.map((x, i) => x + cols[i].w * widthW);

  const hPad = 1;
  const headerH = 6;
  const rowH = 6;
  const headerToRowGap = 0;

  setLinePen(doc);
  doc.line(ML, y, CR, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(F_BODY);
  doc.setTextColor(17, 17, 17);
  const headerBase = y + 4;
  cols.forEach((c, i) => {
    const tx = c.align === "right" ? rightEdges[i] - hPad : colX[i] + hPad;
    doc.text(c.label, tx, headerBase, c.align === "right" ? { align: "right" } : undefined);
  });
  y += headerH;
  doc.line(ML, y, CR, y);

  y += headerToRowGap;

  doc.setFont("helvetica", "normal");
  for (const r of rows) {
    const rowBase = y + 4;
    const values = [
      r.reference || "\u2014",
      r.invoice_date ? fmtMonthYear(r.invoice_date) : "\u2014",
      fmtLong(r.payment_date),
      fmt(r.gross),
      fmt(r.materials),
      fmt(r.non_cis),
      fmt(r.labour),
      fmt(r.cis),
      fmt(r.paid),
    ];
    cols.forEach((c, i) => {
      const tx = c.align === "right" ? rightEdges[i] - hPad : colX[i] + hPad;
      doc.text(String(values[i]), tx, rowBase, c.align === "right" ? { align: "right" } : undefined);
    });
    y += rowH;
    doc.line(ML, y, CR, y);
  }
  return y;
}

/**
 * Footer pinned to absolute Y (not affected by body content length):
 *   - rule at pageH - 27  (y = 270)
 *   - disclaimer baseline at pageH - 25  (y = 272)
 *   - page strip baseline at pageH - 18  (y = 279)
 */
function drawPinnedFooter(doc, contractorName, { skipDisclaimer = false } = {}) {
  if (!skipDisclaimer) {
    setLinePen(doc);
    doc.line(ML, PAGE_H - 27, CR, PAGE_H - 27);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(F_BODY);
    doc.setTextColor(119, 119, 119);
    const footerText =
      "This statement is issued under the HMRC Construction Industry Scheme " +
      "(CIS340), Appendix E. Contractors must provide it to subcontractors " +
      "within 14 days of the end of each tax month. Keep this record for your " +
      `tax return. Generated by InvoiceSaga on ${fmtShort(new Date())}.`;
    const wrapped = doc.splitTextToSize(footerText, CR - ML);
    const discBase = PAGE_H - 25;
    wrapped.forEach((line, i) => {
      doc.text(line, ML, discBase + i * F_BODY * 1.4 * PT);
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(F_BODY);
  doc.setTextColor(153, 153, 153);
  const stripY = PAGE_H - 18;
  doc.text(
    `CIS Payment Deduction Statement | ${contractorName || "\u2014"}`,
    ML, stripY,
  );
  doc.text("1 of 1", CR, stripY, { align: "right" });
}

/* ─── main builder ───────────────────────────────────────────────────────── */

function buildDoc({ contractor = {}, subcontractor = {}, period = {}, amounts = {}, invoices }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const grossN = Number(amounts.gross_amount || 0);
  const materialsN = Number(amounts.materials_amount || 0);
  const cisN = Number(amounts.cis_deducted || 0);
  const liable = Math.max(0, grossN - materialsN);
  const netPaid = grossN - cisN;
  const rate = amounts.cis_rate_used;

  const invRows = Array.isArray(invoices) && invoices.length > 0
    ? invoices
    : [{
        reference: period?.label ? `Summary \u2014 ${period.label}` : "Summary",
        invoice_date: null,
        payment_date: period?.period_end,
        gross: grossN,
        materials: materialsN,
        non_cis: 0,
        labour: liable,
        cis: cisN,
        paid: netPaid,
      }];

  let y = MT;

  /* ── TITLE ── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(F_TITLE);
  doc.setTextColor(17, 17, 17);
  doc.text("Construction Industry Scheme", ML, y + ascent(F_TITLE));
  y += lineH(F_TITLE) + 2;                            // title → subtitle: 2mm

  /* ── SUBTITLE ── */
  doc.text("Payment and Deduction Statement", ML, y + ascent(F_TITLE));
  y += lineH(F_TITLE) + 8;                            // subtitle → name: 8mm

  /* ── CONTRACTOR NAME ── */
  doc.setFontSize(F_NAME);
  doc.text(contractor.name || "\u2014", ML, y + ascent(F_NAME));
  y += lineH(F_NAME) + 2;                             // name → period: 2mm

  /* ── PERIOD ── */
  doc.text(
    `For the period ${periodRange(period.period_start, period.period_end)}`,
    ML, y + ascent(F_NAME),
  );
  y += lineH(F_NAME) + 14;                            // period → Contractor details: 14mm

  /* ── CONTRACTOR DETAILS ── */
  y = drawSectionHeading(doc, "Contractor details", y) + 8;    // heading → content: 8mm

  doc.setFont("helvetica", "bold");
  doc.setFontSize(F_BODY);
  doc.setTextColor(17, 17, 17);
  doc.text(contractor.name || "\u2014", ML, y + ascent(F_BODY));
  y += lineH(F_BODY);

  if (contractor.address) {
    y += 1;
    doc.text(contractor.address, ML, y + ascent(F_BODY));
    y += lineH(F_BODY);
  }

  y += 4;                                             // small gap before KV rows

  y = drawKVRow(doc, "Payment and deduction made in tax month ended",
                fmtShort(period.period_end), ML, CR, y);
  y = drawKVRow(doc, "Employer\u2019s PAYE reference",
                contractor.employer_paye_ref || "\u2014",
                ML, CR, y, { mono: true });
  if (contractor.accounts_office_ref) {
    y = drawKVRow(doc, "Accounts Office reference",
                  contractor.accounts_office_ref,
                  ML, CR, y, { mono: true });
  }

  /* ── SUBCONTRACTOR DETAILS ── */
  y += 12;                                            // last row → Subcontractor heading: 12mm
  y = drawSectionHeading(doc, "Subcontractor details", y) + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(F_BODY);
  doc.setTextColor(17, 17, 17);
  doc.text(subcontractor.name || "\u2014", ML, y + ascent(F_BODY));
  y += lineH(F_BODY);

  if (subcontractor.address) {
    y += 1;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(34, 34, 34);
    doc.text(subcontractor.address, ML, y + ascent(F_BODY));
    y += lineH(F_BODY);
  }

  y += 8 - lineH(F_BODY);                             // name → first data row: 8mm

  /* ── TWO-COLUMN IDENTIFIERS / AMOUNTS ── */
  const contentW = CR - ML;
  const colW = 0.487 * contentW;
  const leftXR = ML + colW;
  const rightXL = CR - colW;

  const yStart = y;
  let yL = yStart;
  let yR = yStart;

  yL = drawKVRow(doc, "Unique taxpayers reference",
                 subcontractor.utr || "\u2014",
                 ML, leftXR, yL, { mono: true });
  yL = drawKVRow(doc, "Verification number",
                 subcontractor.verification_number
                   || (rate === "gross_0" ? "N/A" : "\u2014"),
                 ML, leftXR, yL, { mono: true });

  yR = drawKVRow(doc, "Gross paid (excl VAT) (A)", fmt(grossN), rightXL, CR, yR);
  yR = drawKVRow(doc, "Less cost of materials", fmt(materialsN), rightXL, CR, yR);
  yR = drawKVRow(doc, "Less non-CIS", fmt(0), rightXL, CR, yR);
  yR = drawKVRow(doc, "Liable to deduction", fmt(liable), rightXL, CR, yR);
  yR = drawKVRow(doc, "Deducted (B)", fmt(cisN), rightXL, CR, yR);
  yR = drawKVRow(doc, "Paid (A - B)", fmt(netPaid), rightXL, CR, yR, { bold: true });

  y = Math.max(yL, yR);

  /* ── SOURCE INVOICES ── */
  y += 12;                                            // last amount row → heading: 12mm
  y = drawSectionHeading(doc, "Source invoices", y) + 8;  // heading → table header: 8mm
  const yAfterTable = drawInvoicesTable(doc, invRows, y);

  /* ── PINNED FOOTER (absolute Y) ── */
  const wouldCollide = yAfterTable > PAGE_H - 35;
  if (wouldCollide) {
    console.warn(
      `[cis-pds] body content extends to y=${yAfterTable.toFixed(1)}mm, ` +
      `past the footer safety threshold (y=${PAGE_H - 35}mm). ` +
      "Skipping HMRC disclaimer to avoid overlap.",
    );
  }
  drawPinnedFooter(doc, contractor.name, { skipDisclaimer: wouldCollide });

  return doc;
}

/* ─── public API ─────────────────────────────────────────────────────────── */

/**
 * Download a CIS PDS as a native-text PDF.
 * @returns {Promise<{ success: boolean, filename?: string, error?: string }>}
 */
export async function generateCISStatementPdf({ contractor, subcontractor, period, amounts, invoices }) {
  try {
    const filename = filenameFor({ subcontractor, period });
    const doc = buildDoc({ contractor, subcontractor, period, amounts, invoices });
    doc.save(filename);
    return { success: true, filename };
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed" };
  }
}

/**
 * Produce a CIS PDS PDF as a Blob (for ZIP / email attachment).
 * @returns {Promise<{ success: boolean, filename?: string, blob?: Blob, error?: string }>}
 */
export async function generateCISStatementBlob({ contractor, subcontractor, period, amounts, invoices }) {
  try {
    const filename = filenameFor({ subcontractor, period });
    const doc = buildDoc({ contractor, subcontractor, period, amounts, invoices });
    const blob = doc.output("blob");
    return { success: true, filename, blob };
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed" };
  }
}
