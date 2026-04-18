import { useState, useEffect } from "react";
import { CIS_DEDUCTION_RATES, CIS_DEFAULT_SETTINGS } from "../../constants";
import { Icons } from "../../components/icons";
import { Field, Input, Select, Btn, SlideToggle, InfoBox } from "../../components/atoms";
import Section from "../../components/settings/Section";

function ChipToggle({ value, onChange, options }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(option => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={[
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold cursor-pointer transition-colors duration-150",
              selected
                ? "bg-[var(--brand-600)] text-white border border-[var(--brand-600)]"
                : "bg-white text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--surface-sunken)]",
            ].join(" ")}
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
  const org = orgSettings || {};

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
    if (!o.cis?.contractorName && o.orgName) setCisContractorName(o.orgName);
  }, [orgSettings]);

  useEffect(() => {
    if (cisEnabled && !cisContractorName && org.orgName) {
      setCisContractorName(org.orgName);
    }
  }, [cisEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    if (cisEnabled) {
      const utr = cisContractorUTR.replace(/\D/g, "");
      if (utr.length > 0 && utr.length !== 10) {
        setSaveError("Please enter a valid UTR number (10 digits).");
        return;
      }
    }
    setSaveError("");

    try {
      onSave({
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
      });
      setVatNumberLocked(Boolean(vatNum));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  const requestTaxNumberEdit = (unlockField) => {
    if (window.confirm("Are you sure this is the correct number?")) unlockField(false);
  };

  return (
    <>
      <Section title="Tax registration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Accounting Basis" hint="Cash basis available for sole traders with turnover ≤ £150,000">
            <Select value={accountingBasis} onChange={setAccountingBasis} options={["Accrual", "Cash"]} />
          </Field>
          {accountingBasis === "Cash" && org.bType !== "Sole Trader / Freelancer" && (
            <div className="md:col-span-2">
              <InfoBox color="var(--warning-600)">
                Cash basis is typically only available for sole traders and partnerships. Limited companies must use accrual accounting.
              </InfoBox>
            </div>
          )}
          <Field label="VAT Registered">
            <ChipToggle value={vatReg} onChange={setVatReg} options={["No", "Yes"]} />
          </Field>
          {vatReg === "Yes" && (
            <div className="flex flex-col gap-2">
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
              <Select
                value={vatScheme}
                onChange={setVatScheme}
                options={["Standard", "Cash Accounting", "Flat Rate Scheme", "Annual Accounting"]}
              />
            </Field>
          )}
          {vatReg === "Yes" && vatScheme === "Flat Rate Scheme" && (
            <Field label="Flat Rate %" hint="Your sector flat rate percentage">
              <Input value={flatRatePct} onChange={setFlatRatePct} type="number" placeholder="e.g. 12" />
            </Field>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
          <div className={`flex items-center justify-between gap-4 ${cisEnabled ? "mb-5" : ""}`}>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Enable CIS</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Activates Construction Industry Scheme deductions on invoices.
              </div>
            </div>
            <SlideToggle value={cisEnabled} onChange={setCisEnabled} />
          </div>

          {cisEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-4 border-t border-[var(--border-subtle)]">
              <Field label="Contractor Name">
                <Input value={cisContractorName} onChange={setCisContractorName} placeholder="Your company name" />
              </Field>
              <Field label="CIS Role">
                <Select value={cisRole} onChange={setCisRole} options={["Contractor", "Subcontractor", "Both"]} />
              </Field>
              <Field
                label="UTR Number"
                error={cisContractorUTR && cisContractorUTR.replace(/\D/g, "").length !== 10 ? "UTR must be 10 digits" : ""}
              >
                <Input value={cisContractorUTR} onChange={setCisContractorUTR} placeholder="10-digit UTR number" />
              </Field>
              <Field label="CIS Registration Status">
                <Select value={cisRegistrationStatus} onChange={setCisRegistrationStatus} options={["Gross", "Net"]} />
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
            Save tax settings
          </Btn>
        </div>
      </div>
    </>
  );
}
