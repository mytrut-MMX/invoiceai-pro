import { useMemo, useState } from "react";
import { ff, PDF_TEMPLATES } from "../constants";
import { A4InvoiceDoc } from "../components/shared";
import { Btn, Field, Input, Select } from "../components/atoms";
import { Icons } from "../components/icons";
import { DEFAULT_TEMPLATE, deleteTemplate, duplicateTemplate, getTemplates, saveTemplate } from "../utils/InvoiceTemplateSchema";

const DEFAULT_TEMPLATE_KEY = "ai_invoice_default_template_id";

const SAMPLE_INVOICE_DATA = {
  invoiceNumber: "INV-0042",
  issueDate: "2025-01-15",
  dueDate: "2025-02-15",
  from: { companyName: "Your Company", address: "123 Main St", city: "London", country: "UK", email: "hello@company.com" },
  to: { companyName: "Acme Corp", contactName: "John Smith", address: "456 Oak Ave", city: "Manchester", country: "UK" },
  items: [
    { description: "Web Design Services", quantity: 1, unitPrice: 1200, tax: 20, total: 1440 },
    { description: "Monthly Maintenance", quantity: 3, unitPrice: 150, tax: 20, total: 540 },
  ],
  bank: { bankName: "Barclays", accountName: "Your Company Ltd", accountNumber: "12345678", sortCode: "20-30-40", iban: "GB29BARC20304912345678", swift: "BARCGB22" },
  notes: "Thank you for your business. Payment due within 30 days.",
  subtotal: 1800,
  tax: 360,
  total: 2160,
};

function readDefaultTemplateId(templates) {
  const savedId = localStorage.getItem(DEFAULT_TEMPLATE_KEY);
  if (savedId && templates.some((tpl) => tpl.id === savedId)) return savedId;
  return templates[0]?.id || null;
}

function normalizeTemplates(rawTemplates) {
  if (rawTemplates.length === 0) {
    const seeded = {
      ...DEFAULT_TEMPLATE,
      id: "tpl_default",
      name: "Default Template",
      pdfTemplate: "classic",
      accentColor: "#E86C4A",
      logoPosition: "left",
      showNotesField: true,
    };
    saveTemplate(seeded);
    return [seeded];
  }

  return rawTemplates.map((tpl, idx) => ({
    ...tpl,
    id: tpl.id || `tpl_${idx + 1}`,
    name: tpl.name || `Template ${idx + 1}`,
    pdfTemplate: tpl.pdfTemplate || tpl.layout?.colorScheme || "classic",
    accentColor: tpl.accentColor || tpl.layout?.accentColor || "#E86C4A",
    logoPosition: tpl.logoPosition || tpl.layout?.logoPosition || "left",
    showNotesField: tpl.showNotesField ?? tpl.sections?.notes ?? true,
  }));
}

function InvoiceTemplateEditorModal({ template, onClose, onSave }) {
  const [name, setName] = useState(template?.name || "");
  const [pdfTemplate, setPdfTemplate] = useState(template?.pdfTemplate || "classic");
  const [accentColor, setAccentColor] = useState(template?.accentColor || "#E86C4A");
  const [logoPosition, setLogoPosition] = useState(template?.logoPosition || "left");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,17,16,0.55)", display: "grid", placeItems: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ width: "min(560px, 100%)", background: "#fff", borderRadius: 12, border: "1px solid #E8E6E0", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: "#111110" }}>Edit Template</h3>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#6B6B6B" }}><Icons.X /></button>
        </div>

        <Field label="Template Name"><Input value={name} onChange={setName} placeholder="Template name" /></Field>
        <Field label="Template Style"><Select value={pdfTemplate} onChange={setPdfTemplate} options={PDF_TEMPLATES.map((tpl) => tpl.id)} /></Field>
        <Field label="Accent Color"><Input value={accentColor} onChange={setAccentColor} /></Field>
        <Field label="Logo Position"><Select value={logoPosition} onChange={setLogoPosition} options={["left", "center", "right"]} /></Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            onClick={() => onSave({ ...template, name: name.trim() || "Untitled Template", pdfTemplate, accentColor, logoPosition })}
          >
            Save Template
          </Btn>
        </div>
      </div>
    </div>
  );
}

function InvoiceTemplatePreview({ template, sampleData }) {
  const mappedData = {
    docNumber: sampleData.invoiceNumber,
    customer: {
      name: sampleData.to.contactName,
      companyName: sampleData.to.companyName,
      billingAddress: {
        street: sampleData.to.address,
        city: sampleData.to.city,
        country: sampleData.to.country,
      },
    },
    issueDate: sampleData.issueDate,
    dueDate: sampleData.dueDate,
    items: sampleData.items.map((item, idx) => ({
      id: String(idx + 1),
      description: item.description,
      quantity: item.quantity,
      rate: item.unitPrice,
      tax_rate: item.tax,
      amount: item.quantity * item.unitPrice,
    })),
    subtotal: sampleData.subtotal,
    taxBreakdown: [{ rate: 20, amount: sampleData.tax }],
    total: sampleData.total,
    notes: sampleData.notes,
    terms: "Payment due within 30 days",
    status: "Draft",
  };

  return (
    <A4InvoiceDoc
      data={mappedData}
      currSymbol="£"
      isVat
      orgSettings={{
        orgName: sampleData.from.companyName,
        email: sampleData.from.email,
        street: sampleData.from.address,
        city: sampleData.from.city,
        country: sampleData.from.country,
      }}
      template={template?.pdfTemplate || "classic"}
      accentColor={template?.accentColor || "#E86C4A"}
      templateConfig={{
        logoPosition: template?.logoPosition || "left",
        showNotesField: template?.showNotesField ?? true,
      }}
      footerText=""
    />
  );
}

export default function InvoiceTemplatesPage() {
  const [templates, setTemplates] = useState(() => normalizeTemplates(getTemplates()));
  const [selectedId, setSelectedId] = useState(() => readDefaultTemplateId(normalizeTemplates(getTemplates())));
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === selectedId) || templates[0] || null,
    [templates, selectedId]
  );

  const setDefaultTemplate = (id) => {
    localStorage.setItem(DEFAULT_TEMPLATE_KEY, id);
    setSelectedId(id);
  };

  const refreshTemplates = () => {
    const nextTemplates = normalizeTemplates(getTemplates());
    setTemplates(nextTemplates);
    if (!nextTemplates.some((tpl) => tpl.id === selectedId)) {
      setSelectedId(readDefaultTemplateId(nextTemplates));
    }
  };

  return (
    <div style={{ padding: "20px 24px", minHeight: "100%", background: "#F0EFE9", fontFamily: ff }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 430px) minmax(0, 1fr)", gap: 18 }}>
        <section style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h1 style={{ fontSize: 22, margin: 0, color: "#111110" }}>Invoice Templates</h1>
            <Btn
              variant="primary"
              icon={<Icons.Plus />}
              onClick={() => {
                setEditingTemplate({ ...DEFAULT_TEMPLATE, name: `Template ${templates.length + 1}`, pdfTemplate: "classic", accentColor: "#E86C4A", logoPosition: "left" });
                setShowEditor(true);
              }}
            >
              New Template
            </Btn>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {templates.map((template) => {
              const isActive = template.id === selectedTemplate?.id;
              const isDefault = template.id === localStorage.getItem(DEFAULT_TEMPLATE_KEY);
              return (
                <article
                  key={template.id}
                  style={{ border: `1px solid ${isActive ? "#111110" : "#E8E6E0"}`, borderRadius: 10, padding: 12, background: isActive ? "#FAFAF7" : "#fff" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <button type="button" onClick={() => setSelectedId(template.id)} style={{ border: "none", background: "none", textAlign: "left", cursor: "pointer", padding: 0, color: "#111110", fontWeight: 700 }}>
                      {template.name}
                    </button>
                    {(isDefault || isActive) && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9B5A00", background: "#FFF7E6", padding: "2px 8px", borderRadius: 999 }}>
                        Active
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Btn variant="outline" onClick={() => { setEditingTemplate(template); setShowEditor(true); }}>Edit</Btn>
                    <Btn variant="ghost" onClick={() => { duplicateTemplate(template.id); refreshTemplates(); }}>Duplicate</Btn>
                    <Btn variant="danger" onClick={() => { deleteTemplate(template.id); refreshTemplates(); }}>Delete</Btn>
                    <Btn variant="ghost" onClick={() => setDefaultTemplate(template.id)}>{isDefault ? "Default" : "Set as Default"}</Btn>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: 16, overflow: "hidden" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#8A8A84", marginBottom: 12 }}>LIVE PREVIEW</div>
          <div style={{ background: "#F5F4F0", border: "1px solid #E8E6E0", borderRadius: 10, padding: 10, minHeight: 640, overflow: "auto" }}>
            <div style={{ transform: "scale(0.6)", transformOrigin: "top center", marginBottom: "-360px" }}>
              <InvoiceTemplatePreview template={selectedTemplate} sampleData={SAMPLE_INVOICE_DATA} />
            </div>
          </div>
        </section>
      </div>

      {showEditor && (
        <InvoiceTemplateEditorModal
          template={editingTemplate}
          onClose={() => setShowEditor(false)}
          onSave={(updatedTemplate) => {
            const savedTemplate = saveTemplate(updatedTemplate);
            refreshTemplates();
            setSelectedId(savedTemplate?.id || updatedTemplate.id);
            setShowEditor(false);
          }}
        />
      )}
    </div>
  );
}
