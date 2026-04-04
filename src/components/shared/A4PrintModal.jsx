import { useState, useContext } from "react";
import { ff, PDF_TEMPLATES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { A4InvoiceDoc } from "./A4InvoiceDoc";
import { getDefaultTemplate, getTemplateById } from "../../utils/InvoiceTemplateSchema";

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

  const handlePrint = () => {
    const el = document.getElementById("a4-invoice-doc");
    if (!el) return;
    // SEC-007: Sanitize cloned DOM before writing to new window — prevent XSS
    // via stored invoice content (e.g. malicious client names, notes)
    const clone = el.cloneNode(true);
    clone.querySelectorAll('script').forEach(s => s.remove());
    clone.querySelectorAll('*').forEach(node => {
      Array.from(node.attributes).forEach(attr => {
        if (/^on[a-z]/i.test(attr.name)) node.removeAttribute(attr.name);
      });
    });
    const safeHTML = clone.outerHTML;
    const safeTitle = (data.docNumber || "").replace(/[<>"'&]/g, "");
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${safeTitle}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{background:#fff;font-family:'Lato','DM Sans','Helvetica Neue',sans-serif}@page{size:A4;margin:0}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}</style>
    </head><body>${safeHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 4000, overscrollBehaviorY: "contain", touchAction: "pan-y" }}>
      <div style={{ width: "100%", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 16px 40px" }}>
        <div style={{ width: "100%", maxWidth: 820, background: "#1A1A1A", borderRadius: "12px 12px 0 0", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Print Preview — A4</span>
            <div style={{ display: "flex", gap: 5 }}>
              {PDF_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => switchTemplate(t.id)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: `1.5px solid ${activeTemplate === t.id ? "#E86C4A" : "rgba(255,255,255,0.2)"}`, background: "transparent", color: activeTemplate === t.id ? "#E86C4A" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
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
              style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
              Close
            </button>
            <button onClick={handlePrint}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#E86C4A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", gap: 7 }}>
              <Icons.Receipt /> Print / Save PDF
            </button>
          </div>
        </div>
        <div style={{ width: "100%", maxWidth: 820, background: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,0.35)", overflow: "hidden" }}>
          <A4InvoiceDoc data={data} currSymbol={currSymbol} isVat={isVat}
            orgSettings={{ ...orgSettings, logo: companyLogo, logoSize: previewLogoSize }}
            accentColor={accentColor} template={activeTemplate} footerText={footerText || ""} templateConfig={{ ...(invoiceTemplateConfig || {}), logoSize: previewLogoSize }} invoiceTemplate={selectedInvoiceTemplate} />
        </div>
      </div>
    </div>
  );
}
