import {
  ML, CR, CONTENT_W,
  FAINT,
  hexToRgb, setRgb, blendWithWhite,
} from "../pdfShared";
import { drawBillTo, drawMeta, drawItems, drawTotals, drawNotes } from "../pdfSections";

export function buildMinimal(doc, brk, { data, currSymbol, isVat, orgSettings, accentColor }) {
  const { docNumber, customer, issueDate, dueDate, paymentTerms, items,
          notes, terms, docType } = data || {};
  const isQuote = docType === "quote";
  const docLabel = isQuote ? "Quote" : "Invoice";
  const sym = currSymbol || "£";
  const org = orgSettings || {};
  const accent = hexToRgb(accentColor || "#1A1A1A");

  brk.y = 14;
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); setRgb(doc, accent);
  doc.text(org.orgName || "Your Company", ML, brk.y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); setRgb(doc, [102, 102, 102]);
  const orgLines = [
    org.street, [org.city, org.country].filter(Boolean).join(", "),
    org.email, org.vatNum ? `VAT ${org.vatNum}` : null,
  ].filter(Boolean);
  let oy = brk.y + 5;
  orgLines.forEach((ln) => { doc.text(ln, ML, oy); oy += 3.2; });
  if (org.crn) { doc.setFontSize(7); setRgb(doc, FAINT); doc.text(`Company No: ${org.crn}`, ML, oy); oy += 3.2; }

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); setRgb(doc, FAINT);
  doc.text(docLabel.toUpperCase(), CR, 14, { align: "right" });
  doc.setFontSize(16); setRgb(doc, accent);
  doc.text(docNumber || "INV-0001", CR, 20, { align: "right" });

  brk.y = Math.max(oy, 28) + 4;
  setRgb(doc, accent, "draw"); doc.setLineWidth(0.8);
  doc.line(ML, brk.y, CR, brk.y);
  brk.y += 6;

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
  brk.y = Math.max(leftEndY, metaEndY) + 6;

  const tint = blendWithWhite(accent, 0.08);
  drawItems(doc, brk, { items, isVat, sym, colors: { headerBg: tint, headerText: accent, stripeBg: [250, 250, 250] } });
  drawTotals(doc, brk, { data, accent, sym, isVat });
  drawNotes(doc, brk, { notes, terms });
}
