import { useState, useEffect } from "react";
import { Icons } from "../../components/icons";
import { Field, Input, Select, Btn, InfoBox, Switch } from "../../components/atoms";
import Section from "../../components/settings/Section";
import { useToast } from "../../components/ui/Toast";
import { EXPENSE_CATEGORIES } from "../../constants";

const SA_CODE_OPTIONS = [
  { value: "advertising_entertainment", label: "Advertising & entertainment" },
  { value: "travel_motor",              label: "Travel & motor" },
  { value: "capital_allowances",        label: "Capital allowances" },
  { value: "staff_costs",               label: "Staff costs" },
  { value: "cost_of_goods",             label: "Cost of goods" },
  { value: "financial_charges",         label: "Financial charges" },
  { value: "premises_costs",            label: "Premises costs" },
  { value: "admin_office",              label: "Admin & office" },
  { value: "professional_fees",         label: "Professional fees" },
  { value: "repairs_maintenance",       label: "Repairs & maintenance" },
  { value: "other_expenses",            label: "Other expenses" },
];

const withDefaults = (list) =>
  list.map(c => ({ ...c, enabled: c.enabled !== false }));

const seedFromConstants = () =>
  EXPENSE_CATEGORIES.map(c => ({ ...c, enabled: true }));

export default function SettingsExpenseCategories({ orgSettings, onSave }) {
  const { toast } = useToast();

  const [categories, setCategories] = useState(() =>
    orgSettings?.expenseCategories?.length
      ? withDefaults(orgSettings.expenseCategories)
      : seedFromConstants()
  );
  const [newCode,   setNewCode]   = useState("");
  const [newName,   setNewName]   = useState("");
  const [newSaCode, setNewSaCode] = useState("other_expenses");
  const [addError,  setAddError]  = useState("");
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!orgSettings?.expenseCategories?.length) return;
    setCategories(withDefaults(orgSettings.expenseCategories));
  }, [orgSettings?.expenseCategories]);

  const toggleEnabled = (code) => {
    setCategories(prev => prev.map(c =>
      c.code === code ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const handleAdd = () => {
    setAddError("");
    const code = newCode.trim();
    const name = newName.trim();
    if (!/^\d{3}$/.test(code)) {
      setAddError("Code must be exactly 3 digits.");
      return;
    }
    if (!name) {
      setAddError("Name is required.");
      return;
    }
    if (categories.some(c => c.code === code)) {
      setAddError(`Code ${code} is already in use.`);
      return;
    }
    setCategories(prev => [
      ...prev,
      { code, name, hmrc_sa_code: newSaCode, enabled: true },
    ]);
    setNewCode("");
    setNewName("");
    setNewSaCode("other_expenses");
  };

  const handleSave = () => {
    setSaveError("");
    try {
      onSave({ expenseCategories: categories });
      setSaved(true);
      toast({ title: "Expense categories saved", variant: "success" });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Something went wrong. Please try again.");
      toast({ title: "Failed to save expense categories", variant: "danger" });
    }
  };

  const enabledCount = categories.filter(c => c.enabled).length;

  return (
    <>
      <Section title="Expense categories">
        <InfoBox>
          Manage which categories appear in the expense form. Disabled categories
          are hidden but existing expenses keep their category.
        </InfoBox>

        <div className="text-xs text-[var(--text-tertiary)] mt-3 mb-2">
          {enabledCount} of {categories.length} enabled
        </div>

        <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
          {categories.map((c, i) => (
            <div
              key={c.code}
              className={[
                "flex items-center gap-3 px-3 py-2",
                i < categories.length - 1 ? "border-b border-[var(--border-subtle)]" : "",
                c.enabled ? "" : "opacity-50",
              ].join(" ")}
            >
              <span className="font-mono text-xs text-[var(--text-tertiary)] w-12 flex-shrink-0">
                {c.code}
              </span>
              <span className="text-sm text-[var(--text-primary)] flex-1 min-w-0 truncate">
                {c.name}
              </span>
              <Switch
                checked={c.enabled}
                onChange={() => toggleEnabled(c.code)}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Add custom category">
        <div className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_auto] gap-3 items-end">
          <Field label="Code">
            <Input
              value={newCode}
              onChange={setNewCode}
              placeholder="600"
              maxLength={3}
            />
          </Field>
          <Field label="Name">
            <Input
              value={newName}
              onChange={setNewName}
              placeholder="e.g. Charitable donations"
            />
          </Field>
          <Field label="HMRC SA category">
            <Select
              value={newSaCode}
              onChange={setNewSaCode}
              options={SA_CODE_OPTIONS}
            />
          </Field>
          <Btn onClick={handleAdd} variant="outline" icon={<Icons.Plus />}>
            Add
          </Btn>
        </div>
        {addError && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--danger-600)] font-semibold mt-2">
            <Icons.Alert /> {addError}
          </div>
        )}
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
            Save categories
          </Btn>
        </div>
      </div>
    </>
  );
}
