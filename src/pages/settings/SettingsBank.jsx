import { useState, useEffect } from "react";
import { ff } from "../../constants";
import { Icons } from "../../components/icons";
import { Field, Input, Btn } from "../../components/atoms";
import { formatSortCode, stripSortCode } from "../../utils/helpers";
import Section from "../../components/settings/Section";

/**
 * Bank Details settings tab.
 * Self-contained: owns its own state, syncs from orgSettings prop,
 * calls onSave with partial settings object.
 */
export default function SettingsBank({ orgSettings, onSave }) {
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
      onSave({
        bankName,
        bankSort: stripSortCode(bankSort),
        bankAcc,
        bankIban,
        bankSwift,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <Section title="Bank Details (shown on invoices)">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="Bank Name"><Input value={bankName} onChange={setBankName} placeholder="e.g. Barclays" /></Field>
          <Field label="Sort Code" error={sortCodeError}>
            <input type="text" value={bankSort} onChange={e=>setBankSort(e.target.value.replace(/[^0-9-]/g, ""))} onBlur={()=>setBankSort(formatSortCode(bankSort))} placeholder="00-00-00" maxLength={8}
              style={{ width:"100%", padding:"9px 11px", border:`1px solid ${sortCodeError ? "#fca5a5" : "#e8e8ec"}`, borderRadius:5, fontSize:15, fontFamily:ff, color:"#1A1A1A", background:"#fff", outline:"none", boxSizing:"border-box", transition:"border 0.15s" }}
              onFocus={e=>e.target.style.borderColor="#1e6be0"} />
          </Field>
          <Field label="Account Number"><Input value={bankAcc} onChange={setBankAcc} placeholder="12345678" /></Field>
          <Field label="IBAN (optional)"><Input value={bankIban} onChange={setBankIban} /></Field>
          <Field label="SWIFT / BIC (optional)"><Input value={bankSwift} onChange={setBankSwift} /></Field>
        </div>
      </Section>

      {/* Save actions */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, marginTop:16 }}>
        {saveError && (
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#dc2626", fontWeight:600 }}>
            <Icons.Alert /> {saveError}
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {saved && (
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#16A34A", fontWeight:600 }}>
              <Icons.Check /> Bank details saved.
            </div>
          )}
          <Btn onClick={handleSave} variant="primary" icon={<Icons.Save />} style={{ background: saved ? "#059669" : "#1e6be0", color:"#fff" }}>
            Save bank settings
          </Btn>
        </div>
      </div>
    </>
  );
}
