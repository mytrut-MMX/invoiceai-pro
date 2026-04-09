import { useState, useEffect, useContext } from "react";
import { ff, CIS_DEDUCTION_RATES, CIS_DEFAULT_SETTINGS } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../../components/icons";
import { Field, Input, Select, Btn, SlideToggle, InfoBox } from "../../components/atoms";

// ─── Section wrapper (local copy — will be shared in Refactor-4) ──────────
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

// ─── ChipToggle (local copy — matches SettingsPage.jsx version) ───────────
function ChipToggle({ value, onChange, options }) {
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      {options.map(option => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            style={{
              border: `1px solid ${selected ? "#1e6be0" : "#e8e8ec"}`,
              background: selected ? "#1e6be0" : "#fff",
              color: selected ? "#fff" : "#374151",
              borderRadius: 999,
              padding: "7px 12px",
              fontSize: 13,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {selected && <Icons.Check />}
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsTax({ orgSettings, onSave }) {
  const { user } = useContext(AppCtx);
  const org = orgSettings || {};

  // ─── Local state ─────────────────────────────────────────────────────────
  const [accountingBasis, setAccountingBasis] = useState(org.accountingBasis || "Accrual");
  const [vatReg,      setVatReg]      = useState(org.vatReg || "No");
  const [vatNum,      setVatNum]      = useState(org.vatNum || "");
  const [vatScheme,   setVatScheme]   = useState(org.vatScheme || "Standard");
  const [flatRatePct, setFlatRatePct] = useState(org.flatRatePct || "");
  const [cisRole,     setCisRole]     = useState(org.cisRole || "Contractor");
  const [cisRegistrationStatus, setCisRegistrationStatus] = useState(org.cisRegistrationStatus || "Net");
  const [cisEnabled,        setCisEnabled]        = useState(org.cis?.enabled ?? (org.cisReg === "Yes"));
  const [cisContractorName, setCisContractorName] = useState(org.cis?.contractorName || "");
  const [cisContractorUTR,  setCisContractorUTR]  = useState(org.cis?.contractorUTR || org.cisUtrNo || "");
  const [cisEmployerRef,    setCisEmployerRef]    = useState(org.cis?.employerRef || "");
  const [cisDefaultRate,    setCisDefaultRate]    = useState(org.cis?.defaultRate ?? org.cisRate ?? CIS_DEFAULT_SETTINGS.defaultRate);

  const [vatNumberLocked, setVatNumberLocked] = useState(Boolean(org.vatNum));
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState("");

  // ─── Sync from parent when orgSettings changes externally ────────────────
  useEffect(() => {
    if (!orgSettings) return;
    const o = orgSettings;
    setAccountingBasis(o.accountingBasis || "Accrual");
    setVatReg(o.vatReg || "No");
    setVatNum(o.vatNum || "");
    setVatScheme(o.vatScheme || "Standard");
    setFlatRatePct(o.flatRatePct || "");
    setCisRole(o.cisRole || "Contractor");
    setCisRegistrationStatus(o.cisRegistrationStatus || "Net");
    setCisEnabled(o.cis?.enabled ?? (o.cisReg === "Yes"));
    setCisContractorName(o.cis?.contractorName || "");
    setCisContractorUTR(o.cis?.contractorUTR || o.cisUtrNo || "");
    setCisEmployerRef(o.cis?.employerRef || "");
    setCisDefaultRate(o.cis?.defaultRate ?? o.cisRate ?? CIS_DEFAULT_SETTINGS.defaultRate);
    setVatNumberLocked(Boolean(o.vatNum));
    // Auto-populate contractor name from org name if not already set
    if (!o.cis?.contractorName && o.orgName) setCisContractorName(o.orgName);
  }, [orgSettings]);

  // When CIS is enabled and contractor name is blank, default it to the org name
  useEffect(() => {
    if (cisEnabled && !cisContractorName && org.orgName) {
      setCisContractorName(org.orgName);
    }
  }, [cisEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Save handler ────────────────────────────────────────────────────────
  const handleSave = () => {
    if (cisEnabled) {
      const utr = cisContractorUTR.replace(/\D/g, "");
      if (utr.length > 0 && utr.length !== 10) {
        setSaveError("Please enter a valid UTR number (10 digits).");
        return;
      }
    }
    setSaveError("");

    const partial = {
      accountingBasis,
      vatReg,
      vatNum,
      vatScheme,
      flatRatePct: vatScheme === "Flat Rate Scheme" ? flatRatePct : "",
      cisReg: cisEnabled ? "Yes" : "No",
      cisRole,
      cisRate: cisDefaultRate,
      cisUtrNo: cisContractorUTR,
      cisRegistrationStatus,
      cis: {
        enabled: cisEnabled,
        contractorName: cisContractorName,
        contractorUTR: cisContractorUTR,
        employerRef: cisEmployerRef,
        defaultRate: cisDefaultRate,
      },
    };

    try {
      onSave(partial);
      setVatNumberLocked(Boolean(vatNum));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  const requestTaxNumberEdit = (unlockField) => {
    const shouldUnlock = window.confirm("Are you sure this is the correct number?");
    if (shouldUnlock) unlockField(false);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <Section title="Tax Registration">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="Accounting Basis" hint="Cash basis available for sole traders with turnover ≤ £150,000">
            <Select value={accountingBasis} onChange={setAccountingBasis} options={["Accrual", "Cash"]} />
          </Field>
          {accountingBasis === "Cash" && org.bType !== "Sole Trader / Freelancer" && (
            <div style={{ gridColumn:"1 / -1" }}>
              <InfoBox color="#D97706">Cash basis is typically only available for sole traders and partnerships. Limited companies must use accrual accounting.</InfoBox>
            </div>
          )}
          <Field label="VAT Registered">
            <ChipToggle value={vatReg} onChange={setVatReg} options={["No", "Yes"]} />
          </Field>
          {vatReg === "Yes" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <Field label="VAT Number">
                <Input value={vatNum} onChange={setVatNum} placeholder="GB123456789" readOnly={vatNumberLocked} />
              </Field>
              {vatNumberLocked && (
                <Btn type="button" variant="outline" onClick={() => requestTaxNumberEdit(setVatNumberLocked)}>
                  Edit Tax no
                </Btn>
              )}
            </div>
          )}
          {vatReg === "Yes" && (
            <Field label="VAT Scheme" hint="Determines when VAT is due to HMRC">
              <Select value={vatScheme} onChange={setVatScheme} options={["Standard", "Cash Accounting", "Flat Rate Scheme", "Annual Accounting"]} />
            </Field>
          )}
          {vatReg === "Yes" && vatScheme === "Flat Rate Scheme" && (
            <Field label="Flat Rate %" hint="Your sector flat rate percentage">
              <Input value={flatRatePct} onChange={setFlatRatePct} type="number" placeholder="e.g. 12" />
            </Field>
          )}
        </div>

        <div style={{ marginTop:14, paddingTop:16, borderTop:"1px solid #f0f0f4" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom: cisEnabled ? 20 : 0 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>Enable CIS</div>
              <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>
                Activates Construction Industry Scheme deductions on invoices.
              </div>
            </div>
            <SlideToggle value={cisEnabled} onChange={setCisEnabled} />
          </div>

          {cisEnabled && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, padding:"16px 0 0", borderTop:"1px solid #f3f4f6" }}>
              <Field label="Contractor Name">
                <Input value={cisContractorName} onChange={setCisContractorName} placeholder="Your company name" />
              </Field>

              <Field label="CIS Role">
                <Select value={cisRole} onChange={setCisRole} options={["Contractor","Subcontractor","Both"]} />
              </Field>

              <Field label="UTR Number" error={cisContractorUTR && cisContractorUTR.replace(/\D/g,"").length !== 10 ? "UTR must be 10 digits" : ""}>
                <Input value={cisContractorUTR} onChange={setCisContractorUTR} placeholder="10-digit UTR number" maxLength={10} />
              </Field>

              <Field label="CIS Registration Status">
                <Select value={cisRegistrationStatus} onChange={setCisRegistrationStatus} options={["Gross","Net"]} />
              </Field>

              <Field label="Employer's PAYE Reference">
                <Input value={cisEmployerRef} onChange={setCisEmployerRef} placeholder="e.g. 123/AB456" />
              </Field>

              <Field label="Default Deduction Rate">
                <Select
                  value={String(cisDefaultRate)}
                  onChange={v => setCisDefaultRate(Number(v))}
                  options={CIS_DEDUCTION_RATES}
                />
              </Field>
            </div>
          )}
        </div>
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
              <Icons.Check /> Tax settings saved.
            </div>
          )}
          <Btn onClick={handleSave} variant="primary" icon={<Icons.Save />} style={{ background: saved ? "#059669" : "#1e6be0", color:"#fff" }}>
            Save tax settings
          </Btn>
        </div>
      </div>
    </>
  );
}
