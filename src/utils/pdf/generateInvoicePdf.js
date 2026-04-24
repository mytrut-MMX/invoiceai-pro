import { createDoc, createBreaker, stampFooters, sanitize } from "./pdfShared";
import { buildClassic } from "./templates/classicBuilder";
import { buildModern } from "./templates/modernBuilder";
import { buildMinimal } from "./templates/minimalBuilder";
import { buildBranded } from "./templates/brandedBuilder";

const BUILDERS = {
  classic: buildClassic,
  modern: buildModern,
  minimal: buildMinimal,
  branded: buildBranded,
};

function buildDoc({ data, currSymbol, isVat, orgSettings, accentColor, footerText, template }) {
  const doc = createDoc();
  const brk = createBreaker();
  const builder = BUILDERS[template] || BUILDERS.classic;
  builder(doc, brk, { data, currSymbol, isVat, orgSettings, accentColor, footerText });
  stampFooters(doc, orgSettings || {}, footerText || "");
  return doc;
}

export async function generateInvoicePdfBlob({ data, currSymbol, isVat, orgSettings, accentColor, footerText, template }) {
  try {
    const docNum = sanitize(data?.docNumber || "document");
    const docTypeLabel = data?.docType === "quote" ? "Quote" : "Invoice";
    const filename = `${docTypeLabel}-${docNum}.pdf`;
    const doc = buildDoc({ data, currSymbol, isVat, orgSettings, accentColor, footerText, template });
    const blob = doc.output("blob");
    return { success: true, blob, filename };
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed" };
  }
}
