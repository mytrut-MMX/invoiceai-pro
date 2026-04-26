import { useState, useEffect } from "react";
import { Icons } from "../../components/icons";
import { Field, Input, Btn, InfoBox } from "../../components/atoms";
import Section from "../../components/settings/Section";
import { useToast } from "../../components/ui/Toast";
import { DEFAULT_QUOTE_TERMS } from "../../constants";

const textareaCls =
  "w-full px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-[var(--surface-card)] outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border resize-vertical font-[inherit]";

export default function SettingsQuoteDefaults({ orgSettings, onSave }) {
  const { toast } = useToast();
  const defaults = orgSettings?.quoteDefaults || {};

  const [validityDays, setValidityDays] = useState(String(defaults.validityDays ?? 30));
  const [notes,        setNotes]        = useState(defaults.notes ?? "");
  const [terms,        setTerms]        = useState(defaults.terms ?? DEFAULT_QUOTE_TERMS);
  const [saved,        setSaved]        = useState(false);
  const [saveError,    setSaveError]    = useState("");

  useEffect(() => {
    if (!orgSettings?.quoteDefaults) return;
    const d = orgSettings.quoteDefaults;
    setValidityDays(String(d.validityDays ?? 30));
    setNotes(d.notes ?? "");
    setTerms(d.terms ?? DEFAULT_QUOTE_TERMS);
  }, [orgSettings?.quoteDefaults]);

  const handleSave = () => {
    setSaveError("");
    const days = parseInt(validityDays, 10);
    if (!Number.isFinite(days) || days < 1) {
      setSaveError("Validity must be a positive number of days.");
      toast({ title: "Invalid validity period", variant: "danger" });
      return;
    }
    try {
      onSave({
        quoteDefaults: {
          validityDays: days,
          notes,
          terms,
        },
      });
      setSaved(true);
      toast({ title: "Quote defaults saved", variant: "success" });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Something went wrong. Please try again.");
      toast({ title: "Failed to save quote defaults", variant: "danger" });
    }
  };

  return (
    <>
      <Section title="Validity">
        <Field
          label="Default validity period (days)"
          hint="Number of days until a new quote expires"
        >
          <Input
            type="number"
            value={validityDays}
            onChange={setValidityDays}
            placeholder="30"
          />
        </Field>
      </Section>

      <Section title="Document content">
        <div className="mb-3.5">
          <Field label="Default notes" hint="Appears at the bottom of every new quote">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. We look forward to working with you!"
              className={textareaCls}
            />
          </Field>
        </div>
        <Field label="Default terms & conditions" hint="Legal terms printed on every new quote">
          <textarea
            value={terms}
            onChange={e => setTerms(e.target.value)}
            rows={4}
            placeholder={DEFAULT_QUOTE_TERMS}
            className={textareaCls}
          />
        </Field>
        <InfoBox>
          These defaults only apply to new quotes. Existing quotes keep their original notes and terms.
        </InfoBox>
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
            Save quote defaults
          </Btn>
        </div>
      </div>
    </>
  );
}
