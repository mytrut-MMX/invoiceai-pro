import {
  ML, CR, CONTENT_W, PAGE_W,
  FAINT,
  hexToRgb, setRgb,
} from "../pdfShared";
import { drawBillTo, drawMeta, drawItems, drawTotals, drawNotes } from "../pdfSections";

export function buildClassic(doc, brk, { data, currSymbol, isVat, orgSettings, accentColor }) {
  const { docNumber, customer, issueDate, dueDate, paymentTerms, items,
          notes, terms, docType } = data || {};
  const isQuote = docType === "quote";
  const docLabel = isQuote ? "Quote" : "Invoice";
  const sym = currSymbol || "£";
  const org = orgSettings || {};
  const accent = hexToRgb(accentColor || "#1e6be0");

  const bandH = 32;
  setRgb(doc, accent, "fill");
  doc.rect(0, 0, PAGE_W, bandH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(255, 255, 255);
  doc.text(org.orgName || "Your Company", ML, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  const orgLines = [
    org.street, [org.city, org.country].filter(Boolean).join(", "),
    org.email, org.vatNum ? `VAT ${org.vatNum}` : null,
  ].filter(Boolean);
  brk.y = 19;
  orgLines.forEach((ln) => { doc.text(ln, ML, brk.y); brk.y += 3.5; });

  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text(docLabel.toUpperCase(), CR, 16, { align: "right" });
  doc.setFontSize(11);
  doc.text(docNumber || "INV-0001", CR, 22, { align: "right" });

  brk.y = bandH + 10;
  const colW = (CONTENT_W - 8) / 2;
  const rightColX = ML + colW + 8;

  const labelStyle = () => { doc.setFont("helvetica", "bold"); doc.setFontSize(7); setRgb(doc, FAINT); };
  labelStyle(); doc.text("BILL TO", ML, brk.y);
  labelStyle(); doc.text(`${docLabel.toUpperCase()} DETAILS`, rightColX, brk.y);
  brk.y += 5;

  const billToStartY = brk.y;
  drawBillTo(doc, brk, { customer });
  const leftEndY = brk.y;
  const metaEndY = drawMeta(doc, { startY: billToStartY, rightColX, docLabel, docNumber, issueDate, dueDate, paymentTerms, isQuote });
  brk.y = Math.max(leftEndY, metaEndY) + 6;

  setRgb(doc, accent, "draw"); doc.setLineWidth(0.6);
  doc.line(ML, brk.y, CR, brk.y);
  brk.y += 5;

  drawItems(doc, brk, { items, isVat, sym, colors: { headerBg: accent, headerText: [255, 255, 255], stripeBg: [248, 248, 248] } });
  drawTotals(doc, brk, { data, accent, sym, isVat });
  drawNotes(doc, brk, { notes, terms });
}
