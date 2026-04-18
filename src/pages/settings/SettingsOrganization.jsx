import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import {
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
import { useToast } from "../../components/ui/Toast";

const textInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

export default function SettingsOrganization({ orgSettings, onSave }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const org = orgSettings || {};

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

  const handleSave = () => {
    if (crn && !validateUkCrn(crn)) {
      setSaveError("Please enter a valid UK CRN (8 digits or 2 letters + 6 digits).");
      return;
    }
    setSaveError("");
    try {
      onSave({
        orgName, email, phone: stripPhoneForStorage(phone), website,
        street, city, postcode, country,
        currency: normalizeCurrencyCode(currency), timezone, industry, crn,
      });
      setSaved(true);
      toast({ title: "Organisation settings saved", variant: "success" });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
      toast({ title: "Failed to save settings", variant: "danger" });
    }
  };

  return (
    <>
      <Section title="Organisation details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
              className={textInputCls}
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
        </div>

        <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
          <div className="text-sm text-[var(--text-secondary)] mb-2">Want to go through the setup wizard again?</div>
          <Btn
            variant="outline"
            onClick={() => {
              localStorage.removeItem("ai_invoice_onboarding_done");
              navigate(ROUTES.ONBOARDING, { replace: true });
            }}
          >
            Restart onboarding
          </Btn>
        </div>
      </Section>

      <SaveFooter saved={saved} saveError={saveError} onSave={handleSave} label="Save organisation settings" />
    </>
  );
}

function SaveFooter({ saved, saveError, onSave, label }) {
  return (
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
        <Btn onClick={onSave} variant={saved ? "success" : "primary"} icon={<Icons.Save />}>
          {label}
        </Btn>
      </div>
    </div>
  );
}
