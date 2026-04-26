import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { A4InvoiceDoc } from "../components/shared";
import { Btn } from "../components/atoms";
import { Icons } from "../components/icons";
import InvoiceTemplateEditorModal from "../components/templates/InvoiceTemplateEditorModal";
import { DEFAULT_TEMPLATE, deleteTemplate, duplicateTemplate, getTemplates, saveTemplate } from "../utils/InvoiceTemplateSchema";

const DEFAULT_TEMPLATE_KEY = "ai_invoice_default_template_id";

const SAMPLE_INVOICE_DATA = {
  invoiceNumber: "INV-0042",
  issueDate: "2025-01-15",
  dueDate: "2025-02-15",
  from: { companyName: "Your Company", address: "123 Main St", city: "London", country: "UK", email: "hello@company.com" },
  to: { companyName: "Acme Corp", contactName: "John Smith", address: "456 Oak Ave", city: "Manchester", country: "UK" },
  items: [
    { description: "Web Design Services",   quantity: 1, unitPrice: 1200, tax: 20, total: 1440 },
    { description: "Monthly Maintenance",   quantity: 3, unitPrice: 150,  tax: 20, total: 540 },
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
      showLogo: true,
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
    showLogo: tpl.showLogo ?? tpl.layout?.showLogo ?? true,
    showNotesField: tpl.showNotesField ?? tpl.sections?.notes ?? true,
  }));
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
        logoSize: template?.layout?.logoSize || "medium",
        showLogo: template?.showLogo ?? true,
        showNotesField: template?.showNotesField ?? true,
      }}
      invoiceTemplate={template}
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
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Invoice templates</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
            Customise how your invoices look and set the default template
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,430px)_minmax(0,1fr)] gap-4">
          {/* Templates list */}
          <section className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-4 h-fit">
            <div className="flex justify-between items-center mb-3.5">
              <h2 className="text-base font-semibold text-[var(--text-primary)] m-0">Templates</h2>
              <Btn
                variant="primary"
                icon={<Icons.Plus />}
                onClick={() => {
                  setEditingTemplate({
                    ...DEFAULT_TEMPLATE,
                    name: `Template ${templates.length + 1}`,
                    pdfTemplate: "classic",
                    accentColor: "#E86C4A",
                    logoPosition: "left",
                    showLogo: true,
                  });
                  setShowEditor(true);
                }}
              >
                New template
              </Btn>
            </div>

            <div className="grid gap-2.5">
              {templates.map((template) => {
                const isActive = template.id === selectedTemplate?.id;
                const isDefault = template.id === localStorage.getItem(DEFAULT_TEMPLATE_KEY);
                return (
                  <article
                    key={template.id}
                    className={[
                      "rounded-[var(--radius-md)] p-3 transition-colors duration-150",
                      isActive
                        ? "border border-[var(--brand-600)] bg-[var(--brand-50)]"
                        : "border border-[var(--border-subtle)] bg-white hover:border-[var(--border-default)]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(template.id)}
                        className="bg-transparent border-none text-left cursor-pointer p-0 text-[var(--text-primary)] font-semibold text-sm"
                      >
                        {template.name}
                      </button>
                      {(isDefault || isActive) && (
                        <span className="text-[10px] font-semibold text-[var(--warning-700)] bg-[var(--warning-50)] px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-2.5 flex-wrap">
                      <Btn variant="outline" size="sm" onClick={() => { setEditingTemplate(template); setShowEditor(true); }}>
                        Edit
                      </Btn>
                      <Btn variant="ghost" size="sm" onClick={() => { duplicateTemplate(template.id); refreshTemplates(); }}>
                        Duplicate
                      </Btn>
                      <Btn variant="danger" size="sm" onClick={() => { deleteTemplate(template.id); refreshTemplates(); }}>
                        Delete
                      </Btn>
                      <Btn variant="ghost" size="sm" onClick={() => setDefaultTemplate(template.id)}>
                        {isDefault ? "Default" : "Set as default"}
                      </Btn>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Live preview */}
          <section className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-4 overflow-hidden">
            <div className="text-[11px] font-semibold tracking-wider text-[var(--text-tertiary)] uppercase mb-3">
              Live preview
            </div>
            <div className="mb-3 border border-[var(--border-subtle)] rounded-[var(--radius-md)] bg-[var(--surface-sunken)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
              <div>
                Bank details shown here are from your Company Profile. Template controls which fields are visible on each invoice.
              </div>
              <Link
                to={ROUTES.SETTINGS_GENERAL}
                className="inline-block mt-1.5 text-[var(--brand-600)] hover:text-[var(--brand-700)] font-semibold no-underline"
              >
                Go to Company Profile →
              </Link>
            </div>
            <div className="bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-2.5 min-h-[640px] overflow-auto">
              <div className="origin-top mx-auto" style={{ transform: "scale(0.6)", transformOrigin: "top center", marginBottom: "-360px" }}>
                <InvoiceTemplatePreview template={selectedTemplate} sampleData={SAMPLE_INVOICE_DATA} />
              </div>
            </div>
          </section>
        </div>
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
