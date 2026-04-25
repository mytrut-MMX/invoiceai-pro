import {
  ML, CR, CONTENT_W, ascent,
  INK, BODY, MUTED, FAINT, LINE, STRIPE,
  setRgb, fmtMoney, fmtDate,
} from "./pdfShared";

export function drawBillTo(doc, brk, { customer }) {
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
  billLines.forEach((ln, i) => {
    if (i === 0) { doc.setFont("helvetica", "bold"); setRgb(doc, INK); }
    else { doc.setFont("helvetica", "normal"); setRgb(doc, BODY); }
    doc.text(String(ln), ML, brk.y + ascent(9));
    brk.y += 4.5;
  });
}

export function drawMeta(doc, { startY, rightColX, docLabel, docNumber, issueDate, dueDate, paymentTerms, isQuote }) {
  const metaRows = [
    [`${docLabel} No`, docNumber || "INV-0001"],
    ["Issue Date", fmtDate(issueDate)],
    [isQuote ? "Valid Until" : "Due Date", fmtDate(dueDate)],
    [isQuote ? "Validity" : "Payment Terms", paymentTerms || (isQuote ? "Valid 30 days" : "Net 30")],
  ];
  let y = startY;
  metaRows.forEach(([l, v]) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); setRgb(doc, MUTED);
    doc.text(l, rightColX, y + ascent(9));
    doc.setFont("helvetica", "bold"); setRgb(doc, INK);
    doc.text(String(v), CR, y + ascent(9), { align: "right" });
    setRgb(doc, LINE, "draw"); doc.setLineWidth(0.2);
    doc.line(rightColX, y + 5, CR, y + 5);
    y += 5;
  });
  return y;
}

export function drawItems(doc, brk, { items, isVat, sym, colors }) {
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

  const xs = []; let cx = ML;
  cols.forEach((c) => { xs.push(cx); cx += c.w * CONTENT_W; });
  const widths = cols.map((c) => c.w * CONTENT_W);
  const pad = 3;
  const headH = 8;

  function drawTableHeader() {
    setRgb(doc, colors.headerBg, "fill");
    doc.rect(ML, brk.y, CONTENT_W, headH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    if (colors.headerText) { doc.setTextColor(...colors.headerText); }
    else { doc.setTextColor(255, 255, 255); }
    cols.forEach((c, i) => {
      const tx = c.a === "right" ? xs[i] + widths[i] - pad : xs[i] + pad;
      doc.text(c.label.toUpperCase(), tx, brk.y + ascent(8) + 2.5, c.a === "right" ? { align: "right" } : undefined);
    });
    brk.y += headH;
  }
  drawTableHeader();

  const visibleItems = (items || []).filter((it) => (it.name || it.description) || Number(it.amount) > 0);
  visibleItems.forEach((it, idx) => {
    const descLines = [];
    descLines.push({ text: it.name || `Item ${idx + 1}`, bold: true });
    if (it.description) descLines.push({ text: it.description, bold: false });

    const wrappedDesc = descLines
      .map((d) => doc.splitTextToSize(d.text, widths[0] - pad * 2).map((t) => ({ text: t, bold: d.bold })))
      .flat();
    const descH = wrappedDesc.length * 4.5 + 2;
    const rowH = Math.max(descH, 8);
    if (brk.checkBreak(doc, rowH)) drawTableHeader();

    if (idx % 2 === 0) {
      setRgb(doc, colors.stripeBg || STRIPE, "fill");
      doc.rect(ML, brk.y, CONTENT_W, rowH, "F");
    }

    let dy = brk.y + ascent(9) + 1.5;
    wrappedDesc.forEach((d) => {
      doc.setFont("helvetica", d.bold ? "bold" : "normal");
      doc.setFontSize(d.bold ? 9 : 8);
      setRgb(doc, d.bold ? INK : BODY);
      doc.text(d.text, xs[0] + pad, dy); dy += 4.5;
    });

    const valueBase = brk.y + ascent(9) + 1.5;
    cols.slice(1).forEach((c, ci) => {
      const i = ci + 1;
      const tx = c.a === "right" ? xs[i] + widths[i] - pad : xs[i] + pad;
      let value = "";
      if (c.key === "quantity") value = String(it.quantity ?? "—");
      else if (c.key === "rate") value = fmtMoney(sym, it.rate);
      else if (c.key === "tax") value = hasVat ? `${it.tax_rate ?? 0}%` : "—";
      else if (c.key === "amount") value = fmtMoney(sym, it.amount);
      doc.setFont("helvetica", c.key === "amount" ? "bold" : "normal");
      doc.setFontSize(9);
      setRgb(doc, c.key === "amount" ? INK : BODY);
      doc.text(value, tx, valueBase, c.a === "right" ? { align: "right" } : undefined);
    });

    setRgb(doc, LINE, "draw"); doc.setLineWidth(0.2);
    doc.line(ML, brk.y + rowH, CR, brk.y + rowH);
    brk.y += rowH;
  });
}

export function drawTotals(doc, brk, { data, accent, sym, isVat }) {
  const { subtotal, discountAmount, shipping, taxBreakdown = [], cisDeduction, total, docType } = data;
  const isQuote = docType === "quote";
  const hasVat = !!isVat && (taxBreakdown || []).length > 0;
  const totalsW = 72;
  const totalsX = CR - totalsW;

  const rows = [
    ["Subtotal", fmtMoney(sym, subtotal || 0)],
    ...(Number(discountAmount) > 0 ? [["Discount", `− ${fmtMoney(sym, discountAmount)}`]] : []),
    ...(Number(shipping) > 0 ? [["Shipping", fmtMoney(sym, shipping)]] : []),
    ...(hasVat ? taxBreakdown.map((tb) => [`VAT ${tb.rate}%`, fmtMoney(sym, tb.amount)]) : []),
    ...(Number(cisDeduction) > 0 ? [[isQuote ? "CIS Deduction (Est.)" : "CIS Deduction", `− ${fmtMoney(sym, cisDeduction)}`]] : []),
  ];
  brk.checkBreak(doc, 4 + rows.length * 5 + 1 + 9 + 6);
  brk.y += 4;
  rows.forEach(([l, v]) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); setRgb(doc, MUTED);
    doc.text(l, totalsX, brk.y + ascent(9));
    setRgb(doc, BODY);
    doc.text(v, CR, brk.y + ascent(9), { align: "right" });
    setRgb(doc, LINE, "draw"); doc.setLineWidth(0.2);
    doc.line(totalsX, brk.y + 5, CR, brk.y + 5);
    brk.y += 5;
  });

  brk.y += 1;
  const totalBarH = 9;
  setRgb(doc, accent, "fill");
  doc.rect(totalsX - 2, brk.y, totalsW + 2, totalBarH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text(isQuote ? "Quote Total" : "Total Due", totalsX + 2, brk.y + ascent(10) + 2);
  doc.setFontSize(11);
  doc.text(fmtMoney(sym, total || 0), CR - 2, brk.y + ascent(11) + 2, { align: "right" });
  brk.y += totalBarH + 6;
}

export function drawNotes(doc, brk, { notes, terms }) {
  if (!notes && !terms) return;
  brk.checkBreak(doc, 30);
  setRgb(doc, LINE, "draw"); doc.setLineWidth(0.2);
  doc.line(ML, brk.y, CR, brk.y);
  brk.y += 4;

  const blocks = [];
  if (notes) blocks.push({ label: "NOTES", text: notes });
  if (terms) blocks.push({ label: "PAYMENT TERMS", text: terms });

  const colCount = blocks.length;
  const bcW = (CONTENT_W - (colCount - 1) * 6) / colCount;
  let bx = ML; let maxH = 0;
  blocks.forEach((b) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); setRgb(doc, FAINT);
    doc.text(b.label, bx, brk.y + ascent(7));
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); setRgb(doc, BODY);
    const lines = doc.splitTextToSize(String(b.text), bcW);
    let by = brk.y + 5;
    lines.forEach((ln) => { doc.text(ln, bx, by + ascent(8)); by += 4; });
    maxH = Math.max(maxH, by - brk.y);
    bx += bcW + 6;
  });
  brk.y += maxH + 4;
}
