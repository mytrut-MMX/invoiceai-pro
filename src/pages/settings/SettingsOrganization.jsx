import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import {
  ff,
  CURRENCIES_LIST,
  TIMEZONES,
  INDUSTRIES,
  COUNTRIES,
  normalizeCurrencyCode,
} from "../../constants";
import { Icons } from "../../components/icons";
import { Field, Input, Select, Btn } from "../../components/atoms";
import { validateUkCrn, formatPhoneNumber, stripPhoneForStorage } from "../../utils/helpers";
import Section from "../../components/settings/Section";

/**
 * Organization Details settings tab.
 * Self-contained: owns its own state, syncs from orgSettings prop,
 * calls onSave with partial settings object.
 */
export default function SettingsOrganization({ orgSettings, onSave }) {
  const navigate = useNavigate();
  const org = orgSettings || {};

  // ─── Local state ─────────────────────────────────────────────────────────
  const [orgName,  setOrgName]  = useState(org.orgName || "");
  const [email,    setEmail]    = useState(org.email || "");
  const [phone,    setPhone]    = useState(formatPhoneNumber(org.phone || ""));
  const [website,  setWebsite]  = useState(org.website || "");
  const [street,   setStreet]   = useState(org.street || "");
  const [city,     setCity]     = useState(org.city || "");
  const [postcode, setPostcode] = useState(org.postcode || "");
  const [country,  setCountry]  = useState(org.country || "United Kingdom");
  const [currency, setCurrency] = useState(normalizeCurrencyCode(org.currency || "GBP"));
  const [timezone, setTimezone] = useState(org.timezone || "(UTC+00:00) London");
  const [industry, setIndustry] = useState(org.industry || "");
  const [crn,      setCrn]      = useState(org.crn || "");
  const [saved,    setSaved]    = useState(false);
  const [saveError, setSaveError] = useState("");

  // ─── Sync from orgSettings when it changes externally ────────────────────
  useEffect(() => {
    if (!orgSettings) return;
    setOrgName(org.orgName || "");
    setEmail(org.email || "");
    setPhone(formatPhoneNumber(org.phone || ""));
    setWebsite(org.website || "");
    setStreet(org.street || "");
    setCity(org.city || "");
    setPostcode(org.postcode || "");
    setCountry(org.country || "United Kingdom");
    setCurrency(normalizeCurrencyCode(org.currency || "GBP"));
    setTimezone(org.timezone || "(UTC+00:00) London");
    setIndustry(org.industry || "");
    setCrn(org.crn || "");
  }, [orgSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const crnError = crn && !validateUkCrn(crn)
    ? "CRN must be 8 digits or 2 letters followed by 6 digits (e.g. 12345678, SC123456)."
    : "";

  // ─── Save handler ────────────────────────────────────────────────────────
  const handleSave = () => {
    if (crn && !validateUkCrn(crn)) {
      setSaveError("Please enter a valid UK CRN (8 digits or 2 letters + 6 digits).");
      return;
    }
    setSaveError("");
    try {
      onSave({
        orgName,
        email,
        phone: stripPhoneForStorage(phone),
        website,
        street,
        city,
        postcode,
        country,
        currency: normalizeCurrencyCode(currency),
        timezone,
        industry,
        crn,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <Section title="Organisation Details">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="Company / Trading Name" required>
            <Input value={orgName} onChange={setOrgName} placeholder="Your Company Ltd" />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={setEmail} type="email" placeholder="hello@company.com" />
          </Field>
          <Field label="Phone">
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onBlur={() => setPhone(formatPhoneNumber(phone))}
              placeholder="+44 …"
              style={{ width:"100%", padding:"9px 11px", border:"1px solid #e8e8ec", borderRadius:5, fontSize:15, fontFamily:ff, color:"#1A1A1A", background:"#fff", outline:"none", boxSizing:"border-box", transition:"border 0.15s" }}
              onFocus={e => e.target.style.borderColor = "#1e6be0"}
            />
          </Field>
          <Field label="Website">
            <Input value={website} onChange={setWebsite} placeholder="https://…" />
          </Field>
          <Field label="Street Address">
            <Input value={street} onChange={setStreet} />
          </Field>
          <Field label="City / Town">
            <Input value={city} onChange={setCity} />
          </Field>
          <Field label="Postcode">
            <Input value={postcode} onChange={setPostcode} />
          </Field>
          <Field label="Country">
            <Select value={country} onChange={setCountry} options={COUNTRIES} />
          </Field>
          <Field label="Currency">
            <Select
              value={currency}
              onChange={setCurrency}
              options={CURRENCIES_LIST.map(c => ({ value: normalizeCurrencyCode(c), label: c }))}
            />
          </Field>
          <Field label="Timezone">
            <Select value={timezone} onChange={setTimezone} options={TIMEZONES} />
          </Field>
          <Field label="Industry">
            <Select value={industry} onChange={setIndustry} options={["", ...INDUSTRIES]} />
          </Field>
          <Field label="Company Reg No (CRN)" hint="Format: 12345678 or SC123456" error={crnError}>
            <Input value={crn} onChange={v => setCrn(v.toUpperCase())} placeholder="Optional" error={!!crnError} />
          </Field>
          <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid #f0f0f4" }}>
            <div style={{ fontSize:13, color:"#64748B", marginBottom:8 }}>Want to go through the setup wizard again?</div>
            <Btn variant="outline" onClick={() => {
              localStorage.removeItem("ai_invoice_onboarding_done");
              navigate(ROUTES.ONBOARDING, { replace: true });
            }}>
              Restart onboarding
            </Btn>
          </div>
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
              <Icons.Check /> Organisation details saved.
            </div>
          )}
          <Btn onClick={handleSave} variant="primary" icon={<Icons.Save />} style={{ background: saved ? "#059669" : "#1e6be0", color:"#fff" }}>
            Save organisation settings
          </Btn>
        </div>
      </div>
    </>
  );
}
