import { useContext, useState } from "react";
import { ff, PDF_TEMPLATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Btn, Field, Input, Select, Checkbox } from "../components/atoms";
import { Icons } from "../components/icons";

export default function InvoiceTemplatesPage() {
  const { pdfTemplate, setPdfTemplate, companyLogoSize, setCompanyLogoSize, invoiceTemplateConfig, setInvoiceTemplateConfig } = useContext(AppCtx);

  const initial = invoiceTemplateConfig || {};
  const [accentColor, setAccentColor] = useState(initial.accentColor || "#E86C4A");
  const [logoPosition, setLogoPosition] = useState(initial.logoPosition || "left");
  const [showPoField, setShowPoField] = useState(initial.showPoField !== false);
  const [showNotesField, setShowNotesField] = useState(initial.showNotesField !== false);
  const [customFieldLabel, setCustomFieldLabel] = useState(initial.customFieldLabel || "Project Ref");

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
    </div>
  );
}
