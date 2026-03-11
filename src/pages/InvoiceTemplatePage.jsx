import { useContext, useState } from "react";
import { ff, PDF_TEMPLATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Btn, Field, Input, Select, Checkbox } from "../components/atoms";
import { A4InvoiceDoc } from "../components/shared";
import { Icons } from "../components/icons";

export default function InvoiceTemplatesPage() {
  const { pdfTemplate, setPdfTemplate, companyLogoSize, setCompanyLogoSize, invoiceTemplateConfig, setInvoiceTemplateConfig } = useContext(AppCtx);

  const initial = invoiceTemplateConfig || {};
  const [accentColor, setAccentColor] = useState(initial.accentColor || "#E86C4A");
  const [logoPosition, setLogoPosition] = useState(initial.logoPosition || "left");
  const [showPoField, setShowPoField] = useState(initial.showPoField !== false);
  const [showNotesField, setShowNotesField] = useState(initial.showNotesField !== false);
  const [customFieldLabel, setCustomFieldLabel] = useState(initial.customFieldLabel || "Project Ref");

  const previewData = {
    docNumber: "INV-0001",
    customer: { name: "Preview Customer", companyName: "Preview Customer Ltd", email: "accounts@example.com" },
    issueDate: new Date().toISOString().slice(0,10),
    dueDate: new Date(Date.now()+14*864e5).toISOString().slice(0,10),
    paymentTerms: "Net 14",
    items: [
      { id:"1", name:"Design Sprint", description:"Discovery and wireframes", quantity:1, rate:1200, tax_rate:20, amount:1200 },
      { id:"2", name:"Development", description:"Frontend implementation", quantity:2, rate:800, tax_rate:20, amount:1600 },
    ],
    subtotal: 2800,
    discountAmount: 0,
    shipping: 0,
    taxBreakdown: [{ rate:20, amount:560 }],
    cisDeduction: 0,
    total: 3360,
    notes: "Live template preview",
    terms: "Payment due within 14 days",
    status: "Draft",
  };


  const saveTemplateSettings = () => {
    setCompanyLogoSize(Number(companyLogoSize || 52));
    setInvoiceTemplateConfig({
      accentColor,
      logoPosition,
      logoSize: Number(companyLogoSize || 52),
      showPoField,
      showNotesField,
      customFieldLabel,
    });
  };

  return (
    <div style={{ padding: "clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth: 900, fontFamily: ff }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A", margin: "0 0 16px" }}>Invoice Templates</h1>

      <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          <Field label="Template">
            <Select value={pdfTemplate} onChange={setPdfTemplate} options={PDF_TEMPLATES.map(t=>({ value:t.id, label:t.name }))} />
          </Field>
          <Field label="Logo Position">
            <Select value={logoPosition} onChange={setLogoPosition} options={["left","center","right"]} />
          </Field>
          <Field label="Accent Color">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="color" value={accentColor} onChange={e=>setAccentColor(e.target.value)} style={{ width: 36, height: 36, border: "none", background: "none" }} />
              <Input value={accentColor} onChange={setAccentColor} />
            </div>
          </Field>
          <Field label={`Logo Size: ${companyLogoSize || 52}px`}>
            <input type="range" min={24} max={100} value={companyLogoSize || 52} onChange={e=>setCompanyLogoSize(Number(e.target.value))} style={{ width: "100%", accentColor: "#E86C4A" }} />
          </Field>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#888", textTransform: "uppercase", marginBottom: 10 }}>Custom Fields</div>
        <Checkbox checked={showPoField} onChange={setShowPoField} label="Show PO field in invoice metadata" />
        <Checkbox checked={showNotesField} onChange={setShowNotesField} label="Show Notes section in template" />
        <Field label="Extra field label">
          <Input value={customFieldLabel} onChange={setCustomFieldLabel} placeholder="Project Ref" />
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={saveTemplateSettings} variant="primary" icon={<Icons.Save />}>Save Template Settings</Btn>
      </div>

      <div style={{ marginTop: 20, background:"#fff", border:"1px solid #EBEBEB", borderRadius:12, padding:16 }}>
        <div style={{ fontSize:12, fontWeight:800, color:"#888", textTransform:"uppercase", marginBottom:8 }}>Live Preview</div>
        <div style={{ border:"1px solid #EBEBEB", borderRadius:10, overflow:"auto", background:"#f3f4f6", padding:12 }}>
          <div style={{ transform:"scale(0.78)", transformOrigin:"top center", marginBottom:"-180px" }}>
            <A4InvoiceDoc data={previewData} currSymbol="£" isVat orgSettings={{ orgName:"Demo Company" }} accentColor={accentColor} template={pdfTemplate} footerText="" templateConfig={{ logoPosition, logoSize:Number(companyLogoSize||52), showNotesField, showPoField, customFieldLabel, accentColor }} />
          </div>
        </div>
      </div>
    </div>
  );
}
