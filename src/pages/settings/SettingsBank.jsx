import { useState, useEffect } from "react";
import { Icons } from "../../components/icons";
import { Field, Input, Btn } from "../../components/atoms";
import { formatSortCode, stripSortCode } from "../../utils/helpers";
import Section from "../../components/settings/Section";
import { useToast } from "../../components/ui/Toast";

export default function SettingsBank({ orgSettings, onSave }) {
  const { toast } = useToast();
  const org = orgSettings || {};

  const [bankName,  setBankName]  = useState(org.bankName || "");
  const [bankSort,  setBankSort]  = useState(formatSortCode(org.bankSort || ""));
  const [bankAcc,   setBankAcc]   = useState(org.bankAcc || "");
  const [bankIban,  setBankIban]  = useState(org.bankIban || "");
  const [bankSwift, setBankSwift] = useState(org.bankSwift || "");
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!orgSettings) return;
    setBankName(org.bankName || "");
    setBankSort(formatSortCode(org.bankSort || ""));
    setBankAcc(org.bankAcc || "");
    setBankIban(org.bankIban || "");
    setBankSwift(org.bankSwift || "");
  }, [orgSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortCodeError = bankSort && stripSortCode(bankSort).length !== 6 && stripSortCode(bankSort).length > 0
    ? "Sort code must be exactly 6 digits."
    : "";

  const handleSave = () => {
    if (sortCodeError) {
      setSaveError("Please fix the sort code before saving.");
      return;
    }
    setSaveError("");
    try {
      onSave({ bankName, bankSort: stripSortCode(bankSort), bankAcc, bankIban, bankSwift });
      setSaved(true);
      toast({ title: "Bank details saved", variant: "success" });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
      toast({ title: "Failed to save bank details", variant: "danger" });
    }
  };

  return (
    <>
      <Section title="Bank details (shown on invoices)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Bank Name">
            <Input value={bankName} onChange={setBankName} placeholder="e.g. Barclays" />
          </Field>
          <Field label="Sort Code" error={sortCodeError}>
            <input
              type="text"
              value={bankSort}
              onChange={e => setBankSort(e.target.value.replace(/[^0-9-]/g, ""))}
              onBlur={() => setBankSort(formatSortCode(bankSort))}
              placeholder="00-00-00"
              maxLength={8}
              className={[
                "w-full h-9 px-3 rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none transition-colors duration-150 box-border",
                sortCodeError
                  ? "border border-[var(--danger-600)] focus:shadow-[var(--focus-ring)]"
                  : "border border-[var(--border-default)] focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
              ].join(" ")}
            />
          </Field>
          <Field label="Account Number">
            <Input value={bankAcc} onChange={setBankAcc} placeholder="12345678" />
          </Field>
          <Field label="IBAN (optional)">
            <Input value={bankIban} onChange={setBankIban} />
          </Field>
          <Field label="SWIFT / BIC (optional)">
            <Input value={bankSwift} onChange={setBankSwift} />
          </Field>
        </div>
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
            Save bank settings
          </Btn>
        </div>
      </div>
    </>
  );
}
