import { useState, useContext } from "react";
import { PDF_TEMPLATES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { A4InvoiceDoc } from "./A4InvoiceDoc";
import { getDefaultTemplate, getTemplateById } from "../../utils/InvoiceTemplateSchema";
import { generateInvoicePdfBlob } from "../../utils/pdf/generateInvoicePdf";

export function A4PrintModal({ data, currSymbol, isVat, onClose, _overrideTemplate, _overrideAccent, invoiceTemplate }) {
  const { orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText, invoiceTemplateConfig } = useContext(AppCtx);
  const selectedInvoiceTemplate = invoiceTemplate || getTemplateById(data?.templateId) || getDefaultTemplate();
  const startTpl = _overrideTemplate || pdfTemplate || "classic";
  const resolvedPrintStyle = selectedInvoiceTemplate?.layout?.colorScheme || startTpl;
  const tplDef = PDF_TEMPLATES.find(t => t.id === resolvedPrintStyle) || PDF_TEMPLATES[0];
  const [accentColor, setAccentColor] = useState(_overrideAccent || tplDef.defaultAccent);
  const [activeTemplate, setActiveTemplate] = useState(resolvedPrintStyle);
  const [previewLogoSize, setPreviewLogoSize] = useState(Number(selectedInvoiceTemplate?.layout?.logoSize === "large" ? 80 : selectedInvoiceTemplate?.layout?.logoSize === "small" ? 36 : (invoiceTemplateConfig?.logoSize || companyLogoSize || 52)));

  const switchTemplate = (id) => {
    setActiveTemplate(id);
    setAccentColor(PDF_TEMPLATES.find(t => t.id === id)?.defaultAccent || "#1A1A1A");
  };

  const handleDownload = async () => {
    const result = await generateInvoicePdfBlob({
      data,
      currSymbol,
      isVat,
      orgSettings,
      accentColor,
      footerText: footerText || "",
    });
    if (!result.success) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 4000, overscrollBehaviorY: "contain", touchAction: "pan-y" }}>
      <div style={{ width: "100%", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", alignItems: "center", padding: "13px 13px 34px" }}>
        <div style={{ width: "100%", maxWidth: 820, background: "#1A1A1A", borderRadius: "12px 12px 0 0", padding: "8px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 13, flexWrap: "wrap", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Print Preview — A4</span>
            <div style={{ display: "flex", gap: 5 }}>
              {PDF_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => switchTemplate(t.id)}
                  style={{ padding: "5px 8px", borderRadius: 6, border: `1.5px solid ${activeTemplate === t.id ? "#E86C4A" : "rgba(255,255,255,0.2)"}`, background: "transparent", color: activeTemplate === t.id ? "#E86C4A" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t.name}
                </button>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600 }}>
              Logo size: {previewLogoSize}px
              <input
                type="range"
                min={24}
                max={110}
                value={previewLogoSize}
                onChange={e => setPreviewLogoSize(Number(e.target.value))}
                style={{ accentColor: "#E86C4A" }}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={onClose}
              style={{ padding: "8px 13px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Close
            </button>
            <button onClick={handleDownload}
              style={{ padding: "8px 13px", borderRadius: 8, border: "none", background: "#E86C4A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Receipt /> Download PDF
            </button>
          </div>
        </div>
        <div style={{ width: "100%", maxWidth: 820, background: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,0.35)", overflow: "visible" }}>
          <A4InvoiceDoc data={data} currSymbol={currSymbol} isVat={isVat}
            orgSettings={{ ...orgSettings, logo: companyLogo, logoSize: previewLogoSize }}
            accentColor={accentColor} template={activeTemplate} footerText={footerText || ""} templateConfig={{ ...(invoiceTemplateConfig || {}), logoSize: previewLogoSize }} invoiceTemplate={selectedInvoiceTemplate} />
        </div>
      </div>
    </div>
  );
}
