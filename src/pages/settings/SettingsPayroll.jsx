import { useState, useEffect } from "react";
import { ff } from "../../constants";
import { Icons } from "../../components/icons";
import { Field, Input, Select, Btn, InfoBox } from "../../components/atoms";

// ─── Section wrapper (local copy — will be shared in Refactor-4c) ─────────
function Section({ title, children }) {
  return (
    <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", marginBottom:18, overflow:"hidden" }}>
      <div style={{ padding:"14px 22px 12px", borderBottom:"1px solid #f0f0f4" }}>
        <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#1a1a2e" }}>{title}</h3>
      </div>
      <div style={{ padding:"18px 22px" }}>{children}</div>
    </div>
  );
}

export default function SettingsPayroll({ orgSettings, onSave }) {
  const org = orgSettings || {};

  // ─── Local state ─────────────────────────────────────────────────────────
  const [payeRef,              setPayeRef]              = useState(org.payeRef || "");
  const [accountsOfficeRef,    setAccountsOfficeRef]    = useState(org.accountsOfficeRef || "");
  const [taxOfficeNumber,      setTaxOfficeNumber]      = useState(org.taxOfficeNumber || "");
  const [pensionProvider,      setPensionProvider]      = useState(org.pensionProvider || "");
  const [defaultPensionEmployeePct, setDefaultPensionEmployeePct] = useState(org.defaultPensionEmployeePct ?? 5);
  const [defaultPensionEmployerPct, setDefaultPensionEmployerPct] = useState(org.defaultPensionEmployerPct ?? 3);
  const [autoEnrolmentStagingDate, setAutoEnrolmentStagingDate] = useState(org.autoEnrolmentStagingDate || "");
  const [defaultPayFrequency,  setDefaultPayFrequency]  = useState(org.defaultPayFrequency || "monthly");
  const [defaultPayDay,        setDefaultPayDay]        = useState(org.defaultPayDay || "last-friday");
  const [payeRefError,         setPayeRefError]         = useState("");
  const [saved,                setSaved]                = useState(false);
  const [saveError,            setSaveError]            = useState("");

  // ─── Sync from parent when orgSettings changes externally ────────────────
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

  // ─── Save handler ────────────────────────────────────────────────────────
  const handleSave = () => {
    // Validate PAYE ref if provided
    if (payeRef && !/^\d{3}\/[A-Z0-9]{1,10}$/i.test(payeRef)) {
      setPayeRefError("Invalid format (e.g. 123/AB456)");
      setSaveError("Please fix the errors before saving.");
      return;
    }
    setPayeRefError("");
    setSaveError("");

    const partial = {
      payeRef,
      accountsOfficeRef,
      taxOfficeNumber,
      pensionProvider,
      defaultPensionEmployeePct: Number(defaultPensionEmployeePct),
      defaultPensionEmployerPct: Number(defaultPensionEmployerPct),
      autoEnrolmentStagingDate,
      defaultPayFrequency,
      defaultPayDay,
    };

    try {
      onSave(partial);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <Section title="Employer Details">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <Field label="PAYE Reference" hint="Format: 123/AB456" error={payeRefError}>
            <input value={payeRef} onChange={e => { setPayeRef(e.target.value); if (payeRefError) setPayeRefError(""); }}
              placeholder="123/AB456"
              onBlur={() => { if (payeRef && !/^\d{3}\/[A-Z0-9]{1,10}$/i.test(payeRef)) setPayeRefError("Invalid format (e.g. 123/AB456)"); else setPayeRefError(""); }}
              style={{ width:"100%", padding:"9px 11px", border:`1px solid ${payeRefError ? "#fca5a5" : "#e8e8ec"}`, borderRadius:5, fontSize:15, fontFamily:ff, color:"#1A1A1A", background:"#fff", outline:"none", boxSizing:"border-box", transition:"border 0.15s" }}
              onFocus={e => e.target.style.borderColor = payeRefError ? "#dc2626" : "#1e6be0"}
            />
          </Field>
          <Field label="Accounts Office Reference" hint="13 characters">
            <Input value={accountsOfficeRef} onChange={setAccountsOfficeRef} placeholder="123PA00012345" />
          </Field>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Field label="Tax Office Number" hint="3 digits">
            <Input value={taxOfficeNumber} onChange={v => setTaxOfficeNumber(v.replace(/\D/g,"").slice(0,3))} placeholder="123" />
          </Field>
        </div>
      </Section>

      <Section title="Pension Provider">
        <div style={{ marginBottom:14 }}>
          <Field label="Provider Name">
            <Input value={pensionProvider} onChange={setPensionProvider} placeholder="e.g. NEST, NOW: Pensions, The People's Pension" />
          </Field>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
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

      <Section title="Pay Schedule">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <Field label="Default Pay Frequency">
            <Select value={defaultPayFrequency} onChange={v => { setDefaultPayFrequency(v); setDefaultPayDay(v === "weekly" ? "friday" : "last-friday"); }}
              options={[{ value:"weekly", label:"Weekly" }, { value:"fortnightly", label:"Fortnightly" }, { value:"monthly", label:"Monthly" }]} />
          </Field>
          <Field label="Default Pay Day">
            <Select value={defaultPayDay} onChange={setDefaultPayDay}
              options={defaultPayFrequency === "weekly" || defaultPayFrequency === "fortnightly"
                ? [{ value:"friday", label:"Friday" }, { value:"thursday", label:"Thursday" }, { value:"custom", label:"Custom" }]
                : [{ value:"last-friday", label:"Last Friday" }, { value:"last-working", label:"Last Working Day" }, { value:"25th", label:"25th" }, { value:"custom", label:"Custom" }]
              } />
          </Field>
        </div>
        <InfoBox>These settings provide defaults when creating new payroll runs. You can override them per run.</InfoBox>
      </Section>

      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, marginTop:16 }}>
        {saveError && (
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#dc2626", fontWeight:600 }}>
            <Icons.Alert /> {saveError}
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {saved && (
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#16A34A", fontWeight:600 }}>
              <Icons.Check /> Payroll settings saved.
            </div>
          )}
          <Btn onClick={handleSave} variant="primary" icon={<Icons.Save />} style={{ background: saved ? "#059669" : "#1e6be0", color:"#fff" }}>
            Save payroll settings
          </Btn>
        </div>
      </div>
    </>
  );
}
