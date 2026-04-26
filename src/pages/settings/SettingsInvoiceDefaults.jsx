import { useState, useEffect } from "react";
import { Icons } from "../../components/icons";
import { Field, Input, Select, Btn, InfoBox } from "../../components/atoms";
import Section from "../../components/settings/Section";
import { useToast } from "../../components/ui/Toast";
import { listPaymentTerms } from "../../lib/paymentTerms";
import { DEFAULT_INV_TERMS, PDF_TEMPLATES } from "../../constants";

const textareaCls =
  "w-full px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-[var(--surface-card)] outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border resize-vertical font-[inherit]";

export default function SettingsInvoiceDefaults({ orgSettings, onSave }) {
  const { toast } = useToast();
  const defaults = orgSettings?.invoiceDefaults || {};

  const [prefix,        setPrefix]        = useState(defaults.prefix ?? "INV-");
  const [paymentTerms,  setPaymentTerms]  = useState(defaults.paymentTerms || "Net 30");
  const [notes,         setNotes]         = useState(defaults.notes ?? "");
  const [terms,         setTerms]         = useState(defaults.terms ?? DEFAULT_INV_TERMS);
  const [template,      setTemplate]      = useState(defaults.template || "classic");
  const [termOptions,   setTermOptions]   = useState([{ value: "Net 30", label: "Net 30" }]);
  const [saved,         setSaved]         = useState(false);
  const [saveError,     setSaveError]     = useState("");

  useEffect(() => {
    if (!orgSettings?.invoiceDefaults) return;
    const d = orgSettings.invoiceDefaults;
    setPrefix(d.prefix ?? "INV-");
    setPaymentTerms(d.paymentTerms || "Net 30");
    setNotes(d.notes ?? "");
    setTerms(d.terms ?? DEFAULT_INV_TERMS);
    setTemplate(d.template || "classic");
  }, [orgSettings?.invoiceDefaults]);

  useEffect(() => {
    let cancelled = false;
    listPaymentTerms().then(({ data }) => {
      if (cancelled) return;
      const opts = (data || []).map(t => ({ value: t.name, label: t.name }));
      if (opts.length) setTermOptions(opts);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSave = () => {
    setSaveError("");
    try {
      onSave({
        invoiceDefaults: {
          prefix: prefix.trim(),
          paymentTerms,
          notes,
          terms,
          template,
        },
      });
      setSaved(true);
      toast({ title: "Invoice defaults saved", variant: "success" });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Something went wrong. Please try again.");
      toast({ title: "Failed to save invoice defaults", variant: "danger" });
    }
  };

  const templateOptions = PDF_TEMPLATES.map(t => ({ value: t.id, label: t.name }));
  const previewNumber = `${prefix || ""}0001`;

  return (
    <>
      <Section title="Numbering">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field
            label="Invoice number prefix"
            hint="Prefix added to all new invoice numbers"
          >
            <Input value={prefix} onChange={setPrefix} placeholder="INV-" />
          </Field>
          <Field label="Next number preview" hint="Example of the next invoice number">
            <Input value={previewNumber} onChange={() => {}} readOnly />
          </Field>
        </div>
      </Section>

      <Section title="Payment">
        <Field label="Default payment terms" hint="Applied to new invoices unless the customer has an override">
          <Select
            value={paymentTerms}
            onChange={setPaymentTerms}
            options={termOptions}
          />
        </Field>
      </Section>

      <Section title="Document content">
        <div className="mb-3.5">
          <Field label="Default notes" hint="Appears at the bottom of every new invoice">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Thank you for your business!"
              className={textareaCls}
            />
          </Field>
        </div>
        <Field label="Default terms & conditions" hint="Legal terms printed on every new invoice">
          <textarea
            value={terms}
            onChange={e => setTerms(e.target.value)}
            rows={4}
            placeholder={DEFAULT_INV_TERMS}
            className={textareaCls}
          />
        </Field>
        <InfoBox>
          These defaults only apply to new invoices. Existing invoices keep their original notes and terms.
        </InfoBox>
      </Section>

      <Section title="Appearance">
        <Field label="Default template" hint="Template selected when creating a new invoice">
          <Select
            value={template}
            onChange={setTemplate}
            options={templateOptions}
          />
        </Field>
      </Section>

      <div className="flex flex-col items-end gap-2 mt-4">
        {saveError && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--danger-600)] font-semibold">
            <Icons.Alert /> {saveError}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--success-700)] font-semibold">
              <Icons.Check /> Saved.
            </div>
          )}
          <Btn onClick={handleSave} variant={saved ? "success" : "primary"} icon={<Icons.Save />}>
            Save invoice defaults
          </Btn>
        </div>
      </div>
    </>
  );
}