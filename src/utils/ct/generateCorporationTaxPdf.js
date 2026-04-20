/**
 * generateCorporationTaxPdf — builds a Corporation Tax estimate PDF with native
 * jsPDF vector text. Selectable, ~15KB output.
 *
 * Estimate only — not a CT600 submission. Disclaimer rendered in the PDF.
 */

import jsPDF from "jspdf";

/* ─── layout ─────────────────────────────────────────────────────────────── */

const PAGE_W = 210;
const ML = 16;
const MR = 16;
const MT = 18;
const CR = PAGE_W - MR;

const PT = 0.3528;
const ascent = (pt) => pt * 0.72 * PT;

const HEADING = [26, 26, 46];      // #1a1a2e
const BODY = [55, 65, 81];         // #374151
const MUTED = [107, 114, 128];     // #6b7280
const FAINT = [156, 163, 175];     // #9ca3af
const BORDER = [226, 232, 240];    // #e2e8f0
const LIGHT_BG = [248, 250, 252];  // #f8fafc
const POSITIVE = [22, 163, 74];    // #16a34a
const WARNING_FG = [146, 64, 14];  // #92400e
const WARNING_BG = [255, 251, 235];// #fffbeb
const WARNING_BD = [253, 230, 138];// #fde68a

const BRACKET_BADGE = {
  loss:          { label: "Loss \u2014 no CT",                bg: [243, 244, 246], fg: [55, 65, 81],   bd: [209, 213, 219] },
  small:         { label: "Small profits rate (19%)",          bg: [240, 253, 244], fg: [22, 101, 52],  bd: [187, 247, 208] },
  marginal_zone: { label: "Marginal zone (using main rate)",   bg: [255, 251, 235], fg: [146, 64, 14],  bd: [253, 230, 138] },
  main:          { label: "Main rate (25%)",                   bg: [239, 246, 255], fg: [29, 78, 216],  bd: [191, 219, 254] },
};

/* ─── formatting ─────────────────────────────────────────────────────────── */

const GBP0 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const GBP2 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtGbp0 = (v) => (v == null || v === "" ? "\u2014" : GBP0.format(Number(v)));
const fmtGbp2 = (v) => (v == null || v === "" ? "\u2014" : GBP2.format(Number(v)));

function fmtDate(d) {
  if (!d) return "\u2014";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "\u2014";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function sanitize(s) {
  return String(s || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function filenameFor({ company, period }) {
  const name = company?.companyName || company?.name || "Company";
  const dateIso = period?.period_end
    ? new Date(period.period_end).toISOString().split("T")[0]
    : "";
  return `CT600_${sanitize(name)}_${sanitize(dateIso)}.pdf`;
}

/* ─── drawing helpers ────────────────────────────────────────────────────── */

function setRgb(doc, rgb, kind = "text") {
  const [r, g, b] = rgb;
  if (kind === "text") doc.setTextColor(r, g, b);
  else if (kind === "draw") doc.setDrawColor(r, g, b);
  else if (kind === "fill") doc.setFillColor(r, g, b);
}

function drawFilledRect(doc, x, y, w, h, fill, border) {
  setRgb(doc, fill, "fill");
  if (border) {
    setRgb(doc, border, "draw");
    doc.setLineWidth(0.25);
    doc.rect(x, y, w, h, "FD");
  } else {
    doc.rect(x, y, w, h, "F");
  }
}

/**
 * Single label/value row with a thin bottom rule.
 */
function drawComputationRow(doc, label, value, y, {
  bold = false, highlight = false, colorFg, fontSize = 9,
} = {}) {
  const pad = 10 * PT;
  const rowH = pad + ascent(fontSize) + pad;

  if (highlight) {
    drawFilledRect(doc, ML, y, CR - ML, rowH, LIGHT_BG);
  }

  const baseline = y + pad + ascent(fontSize);

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  setRgb(doc, colorFg || (bold ? HEADING : BODY));
  doc.text(label, ML + 4, baseline);

  doc.setFont("helvetica", bold ? "bold" : "normal");
  setRgb(doc, colorFg || HEADING);
  doc.text(String(value), CR - 4, baseline, { align: "right" });

  setRgb(doc, BORDER, "draw");
  doc.setLineWidth(0.2);
  doc.line(ML, y + rowH, CR, y + rowH);

  return y + rowH;
}

/* ─── main builder ───────────────────────────────────────────────────────── */

function buildDoc({ company = {}, period = {}, calc = {} }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const bracket = BRACKET_BADGE[calc.rateBracket] || null;
  const warnings = Array.isArray(calc.warnings) ? calc.warnings : [];

  const associatedCount = Number(calc.associatedCompaniesCount) || 0;
  const augmentedAdj = Number(calc.augmentedProfitsAdjustment) || 0;
  const marginalRelief = Number(calc.marginalRelief) || 0;
  const lossIn = Number(period.loss_carried_forward_in) || 0;
  const taxAdjProfit = Number(calc.taxAdjustedProfit) || 0;
  const lossUsed = lossIn > 0 && taxAdjProfit > 0 ? Math.min(lossIn, taxAdjProfit) : 0;

  let y = MT;

  /* ── HEADER ── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setRgb(doc, HEADING);
  y += ascent(18);
  doc.text("Corporation Tax Estimate", ML, y);

  y += 8;
  doc.setFontSize(9);
  setRgb(doc, MUTED);
  doc.setFont("helvetica", "bold");
  doc.text("CT600 \u2014 DRAFT FOR ACCOUNTANT REVIEW", ML, y);

  y += 3;
  setRgb(doc, HEADING, "draw");
  doc.setLineWidth(0.6);
  doc.line(ML, y, CR, y);
  y += 8;

  /* ── COMPANY + PERIOD META (two-column) ── */
  const metaTopY = y;
  const rightColX = CR - 70;

  doc.setFontSize(8);
  setRgb(doc, MUTED);
  doc.setFont("helvetica", "bold");
  doc.text("COMPANY", ML, y + ascent(8));

  doc.setFontSize(10);
  setRgb(doc, HEADING);
  doc.text(company.companyName || company.name || "\u2014", ML, y + ascent(8) + 5);

  doc.setFontSize(9);
  setRgb(doc, BODY);
  doc.setFont("helvetica", "normal");
  doc.text("CRN: ", ML, y + ascent(8) + 10);
  doc.setFont("courier", "bold");
  setRgb(doc, HEADING);
  const crnLabelW = doc.getTextWidth("CRN: ");
  doc.text(company.crn || "\u2014", ML + crnLabelW, y + ascent(8) + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setRgb(doc, MUTED);
  doc.text("ACCOUNTING PERIOD", rightColX, y + ascent(8));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setRgb(doc, BODY);
  const metaRows = [
    ["Start:", fmtDate(period.period_start)],
    ["End:", fmtDate(period.period_end)],
    ["Payment due:", fmtDate(period.payment_due_date)],
    ["Filing due:", fmtDate(period.filing_due_date)],
  ];
  metaRows.forEach((row, i) => {
    const rowY = y + ascent(8) + 5 + i * 4;
    doc.setFont("helvetica", "normal");
    setRgb(doc, BODY);
    doc.text(row[0], rightColX, rowY);
    doc.setFont("helvetica", "bold");
    setRgb(doc, HEADING);
    doc.text(row[1], CR, rowY, { align: "right" });
  });

  y = metaTopY + 25;

  /* ── BRACKET BADGE ── */
  if (bracket) {
    const label = bracket.label;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const textW = doc.getTextWidth(label);
    const badgeW = textW + 10;
    const badgeH = 6;
    drawFilledRect(doc, ML, y, badgeW, badgeH, bracket.bg, bracket.bd);
    setRgb(doc, bracket.fg);
    doc.text(label, ML + 5, y + ascent(9) + 1.2);
    y += badgeH + 6;
  }

  /* ── COMPUTATION TABLE ── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setRgb(doc, MUTED);
  const headBase = y + ascent(8) + 2;
  doc.text("COMPUTATION", ML + 4, headBase);
  doc.text("AMOUNT", CR - 4, headBase, { align: "right" });
  y = headBase + 2;
  setRgb(doc, BORDER, "draw");
  doc.setLineWidth(0.4);
  doc.line(ML, y, CR, y);

  y = drawComputationRow(doc, "Accounting profit", fmtGbp2(calc.accountingProfit), y);
  y = drawComputationRow(doc, "+ Disallowable expenses", fmtGbp2(calc.disallowableExpenses), y);
  y = drawComputationRow(doc, "\u2212 Capital allowances", fmtGbp2(calc.capitalAllowances), y);
  y = drawComputationRow(doc, "\u00B1 Other adjustments", fmtGbp2(calc.otherAdjustments), y);

  if (associatedCount > 0) {
    y = drawComputationRow(doc, "Associated companies", String(associatedCount), y);
  }
  if (augmentedAdj > 0) {
    y = drawComputationRow(doc, "Augmented profits adjustment", fmtGbp2(augmentedAdj), y);
  }
  if (lossIn > 0) {
    y = drawComputationRow(doc, "Losses brought forward", fmtGbp2(lossIn), y);
  }

  y = drawComputationRow(doc, "= Tax-adjusted profit", fmtGbp2(calc.taxAdjustedProfit), y,
                         { bold: true, highlight: true, fontSize: 10 });

  y = drawComputationRow(doc, "CT rate applied",
                         calc.ctRateApplied == null ? "\u2014" : `${calc.ctRateApplied}%`, y);

  if (lossUsed > 0) {
    y = drawComputationRow(doc, "Loss relief applied", `\u2212${fmtGbp0(lossUsed)}`, y);
  }
  if (marginalRelief > 0) {
    y = drawComputationRow(doc, "Marginal relief", `\u2212${fmtGbp0(marginalRelief)}`, y);
  }

  y = drawComputationRow(doc, "Estimated Corporation Tax", fmtGbp0(calc.ctEstimated), y,
                         { bold: true, colorFg: POSITIVE, fontSize: 11 });

  /* ── WARNINGS ── */
  if (warnings.length > 0) {
    y += 6;
    const warnStart = y;
    const lines = warnings.map((w) => doc.splitTextToSize(`\u26A0 ${w}`, CR - ML - 8)).flat();
    const boxH = 6 + lines.length * 4.5;
    drawFilledRect(doc, ML, y, CR - ML, boxH, WARNING_BG, WARNING_BD);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setRgb(doc, WARNING_FG);
    doc.text("WARNINGS", ML + 4, y + ascent(8) + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let wy = y + ascent(8) + 2 + 5;
    lines.forEach((ln) => {
      doc.text(ln, ML + 4, wy);
      wy += 4.5;
    });
    y = warnStart + boxH;
  }

  /* ── NOTES ── */
  if (calc.notes) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setRgb(doc, MUTED);
    doc.text("NOTES", ML, y + ascent(8));
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setRgb(doc, BODY);
    const lines = doc.splitTextToSize(String(calc.notes), CR - ML);
    lines.forEach((ln) => {
      y += ascent(9);
      doc.text(ln, ML, y);
      y += 2;
    });
  }

  /* ── DISCLAIMER ── */
  y += 10;
  const discLines = doc.splitTextToSize(
    "Disclaimer. This is an estimate generated by InvoiceSaga based on inputs provided. " +
    "It is not a CT600 tax return. Consult your accountant before submission to HMRC.",
    CR - ML - 8,
  );
  const discH = 6 + discLines.length * 4.5;
  drawFilledRect(doc, ML, y, CR - ML, discH, LIGHT_BG, BORDER);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setRgb(doc, BODY);
  let dy = y + ascent(9) + 3;
  discLines.forEach((ln, i) => {
    if (i === 0) {
      doc.setFont("helvetica", "bold");
      setRgb(doc, HEADING);
      const labelW = doc.getTextWidth("Disclaimer. ");
      doc.text("Disclaimer.", ML + 4, dy);
      doc.setFont("helvetica", "normal");
      setRgb(doc, BODY);
      const rest = ln.replace(/^Disclaimer\.\s*/, "");
      doc.text(rest, ML + 4 + labelW, dy);
    } else {
      doc.text(ln, ML + 4, dy);
    }
    dy += 4.5;
  });
  y += discH;

  /* ── FOOTER ── */
  y += 6;
  setRgb(doc, BORDER, "draw");
  doc.setLineWidth(0.2);
  doc.line(ML, y, CR, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setRgb(doc, FAINT);
  doc.text(`Generated on ${fmtDate(new Date())} for accountant review.`, ML, y + ascent(8));

  return doc;
}

/* ─── public API ─────────────────────────────────────────────────────────── */

/**
 * Generate the CT estimate PDF as a Blob.
 * @returns {Promise<{ success: true, filename: string, blob: Blob } | { success: false, error: string }>}
 */
export async function generateCorporationTaxPdfBlob({ company, period, calc }) {
  try {
    const filename = filenameFor({ company, period });
    const doc = buildDoc({ company, period, calc });
    const blob = doc.output("blob");
    return { success: true, filename, blob };
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed" };
  }
}
