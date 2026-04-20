/**
 * generatePayslipPdf — builds an A4 payslip PDF with native jsPDF vector text.
 * Selectable text, ~15KB output.
 *
 * Layout mirrors PayslipDocument.jsx — header (employer + PAYSLIP title),
 * employee info panel, payments table, deductions table, net-pay summary cards,
 * optional employer-costs section, footer.
 */

import jsPDF from "jspdf";

/* ─── layout ─────────────────────────────────────────────────────────────── */

const PAGE_W = 210;
const ML = 16;
const MR = 16;
const MT = 18;
const CR = PAGE_W - MR;
const CONTENT_W = CR - ML;

const PT = 0.3528;
const ascent = (pt) => pt * 0.72 * PT;

const HEADING = [26, 26, 46];
const BODY = [55, 65, 81];
const MUTED = [107, 114, 128];
const FAINT = [156, 163, 175];
const BORDER = [226, 232, 240];
const LIGHT_BG = [248, 250, 252];
const POSITIVE = [22, 163, 74];
const NEGATIVE = [220, 38, 38];
const POSITIVE_BG = [240, 253, 244];
const POSITIVE_BD = [187, 247, 208];
const NEGATIVE_BG = [254, 242, 242];
const NEGATIVE_BD = [254, 202, 202];

/* ─── formatting ─────────────────────────────────────────────────────────── */

function fmtMoney(sym, v) {
  return `${sym}${Number(v || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

function fmtDate(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtRange(start, end) {
  const s = start ? fmtDate(start) : "\u2014";
  const e = end ? fmtDate(end) : "\u2014";
  return `${s} \u2013 ${e}`;
}

function sanitize(s) {
  return String(s || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

/* ─── draw helpers ───────────────────────────────────────────────────────── */

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

/* ─── main builder ───────────────────────────────────────────────────────── */

function buildDoc(payslip, employee, payrollRun, employer, showEmployerCopy) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const s = payslip || {};
  const emp = employee || {};
  const run = payrollRun || {};
  const currSym = "\u00A3";
  const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Employee";
  const addr = emp.address || {};
  const isHourly = emp.salary_type === "hourly";

  const deductions = [
    { label: "Income Tax", thisPeriod: Number(s.tax_deducted || 0), ytd: s.tax_ytd },
    { label: `Employee NI (Cat ${emp.ni_category || "A"})`, thisPeriod: Number(s.ni_employee || 0), ytd: s.ni_ytd },
    ...(Number(s.pension_employee || 0) > 0 ? [{ label: `Pension (${emp.pension_employee_pct || 5}%)`, thisPeriod: Number(s.pension_employee), ytd: null }] : []),
    ...(Number(s.student_loan || 0) > 0 ? [{ label: `Student Loan (${(emp.student_loan_plan || "").replace("plan", "Plan ").replace("postgrad", "Postgrad")})`, thisPeriod: Number(s.student_loan), ytd: null }] : []),
    ...(Number(s.other_deductions || 0) > 0 ? [{ label: "Other Deductions", thisPeriod: Number(s.other_deductions), ytd: null }] : []),
  ].filter((d) => d.thisPeriod > 0);

  const totalDeductions = deductions.reduce((sum, d) => sum + d.thisPeriod, 0);
  const hasYtd = s.gross_ytd != null || s.tax_ytd != null || s.ni_ytd != null;

  let y = MT;

  /* ── HEADER (employer block + PAYSLIP title) ── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setRgb(doc, HEADING);
  y += ascent(13);
  doc.text(employer?.name || "Employer", ML, y);

  const titleRightY = MT + ascent(19);
  doc.setFontSize(19);
  doc.text("PAYSLIP", CR, titleRightY, { align: "right" });

  let leftY = y + 4;
  doc.setFontSize(8);
  setRgb(doc, MUTED);
  doc.setFont("helvetica", "normal");
  if (employer?.payeRef) {
    leftY += ascent(8);
    doc.text(`PAYE Ref: ${employer.payeRef}`, ML, leftY);
    leftY += 2;
  }
  if (employer?.address) {
    const addrLines = doc.splitTextToSize(employer.address, 80);
    addrLines.forEach((ln) => {
      leftY += ascent(8);
      doc.text(ln, ML, leftY);
      leftY += 2;
    });
  }

  let rightY = titleRightY + 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setRgb(doc, BODY);
  doc.text("Pay Date: ", CR - doc.getTextWidth(fmtDate(run.pay_date)) - 0.5, rightY, { align: "right" });
  doc.setFont("helvetica", "bold");
  setRgb(doc, HEADING);
  doc.text(fmtDate(run.pay_date), CR, rightY, { align: "right" });
  rightY += 4;

  doc.setFont("helvetica", "normal");
  setRgb(doc, BODY);
  const periodStr = fmtRange(run.period_start, run.period_end);
  doc.text("Period: ", CR - doc.getTextWidth(periodStr) - 0.5, rightY, { align: "right" });
  doc.setFont("helvetica", "bold");
  setRgb(doc, HEADING);
  doc.text(periodStr, CR, rightY, { align: "right" });
  rightY += 4;

  if (run.tax_month) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setRgb(doc, MUTED);
    doc.text(`Tax Month ${run.tax_month}`, CR, rightY, { align: "right" });
    rightY += 3.5;
  }
  if (run.tax_week) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setRgb(doc, MUTED);
    doc.text(`Tax Week ${run.tax_week}`, CR, rightY, { align: "right" });
    rightY += 3.5;
  }

  y = Math.max(leftY, rightY) + 6;

  /* ── EMPLOYEE INFO PANEL ── */
  const empPanelH = 28;
  drawFilledRect(doc, ML, y, CONTENT_W, empPanelH, LIGHT_BG, BORDER);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setRgb(doc, MUTED);
  doc.text("EMPLOYEE", ML + 4, y + ascent(8) + 2);

  doc.setFontSize(10);
  setRgb(doc, HEADING);
  doc.text(name, ML + 4, y + ascent(8) + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setRgb(doc, MUTED);
  let addrY = y + ascent(8) + 13;
  if (addr.street) { doc.text(addr.street, ML + 4, addrY); addrY += 3.5; }
  const cityLine = [addr.city, addr.postcode].filter(Boolean).join(", ");
  if (cityLine) { doc.text(cityLine, ML + 4, addrY); addrY += 3.5; }
  if (emp.email) { doc.text(emp.email, ML + 4, addrY); }

  const metaX = CR - 4;
  const metaRows = [
    ["NI Number:", emp.ni_number || "\u2014", true],
    ["Tax Code:", emp.tax_code || "\u2014", false],
    ["NI Category:", emp.ni_category || "A", false],
    ["Employee ID:", (emp.id || "").slice(-8), true],
  ];
  let metaY = y + ascent(8) + 2;
  metaRows.forEach(([label, value, isMono]) => {
    doc.setFont("helvetica", "normal");
    setRgb(doc, MUTED);
    const valW = doc.getTextWidth(value);
    doc.text(label, metaX - valW - 1.5, metaY, { align: "right" });
    doc.setFont(isMono ? "courier" : "helvetica", "bold");
    setRgb(doc, HEADING);
    doc.text(value, metaX, metaY, { align: "right" });
    metaY += 4.5;
  });

  y += empPanelH + 6;

  /* ── PAYMENTS TABLE ── */
  const colsPay = hasYtd
    ? [{ w: 0.42, a: "left" }, { w: 0.12, a: "right" }, { w: 0.14, a: "right" }, { w: 0.16, a: "right" }, { w: 0.16, a: "right" }]
    : [{ w: 0.50, a: "left" }, { w: 0.14, a: "right" }, { w: 0.16, a: "right" }, { w: 0.20, a: "right" }];
  const headersPay = hasYtd
    ? ["Description", "Units", "Rate", "This Period", "YTD"]
    : ["Description", "Units", "Rate", "This Period"];

  y = drawTableHeader(doc, headersPay, colsPay, y);
  const gross = Number(s.gross_pay || 0);
  const otherAdd = Number(s.other_additions || 0);

  y = drawTableRow(doc, [
    "Basic Pay",
    isHourly && s.hours_worked ? String(s.hours_worked) : "\u2014",
    isHourly ? fmtMoney(currSym, emp.salary_amount) : "\u2014",
    fmtMoney(currSym, s.gross_pay),
    ...(hasYtd ? [s.gross_ytd != null ? fmtMoney(currSym, s.gross_ytd) : "\u2014"] : []),
  ], colsPay, y, { boldCol: 3 });

  if (otherAdd > 0) {
    y = drawTableRow(doc, [
      "Other Additions", "\u2014", "\u2014",
      fmtMoney(currSym, otherAdd),
      ...(hasYtd ? ["\u2014"] : []),
    ], colsPay, y, { boldCol: 3 });
  }

  y = drawTableRow(doc, [
    "Gross Pay", "", "",
    fmtMoney(currSym, gross + otherAdd),
    ...(hasYtd ? [s.gross_ytd != null ? fmtMoney(currSym, s.gross_ytd) : "\u2014"] : []),
  ], colsPay, y, { boldCol: 3, highlight: true, bold: true });

  /* ── DEDUCTIONS TABLE ── */
  if (deductions.length > 0) {
    y += 4;
    const colsDed = hasYtd
      ? [{ w: 0.60, a: "left" }, { w: 0.20, a: "right" }, { w: 0.20, a: "right" }]
      : [{ w: 0.75, a: "left" }, { w: 0.25, a: "right" }];
    const headersDed = hasYtd ? ["Deductions", "This Period", "YTD"] : ["Deductions", "This Period"];

    y = drawTableHeader(doc, headersDed, colsDed, y);

    deductions.forEach((d) => {
      y = drawTableRow(doc, [
        d.label,
        fmtMoney(currSym, d.thisPeriod),
        ...(hasYtd ? [d.ytd != null ? fmtMoney(currSym, d.ytd) : "\u2014"] : []),
      ], colsDed, y, { valueColor: NEGATIVE });
    });

    const totalYtd = hasYtd && s.tax_ytd != null && s.ni_ytd != null
      ? fmtMoney(currSym, Number(s.tax_ytd || 0) + Number(s.ni_ytd || 0))
      : "\u2014";
    y = drawTableRow(doc, [
      "Total Deductions",
      fmtMoney(currSym, totalDeductions),
      ...(hasYtd ? [totalYtd] : []),
    ], colsDed, y, { bold: true, highlight: true, highlightColor: NEGATIVE_BG, valueColor: NEGATIVE, labelColor: NEGATIVE });
  }

  /* ── NET PAY CARDS ── */
  y += 6;
  const cards = [
    { label: "GROSS PAY", value: fmtMoney(currSym, gross), fill: LIGHT_BG, border: BORDER, fg: HEADING, flex: 1 },
    { label: "TOTAL DEDUCTIONS", value: fmtMoney(currSym, totalDeductions), fill: NEGATIVE_BG, border: NEGATIVE_BD, fg: NEGATIVE, flex: 1 },
    { label: "NET PAY", value: fmtMoney(currSym, s.net_pay), fill: POSITIVE_BG, border: POSITIVE_BD, fg: POSITIVE, flex: 1.3 },
  ];
  const cardGap = 3;
  const totalFlex = cards.reduce((a, c) => a + c.flex, 0);
  const cardH = 16;
  let cx = ML;
  cards.forEach((c, i) => {
    const cw = (CONTENT_W - cardGap * (cards.length - 1)) * (c.flex / totalFlex);
    drawFilledRect(doc, cx, y, cw, cardH, c.fill, c.border);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setRgb(doc, c.fg);
    doc.text(c.label, cx + cw / 2, y + ascent(7.5) + 2.5, { align: "center" });
    doc.setFontSize(i === 2 ? 15 : 12);
    doc.text(c.value, cx + cw / 2, y + cardH - 3, { align: "center" });
    cx += cw + cardGap;
  });
  y += cardH + 6;

  /* ── EMPLOYER COSTS ── */
  if (showEmployerCopy) {
    setRgb(doc, BORDER, "draw");
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.4);
    doc.line(ML, y, CR, y);
    doc.setLineDashPattern([], 0);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setRgb(doc, MUTED);
    doc.text("EMPLOYER COSTS", ML, y + ascent(8));
    y += 6;

    const colsEmp = [
      { w: 0.33, a: "left" },
      { w: 0.33, a: "right" },
      { w: 0.34, a: "right" },
    ];
    y = drawTableHeader(doc, ["Employer NI", "Employer Pension", "Total Employment Cost"], colsEmp, y);
    y = drawTableRow(doc, [
      fmtMoney(currSym, s.ni_employer),
      fmtMoney(currSym, s.pension_employer),
      fmtMoney(currSym, gross + Number(s.ni_employer || 0) + Number(s.pension_employer || 0)),
    ], colsEmp, y, { boldCol: 2 });
  }

  /* ── FOOTER ── */
  y += 8;
  setRgb(doc, BORDER, "draw");
  doc.setLineWidth(0.2);
  doc.line(ML, y, CR, y);
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setRgb(doc, FAINT);
  const footBase = y + ascent(7) + 1;
  doc.text("This is a record of your earnings and deductions. Keep for your records.", ML, footBase);
  doc.text(`Generated by InvoiceSaga \u00B7 ${fmtDate(new Date())}`, CR, footBase, { align: "right" });

  return doc;
}

/* ─── simple table helpers ───────────────────────────────────────────────── */

function drawTableHeader(doc, labels, cols, y) {
  const pad = 2.5;
  const rowH = 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setRgb(doc, MUTED);
  const xs = colXs(cols);
  const widths = colWidths(cols);
  const baseline = y + ascent(7.5) + 2;
  labels.forEach((label, i) => {
    const tx = cols[i].a === "right" ? xs[i] + widths[i] - pad : xs[i] + pad;
    doc.text(label, tx, baseline, cols[i].a === "right" ? { align: "right" } : undefined);
  });
  setRgb(doc, BORDER, "draw");
  doc.setLineWidth(0.4);
  doc.line(ML, y + rowH, CR, y + rowH);
  return y + rowH;
}

function drawTableRow(doc, values, cols, y, {
  bold = false, boldCol = -1, highlight = false, highlightColor,
  labelColor, valueColor,
} = {}) {
  const pad = 2.5;
  const rowH = 7;
  if (highlight) {
    drawFilledRect(doc, ML, y, CONTENT_W, rowH, highlightColor || LIGHT_BG);
  }
  const xs = colXs(cols);
  const widths = colWidths(cols);
  const baseline = y + ascent(9) + 2;
  values.forEach((v, i) => {
    const isBold = bold || i === boldCol;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(9);
    if (i === 0) setRgb(doc, labelColor || (bold ? HEADING : BODY));
    else setRgb(doc, valueColor || (isBold ? HEADING : BODY));
    const tx = cols[i].a === "right" ? xs[i] + widths[i] - pad : xs[i] + pad;
    doc.text(String(v), tx, baseline, cols[i].a === "right" ? { align: "right" } : undefined);
  });
  setRgb(doc, [241, 245, 249], "draw");
  doc.setLineWidth(0.2);
  doc.line(ML, y + rowH, CR, y + rowH);
  return y + rowH;
}

function colXs(cols) {
  const xs = [];
  let x = ML;
  cols.forEach((c) => { xs.push(x); x += c.w * CONTENT_W; });
  return xs;
}
function colWidths(cols) { return cols.map((c) => c.w * CONTENT_W); }

/* ─── public API ─────────────────────────────────────────────────────────── */

/**
 * Generate and download a payslip PDF.
 *
 * @returns {Promise<{ success: boolean, filename?: string, error?: string }>}
 */
export async function generatePayslipPdf(payslip, employee, payrollRun, employer = {}, showEmployerCopy = false) {
  try {
    const lastName = sanitize(employee?.last_name || "Employee");
    const periodEnd = sanitize(payrollRun?.period_end || "");
    const filename = `Payslip_${lastName}_${periodEnd}.pdf`;
    const doc = buildDoc(payslip, employee, payrollRun, employer, showEmployerCopy);
    doc.save(filename);
    return { success: true, filename };
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed" };
  }
}
