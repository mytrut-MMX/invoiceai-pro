import { useState, useEffect } from "react";
import { Icons } from "../../components/icons";
import { Field, Input, Select, Btn, InfoBox } from "../../components/atoms";
import Section from "../../components/settings/Section";
import EmploymentAllowanceSection from "./EmploymentAllowanceSection";
import { useToast } from "../../components/ui/Toast";

export default function SettingsPayroll({ orgSettings, onSave }) {
  const { toast } = useToast();
  const org = orgSettings || {};

  const [payeRef,                 setPayeRef]                 = useState(org.payeRef || "");
  const [accountsOfficeRef,       setAccountsOfficeRef]       = useState(org.accountsOfficeRef || "");
  const [taxOfficeNumber,         setTaxOfficeNumber]         = useState(org.taxOfficeNumber || "");
  const [pensionProvider,         setPensionProvider]         = useState(org.pensionProvider || "");
  const [defaultPensionEmployeePct, setDefaultPensionEmployeePct] = useState(org.defaultPensionEmployeePct ?? 5);
  const [defaultPensionEmployerPct, setDefaultPensionEmployerPct] = useState(org.defaultPensionEmployerPct ?? 3);
  const [autoEnrolmentStagingDate, setAutoEnrolmentStagingDate]   = useState(org.autoEnrolmentStagingDate || "");
  const [defaultPayFrequency,     setDefaultPayFrequency]     = useState(org.defaultPayFrequency || "monthly");
  const [defaultPayDay,           setDefaultPayDay]           = useState(org.defaultPayDay || "last-friday");
  const [payeRefError,            setPayeRefError]            = useState("");
  const [saved,                   setSaved]                   = useState(false);
  const [saveError,               setSaveError]               = useState("");

  useEffect(() => {
    if (!orgSettings) return;
    const o = orgSettings;
    setPayeRef(o.payeRef || "");
    setAccountsOfficeRef(o.accountsOfficeRef || "");
    setTaxOfficeNumber(o.taxOfficeNumber || "");
    setPensionProvider(o.pensionProvider || "");
    setDefaultPensionEmployeePct(o.defaultPensionEmployeePct ?? 5);
    setDefaultPensionEmployerPct(o.defaultPensionEmployerPct ?? 3);
    setAutoEnrolmentStagingDate(o.autoEnrolmentStagingDate || "");
    setDefaultPayFrequency(o.defaultPayFrequency || "monthly");
    setDefaultPayDay(o.defaultPayDay || "last-friday");
  }, [orgSettings]);

  const handleSave = () => {
    if (payeRef && !/^\d{3}\/[A-Z0-9]{1,10}$/i.test(payeRef)) {
      setPayeRefError("Invalid format (e.g. 123/AB456)");
      setSaveError("Please fix the errors before saving.");
      return;
    }
    setPayeRefError("");
    setSaveError("");

    try {
      onSave({
        payeRef,
        accountsOfficeRef,
        taxOfficeNumber,
        pensionProvider,
        defaultPensionEmployeePct: Number(defaultPensionEmployeePct),
        defaultPensionEmployerPct: Number(defaultPensionEmployerPct),
        autoEnrolmentStagingDate,
        defaultPayFrequency,
        defaultPayDay,
      });
      setSaved(true);
      toast({ title: "Payroll settings saved", variant: "success" });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
      toast({ title: "Failed to save payroll settings", variant: "danger" });
    }
  };

  const payeInputCls = [
    "w-full h-9 px-3 rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none transition-colors duration-150 box-border",
    payeRefError
      ? "border border-[var(--danger-600)] focus:shadow-[var(--focus-ring)]"
      : "border border-[var(--border-default)] focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
  ].join(" ");

  return (
    <>
      <Section title="Employer details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
          <Field label="PAYE Reference" hint="Format: 123/AB456" error={payeRefError}>
            <input
              value={payeRef}
              onChange={e => { setPayeRef(e.target.value); if (payeRefError) setPayeRefError(""); }}
              onBlur={() => {
                if (payeRef && !/^\d{3}\/[A-Z0-9]{1,10}$/i.test(payeRef)) setPayeRefError("Invalid format (e.g. 123/AB456)");
                else setPayeRefError("");
              }}
              placeholder="123/AB456"
              className={payeInputCls}
            />
          </Field>
          <Field label="Accounts Office Reference" hint="13 characters">
            <Input value={accountsOfficeRef} onChange={setAccountsOfficeRef} placeholder="123PA00012345" />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Tax Office Number" hint="3 digits">
            <Input value={taxOfficeNumber} onChange={v => setTaxOfficeNumber(v.replace(/\D/g, "").slice(0, 3))} placeholder="123" />
          </Field>
        </div>
      </Section>

      <Section title="Pension provider">
        <div className="mb-3.5">
          <Field label="Provider Name">
            <Input value={pensionProvider} onChange={setPensionProvider} placeholder="e.g. NEST, NOW: Pensions, The People's Pension" />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
          <Field label="Default Employee Contribution %" hint="Auto-enrolment minimum is 5%">
            <Input value={defaultPensionEmployeePct} onChange={setDefaultPensionEmployeePct} type="number" placeholder="5" />
          </Field>
          <Field label="Default Employer Contribution %" hint="Auto-enrolment minimum is 3%">
            <Input value={defaultPensionEmployerPct} onChange={setDefaultPensionEmployerPct} type="number" placeholder="3" />
          </Field>
        </div>
        <Field label="Auto-enrolment Staging Date" hint="Date your auto-enrolment duties started">
          <Input value={autoEnrolmentStagingDate} onChange={setAutoEnrolmentStagingDate} type="date" />
        </Field>
      </Section>

      <Section title="Pay schedule">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
          <Field label="Default Pay Frequency">
            <Select
              value={defaultPayFrequency}
              onChange={v => { setDefaultPayFrequency(v); setDefaultPayDay(v === "weekly" ? "friday" : "last-friday"); }}
              options={[
                { value: "weekly",      label: "Weekly" },
                { value: "fortnightly", label: "Fortnightly" },
                { value: "monthly",     label: "Monthly" },
              ]}
            />
          </Field>
          <Field label="Default Pay Day">
            <Select
              value={defaultPayDay}
              onChange={setDefaultPayDay}
              options={
                defaultPayFrequency === "weekly" || defaultPayFrequency === "fortnightly"
                  ? [
                      { value: "friday",   label: "Friday" },
                      { value: "thursday", label: "Thursday" },
                      { value: "custom",   label: "Custom" },
                    ]
                  : [
                      { value: "last-friday",  label: "Last Friday" },
                      { value: "last-working", label: "Last Working Day" },
                      { value: "25th",         label: "25th" },
                      { value: "custom",       label: "Custom" },
                    ]
              }
            />
          </Field>
        </div>
        <InfoBox>These settings provide defaults when creating new payroll runs. You can override them per run.</InfoBox>
      </Section>

      <EmploymentAllowanceSection />

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
            Save payroll settings
          </Btn>
        </div>
      </div>
    </>
  );
}
