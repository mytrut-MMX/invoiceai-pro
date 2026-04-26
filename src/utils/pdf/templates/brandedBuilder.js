import {
  ML, CR, CONTENT_W, PAGE_W,
  FAINT,
  hexToRgb, setRgb, blendWithWhite,
  drawLogo,
} from "../pdfShared";
import { drawBillTo, drawMeta, drawItems, drawTotals, drawNotes } from "../pdfSections";

export function buildBranded(doc, brk, { data, currSymbol, isVat, orgSettings, accentColor, logoDataUrl }) {
  const { docNumber, customer, issueDate, dueDate, paymentTerms, items,
          notes, terms, docType } = data || {};
  const isQuote = docType === "quote";
  const docLabel = isQuote ? "Quote" : "Invoice";
  const sym = currSymbol || "£";
  const org = orgSettings || {};
  const accent = hexToRgb(accentColor || "#1e6be0");

  const bandH = 36;
  setRgb(doc, accent, "fill");
  doc.rect(0, 0, PAGE_W, bandH, "F");

  const circleColor = blendWithWhite(accent, 0.15);
  setRgb(doc, circleColor, "fill");
  doc.circle(PAGE_W - 10, 10, 35, "F");

  // Logo: top-right white pad inside the band
  if (logoDataUrl) {
    setRgb(doc, [255, 255, 255], "fill");
    doc.rect(CR - 42, 4, 38, bandH - 10, "F");
    drawLogo(doc, logoDataUrl, { x: CR - 40, y: 6, size: "medium", maxWidth: 36 });
  }

  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
  doc.text(org.orgName || "Your Company", ML, 13);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
  const orgLines = [
    org.street, [org.city, org.country].filter(Boolean).join(", "),
    org.email, org.vatNum ? `VAT ${org.vatNum}` : null,
  ].filter(Boolean);
  let oy = 18;
  orgLines.forEach((ln) => { doc.text(ln, ML, oy); oy += 3.2; });
  if (org.crn) { doc.setFontSize(7); doc.setTextColor(200, 200, 200); doc.text(`Company No: ${org.crn}`, ML, oy); }

  const titleX = logoDataUrl ? CR - 46 : CR;
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
  doc.text(docLabel.toUpperCase(), titleX, 15, { align: "right" });
  doc.setFontSize(11); doc.setTextColor(220, 220, 220);
  doc.text(docNumber || "INV-0001", titleX, 22, { align: "right" });

  const stripH = 30;
  const warmBg = blendWithWhite(accent, 0.06);
  setRgb(doc, warmBg, "fill");
  doc.rect(0, bandH, PAGE_W, stripH, "F");
  setRgb(doc, accent, "draw"); doc.setLineWidth(1);
  doc.line(0, bandH + stripH, PAGE_W, bandH + stripH);

  brk.y = bandH + 6;
  const colW = (CONTENT_W - 8) / 2;
  const rightColX = ML + colW + 8;

  const labelStyle = () => { doc.setFont("helvetica", "bold"); doc.setFontSize(7); setRgb(doc, FAINT); };
  labelStyle(); doc.text("BILL TO", ML, brk.y);
  labelStyle(); doc.text(`${docLabel.toUpperCase()} DETAILS`, rightColX, brk.y);
  brk.y += 5;

  const startY = brk.y;
  drawBillTo(doc, brk, { customer });
  const leftEndY = brk.y;
  const metaEndY = drawMeta(doc, { startY, rightColX, docLabel, docNumber, issueDate, dueDate, paymentTerms, isQuote });
  brk.y = Math.max(leftEndY, metaEndY);
  brk.y = Math.max(brk.y, bandH + stripH + 5);

  const tint = blendWithWhite(accent, 0.13);
  drawItems(doc, brk, { items, isVat, sym, colors: { headerBg: tint, headerText: accent, stripeBg: [255, 250, 248] } });
  drawTotals(doc, brk, { data, accent, sym, isVat });
  drawNotes(doc, brk, { notes, terms });
}
