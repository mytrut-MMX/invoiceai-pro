import { useState } from "react";
import { PDF_TEMPLATES } from "../../constants";
import { Btn, Field, Input, Select } from "../atoms";
import { Icons } from "../icons";
import { DEFAULT_TEMPLATE } from "../../utils/InvoiceTemplateSchema";

const TABS = [
  { id: "layout",     label: "Layout" },
  { id: "content",    label: "Content" },
  { id: "fields",     label: "Fields" },
  { id: "lineItems",  label: "Line Items" },
  { id: "customText", label: "Custom Text" },
];

const FONT_OPTIONS = [
  { value: "inter", label: "Inter (sans-serif)" },
  { value: "mono",  label: "Mono (monospace)" },
  { value: "serif", label: "Serif" },
];

const LOGO_SIZE_OPTIONS = ["small", "medium", "large"];
const LOGO_POSITION_OPTIONS = ["left", "center", "right", "none"];

const FROM_FIELD_LABELS = {
  companyName: "Company name",
  address: "Address line",
  city: "City",
  country: "Country",
  phone: "Phone",
  email: "Email",
  vatNumber: "VAT number",
  registrationNumber: "Registration number",
  website: "Website",
};

const TO_FIELD_LABELS = {
  companyName: "Company name",
  contactName: "Contact name",
  address: "Address",
  city: "City",
  postcode: "Postcode",
  country: "Country",
  email: "Email",
  vatNumber: "VAT number",
  phone: "Phone",
};

const LINE_COLUMN_LABELS = {
  description: "Description",
  quantity: "Quantity",
  unitPrice: "Unit price",
  tax: "Tax",
  discount: "Discount",
  total: "Total",
};

const BANK_FIELD_LABELS = {
  bankName: "Bank name",
  accountName: "Account name",
  accountNumber: "Account number",
  sortCode: "Sort code",
  iban: "IBAN",
  swift: "SWIFT",
  routingNumber: "Routing number",
};

const SECTION_LABELS = {
  header: "Header",
  fromBlock: "From block (your details)",
  toBlock: "To block (customer)",
  bankDetails: "Bank details",
  notes: "Notes",
  footer: "Footer",
  signature: "Signature line",
  watermark: "Watermark (when paid)",
};

function deepMerge(defaults, overrides) {
  const out = {};
  for (const [k, v] of Object.entries(defaults)) {
    out[k] = { ...v, ...(overrides?.[k] || {}) };
  }
  return out;
}

function buildInitialState(input) {
  const base = input || {};
  return {
    id: base.id || null,
    name: base.name || "",
    pdfTemplate: base.pdfTemplate || base.layout?.colorScheme || "classic",
    layout: { ...DEFAULT_TEMPLATE.layout, ...(base.layout || {}) },
    sections: { ...DEFAULT_TEMPLATE.sections, ...(base.sections || {}) },
    fromFields: deepMerge(DEFAULT_TEMPLATE.fromFields, base.fromFields),
    toFields: deepMerge(DEFAULT_TEMPLATE.toFields, base.toFields),
    invoiceFields: deepMerge(DEFAULT_TEMPLATE.invoiceFields, base.invoiceFields),
    lineItemColumns: deepMerge(DEFAULT_TEMPLATE.lineItemColumns, base.lineItemColumns),
    totalsBlock: deepMerge(DEFAULT_TEMPLATE.totalsBlock, base.totalsBlock),
    bankFields: deepMerge(DEFAULT_TEMPLATE.bankFields, base.bankFields),
    customText: { ...DEFAULT_TEMPLATE.customText, ...(base.customText || {}) },
    accentColor: base.accentColor || base.layout?.accentColor || "#E86C4A",
    logoPosition: base.logoPosition || base.layout?.logoPosition || "left",
    showLogo: base.showLogo ?? base.layout?.showLogo ?? true,
  };
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-b-0 cursor-pointer">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4"
      />
    </label>
  );
}

export default function InvoiceTemplateEditorModal({ template, onClose, onSave }) {
  const [state, setState] = useState(() => buildInitialState(template));
  const [activeTab, setActiveTab] = useState("layout");

  const update = (patch) => setState(s => ({ ...s, ...patch }));
  const updateLayout = (patch) =>
    setState(s => ({ ...s, layout: { ...s.layout, ...patch } }));
  const updateSection = (key, value) =>
    setState(s => ({ ...s, sections: { ...s.sections, [key]: value } }));
  const updateFieldVisibility = (group, key, value) =>
    setState(s => ({
      ...s,
      [group]: { ...s[group], [key]: { ...s[group][key], visible: value } },
    }));
  const updateCustomText = (key, value) =>
    setState(s => ({ ...s, customText: { ...s.customText, [key]: value } }));

  const handleSave = () => {
    onSave({
      ...state,
      name: state.name.trim() || "Untitled Template",
      // Mirror layout flags into top-level fields the page list reads
      accentColor: state.layout.accentColor,
      logoPosition: state.layout.logoPosition,
      showLogo: state.layout.showLogo,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[3000] grid place-items-center p-4">
      <div className="w-full max-w-[680px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-[var(--shadow-popover)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] flex-shrink-0">
          <h3 className="m-0 text-lg font-semibold text-[var(--text-primary)]">
            {template?.id ? "Edit template" : "New template"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] flex transition-colors duration-150"
          >
            <Icons.X />
          </button>
        </div>

        <div className="px-6 pt-3 pb-3 border-b border-[var(--border-subtle)] flex-shrink-0">
          <Field label="Template Name">
            <Input
              value={state.name}
              onChange={v => update({ name: v })}
              placeholder="Template name"
            />
          </Field>
        </div>

        <div className="px-6 border-b border-[var(--border-subtle)] flex-shrink-0">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "h-9 px-3 text-sm cursor-pointer border-none bg-transparent transition-colors duration-150",
                  activeTab === tab.id
                    ? "text-[var(--brand-700)] font-semibold border-b-2 border-[var(--brand-600)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 space-y-3 overflow-y-auto flex-1">
          {activeTab === "layout" && (
            <>
              <Field label="Template Style">
                <Select
                  value={state.pdfTemplate}
                  onChange={v => update({ pdfTemplate: v })}
                  options={PDF_TEMPLATES.map(tpl => tpl.id)}
                />
              </Field>
              <Field label="Accent Colour">
                <Input
                  value={state.layout.accentColor}
                  onChange={v => updateLayout({ accentColor: v })}
                />
              </Field>
              <Field label="Font Family">
                <Select
                  value={state.layout.fontFamily}
                  onChange={v => updateLayout({ fontFamily: v })}
                  options={FONT_OPTIONS}
                />
              </Field>
              <Field label="Logo Position">
                <Select
                  value={state.layout.logoPosition}
                  onChange={v => updateLayout({ logoPosition: v })}
                  options={LOGO_POSITION_OPTIONS}
                />
              </Field>
              <Field label="Logo Size">
                <Select
                  value={state.layout.logoSize}
                  onChange={v => updateLayout({ logoSize: v })}
                  options={LOGO_SIZE_OPTIONS}
                />
              </Field>
              <Field label="Show Logo">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.layout.showLogo}
                    onChange={e => updateLayout({ showLogo: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Display company logo on this template
                  </span>
                </label>
              </Field>
            </>
          )}

          {activeTab === "content" && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                Visible sections
              </h4>
              <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-1">
                {Object.entries(SECTION_LABELS).map(([k, label]) => (
                  <ToggleField
                    key={k}
                    label={label}
                    checked={state.sections[k]}
                    onChange={v => updateSection(k, v)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === "fields" && (
            <>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                  From (your details)
                </h4>
                <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-1 mb-4">
                  {Object.entries(FROM_FIELD_LABELS).map(([k, label]) => (
                    <ToggleField
                      key={k}
                      label={label}
                      checked={state.fromFields[k]?.visible}
                      onChange={v => updateFieldVisibility("fromFields", k, v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                  To (customer)
                </h4>
                <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-1 mb-4">
                  {Object.entries(TO_FIELD_LABELS).map(([k, label]) => (
                    <ToggleField
                      key={k}
                      label={label}
                      checked={state.toFields[k]?.visible}
                      onChange={v => updateFieldVisibility("toFields", k, v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Bank details
                </h4>
                <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-1">
                  {Object.entries(BANK_FIELD_LABELS).map(([k, label]) => (
                    <ToggleField
                      key={k}
                      label={label}
                      checked={state.bankFields[k]?.visible}
                      onChange={v => updateFieldVisibility("bankFields", k, v)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "lineItems" && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                Line item columns
              </h4>
              <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-1">
                {Object.entries(LINE_COLUMN_LABELS).map(([k, label]) => (
                  <ToggleField
                    key={k}
                    label={label}
                    checked={state.lineItemColumns[k]?.visible}
                    onChange={v => updateFieldVisibility("lineItemColumns", k, v)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === "customText" && (
            <>
              <Field label="Header note (above line items)">
                <textarea
                  rows={2}
                  value={state.customText.headerNote}
                  onChange={e => updateCustomText("headerNote", e.target.value)}
                  placeholder="e.g. Welcome message or quote reference"
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white focus:border-[var(--brand-600)] outline-none resize-vertical"
                />
              </Field>
              <Field label="Footer note">
                <textarea
                  rows={2}
                  value={state.customText.footerNote}
                  onChange={e => updateCustomText("footerNote", e.target.value)}
                  placeholder="e.g. Thank you for your business"
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white focus:border-[var(--brand-600)] outline-none resize-vertical"
                />
              </Field>
              <Field label="Payment terms">
                <Input
                  value={state.customText.paymentTerms}
                  onChange={v => updateCustomText("paymentTerms", v)}
                  placeholder="e.g. Net 30"
                />
              </Field>
              <Field label="Watermark text (when invoice is paid)">
                <Input
                  value={state.customText.watermarkText}
                  onChange={v => updateCustomText("watermarkText", v)}
                  placeholder="PAID"
                />
              </Field>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-[var(--border-subtle)] flex-shrink-0">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>Save template</Btn>
        </div>
      </div>
    </div>
  );
}
