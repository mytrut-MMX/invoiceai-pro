import {
  ML, CR, PAGE_W,
  hexToRgb, setRgb, blendWithWhite,
} from "../pdfShared";
import { drawMeta, drawItems, drawTotals, drawNotes } from "../pdfSections";

export function buildModern(doc, brk, { data, currSymbol, isVat, orgSettings, accentColor }) {
  const { docNumber, customer, issueDate, dueDate, paymentTerms, items,
          notes, terms, docType } = data || {};
  const isQuote = docType === "quote";
  const docLabel = isQuote ? "Quote" : "Invoice";
  const sym = currSymbol || "£";
  const org = orgSettings || {};
  const accent = hexToRgb(accentColor || "#1e6be0");

  const headerH = 62;
  const leftW = PAGE_W * 0.42;

  setRgb(doc, accent, "fill");
  doc.rect(0, 0, leftW, headerH, "F");

  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
  doc.text(org.orgName || "Your Company", 14, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
  const orgLines = [
    org.street, [org.city, org.country].filter(Boolean).join(", "),
    org.email, org.vatNum ? `VAT ${org.vatNum}` : null,
  ].filter(Boolean);
  let oy = 20;
  orgLines.forEach((ln) => { doc.text(ln, 14, oy); oy += 3.2; });
  if (org.crn) { doc.setFontSize(7); doc.setTextColor(200, 200, 200); doc.text(`Company No: ${org.crn}`, 14, oy); oy += 3.2; }

  oy += 4;
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(200, 200, 200);
  doc.text("BILL TO", 14, oy);
  oy += 4;
  const ba = customer?.billingAddress || {};
  const billLines = customer ? [
    customer.companyName || customer.name,
    ba.street1 || ba.street,
    [ba.city, ba.zip || ba.postcode].filter(Boolean).join(", "),
    ba.country, customer.email,
  ].filter(Boolean) : ["No customer"];
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
  billLines.forEach((ln, i) => {
    if (i === 0) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    doc.text(String(ln), 14, oy); oy += 4;
  });

  const rightX = leftW + 12;
  doc.setFont("helvetica", "bold"); doc.setFontSize(26);
  setRgb(doc, accent);
  doc.text(docLabel.toUpperCase(), rightX, 16);
  doc.setFontSize(11); setRgb(doc, [85, 85, 85]);
  doc.text(docNumber || "INV-0001", rightX, 23);

  drawMeta(doc, { startY: 30, rightColX: rightX, docLabel, docNumber, issueDate, dueDate, paymentTerms, isQuote });

  brk.y = headerH + 8;
  const tint = blendWithWhite(accent, 0.09);
  drawItems(doc, brk, { items, isVat, sym, colors: { headerBg: tint, headerText: accent, stripeBg: [240, 247, 255] } });
  drawTotals(doc, brk, { data, accent, sym, isVat });
  drawNotes(doc, brk, { notes, terms });
}
