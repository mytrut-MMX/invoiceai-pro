import { createDoc, createBreaker, stampFooters, sanitize, resolveLogoDataUrl } from "./pdfShared";
import { buildClassic } from "./templates/classicBuilder";
import { buildModern } from "./templates/modernBuilder";
import { buildMinimal } from "./templates/minimalBuilder";
import { buildBranded } from "./templates/brandedBuilder";
import { getCompanyLogoUrl, getCompanyLogoSize, isLogoEnabled } from "../branding/logoHelper";

const BUILDERS = {
  classic: buildClassic,
  modern: buildModern,
  minimal: buildMinimal,
  branded: buildBranded,
};

async function buildDoc({ data, currSymbol, isVat, orgSettings, accentColor, footerText, template, templateConfig }) {
  const doc = createDoc();
  const brk = createBreaker();
  const builder = BUILDERS[template] || BUILDERS.classic;

  // Pre-resolve logo if global gate is on AND per-template gate is on
  let logoDataUrl = "";
  let logoSize = "medium";
  const perTemplateShowLogo = templateConfig?.showLogo !== false;
  if (perTemplateShowLogo && isLogoEnabled(orgSettings)) {
    const url = getCompanyLogoUrl(orgSettings);
    logoDataUrl = await resolveLogoDataUrl(url);
    const sz = orgSettings?.branding?.logoSize ?? getCompanyLogoSize(orgSettings);
    logoSize = sz;
  }

  builder(doc, brk, { data, currSymbol, isVat, orgSettings, accentColor, footerText, logoDataUrl, logoSize, templateConfig });
  stampFooters(doc, orgSettings || {}, footerText || "");
  return doc;
}

export async function generateInvoicePdfBlob({ data, currSymbol, isVat, orgSettings, accentColor, footerText, template, templateConfig }) {
  try {
    const docNum = sanitize(data?.docNumber || "document");
    const docTypeLabel = data?.docType === "quote" ? "Quote" : "Invoice";
    const filename = `${docTypeLabel}-${docNum}.pdf`;
    const doc = await buildDoc({ data, currSymbol, isVat, orgSettings, accentColor, footerText, template, templateConfig });
    const blob = doc.output("blob");
    return { success: true, blob, filename };
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed" };
  }
}
