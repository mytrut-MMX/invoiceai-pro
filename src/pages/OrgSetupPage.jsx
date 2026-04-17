import { useState, useCallback } from "react";
import { INDUSTRIES, COUNTRIES, CURRENCIES_LIST, TIMEZONES, UK_COUNTIES, CIS_RATES, normalizeCurrencyCode } from "../constants";
import { Icons } from "../components/icons";
import { Field, Input, Select, Toggle, SlideToggle, Checkbox, InfoBox, Btn } from "../components/atoms";
import { validateVatNumber, formatPhoneNumber, stripPhoneForStorage, validateUkCrn } from "../utils/helpers";
import InvoiceSagaLogo from "../components/InvoiceSagaLogo";

const phoneInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

export default function OrgSetupPage({ onComplete, initialData }) {
  const [bType, setBType] = useState(initialData?.bType || "");
  const [orgName, setOrgName] = useState(initialData?.orgName || "");
  const [crn, setCrn] = useState(initialData?.crn || "");
  const [industry, setIndustry] = useState(initialData?.industry || "");
  const [country, setCountry] = useState(initialData?.country || "United Kingdom");
  const [state, setState] = useState(initialData?.state || "");
  const [showAddr, setShowAddr] = useState(false);
  const [street, setStreet] = useState(initialData?.street || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [postcode, setPostcode] = useState(initialData?.postcode || "");
  const [currency, setCurrency] = useState(normalizeCurrencyCode(initialData?.currency) || "GBP");
  const [timezone, setTimezone] = useState(initialData?.timezone || "(UTC+00:00) London");
  const [accountingBasis, setAccountingBasis] = useState(initialData?.accountingBasis || "Accrual");
  const [vatReg, setVatReg] = useState(initialData?.vatReg === "Yes" || false);
  const [vatNum, setVatNum] = useState(initialData?.vatNum || "");
  const [vatNumTouched, setVatNumTouched] = useState(false);
  const [importExport, setImportExport] = useState(initialData?.importExport || false);
  const [vatScheme, setVatScheme] = useState(initialData?.vatScheme || "Standard");
  const [flatRate, setFlatRate] = useState(initialData?.flatRate || false);
  const [flatRatePct, setFlatRatePct] = useState(initialData?.flatRatePct || "");
  const [cisReg, setCisReg] = useState(initialData?.cisReg === "Yes" || false);
  const [cisContractor, setCisContractor] = useState(initialData?.cisContractor || false);
  const [cisSub, setCisSub] = useState(initialData?.cisSub || false);
  const [cisRate, setCisRate] = useState(initialData?.cisRate || "20%");
  const [cisUtr, setCisUtr] = useState(initialData?.cisUtr || "");
  const [cisRegistrationStatus, setCisRegistrationStatus] = useState(initialData?.cisRegistrationStatus || "Net");
  const [orgEmail, setOrgEmail] = useState(initialData?.email || "");
  const [orgPhone, setOrgPhone] = useState(initialData?.phone || "");
  const [deliversItems, setDeliversItems] = useState(initialData?.deliversItems !== false);

  const [lookupPostcode, setLookupPostcode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState(null);

  const handlePostcodeLookup = useCallback(async () => {
    const pc = lookupPostcode.trim().replace(/\s+/g, "");
    if (!pc) { setLookupError("Please enter a postcode."); return; }
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
      const json = await res.json();
      if (json.status === 200 && json.result) {
        const r = json.result;
        setLookupResult(r);
        setPostcode(r.postcode || pc);
        setCity(r.admin_district || r.parish || "");
        setState(r.admin_county || r.region || "");
      } else {
        setLookupError("No results found. Please check the postcode or enter your address manually.");
      }
    } catch {
      setLookupError("Lookup failed. Please enter your address manually.");
    } finally {
      setLookupLoading(false);
    }
  }, [lookupPostcode]);

  const stateOpts = country === "United Kingdom" ? UK_COUNTIES : [];
  const isCIS = industry === "Construction / Tradesperson";
  const vatNumError = vatReg && vatNumTouched && !validateVatNumber(vatNum)
    ? "Please enter a valid VAT number (e.g. GB123456789)" : null;
  const cisUtrValid = /^\d{10}$/.test(String(cisUtr || ""));
  const crnError = bType === "Limited Company" && crn && !validateUkCrn(crn)
    ? "CRN must be 8 digits or 2 letters followed by 6 digits."
    : null;
  const canSubmit = bType && orgName && industry && country
    && (!vatReg || (vatReg && validateVatNumber(vatNum))) && !crnError;

  const handleComplete = () => {
    if (!canSubmit) { setVatNumTouched(true); return; }
    onComplete({
      bType, orgName, crn, industry, country, state, street, city, postcode,
      currency: normalizeCurrencyCode(currency), timezone,
      email: orgEmail, phone: stripPhoneForStorage(orgPhone),
      deliversItems, accountingBasis,
      vatReg: vatReg ? "Yes" : "No", vatNum, vatScheme, importExport, flatRate, flatRatePct,
      cisReg: cisReg ? "Yes" : "No",
      cisContractor, cisSub, cisRate, cisUtr,
      cisUtrNo: cisUtr, cisRegistrationStatus,
      cis: { enabled: cisReg, contractorUTR: cisUtr, defaultRate: cisRate },
    });
  };

  return (
    <div className="min-h-screen bg-[var(--surface-sunken)] flex items-center justify-center p-4">
      <div className="w-full max-w-[640px]">
        <div className="flex justify-center mb-6">
          <InvoiceSagaLogo height={28} />
        </div>

        <div className="bg-[var(--surface-card)] rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden">
          <div className="bg-[var(--surface-sunken)] px-6 sm:px-8 py-5 border-b border-[var(--border-subtle)]">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0 mb-1">Organization setup</h1>
            <p className="text-sm text-[var(--text-secondary)] m-0">Enter your details to get started.</p>
          </div>

          <div className="px-6 sm:px-8 py-5 overflow-y-auto max-h-[75vh]">
            <Field label="Type of Business" required>
              <Toggle value={bType} onChange={setBType} options={["Sole Trader / Freelancer", "Limited Company"]} />
            </Field>

            <Field label="Organization Name" required>
              <Input value={orgName} onChange={setOrgName} placeholder="e.g. Bright Studio Ltd" />
            </Field>

            {bType === "Limited Company" && (
              <Field label="Company Registration Number (CRN)" hint="Format: 8 digits or 2 letters + 6 digits" error={crnError}>
                <Input value={crn} onChange={v => setCrn(v.toUpperCase())} placeholder="e.g. 12345678 or SC123456" error={!!crnError} />
              </Field>
            )}

            <Field label="Industry" required>
              <Select value={industry} onChange={setIndustry} options={INDUSTRIES} placeholder="Select an industry…" />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Email Address">
                <Input value={orgEmail} onChange={setOrgEmail} type="email" placeholder="invoices@company.com" />
              </Field>
              <Field label="Phone Number">
                <input
                  type="text"
                  value={orgPhone}
                  onChange={e => setOrgPhone(e.target.value)}
                  onBlur={() => setOrgPhone(formatPhoneNumber(orgPhone))}
                  placeholder="+44 20 7946 0000"
                  className={phoneInputCls}
                />
              </Field>
            </div>

            {/* Address toggle */}
            <Field label="">
              <button
                onClick={() => setShowAddr(!showAddr)}
                className="flex items-center gap-2 bg-transparent border border-dashed border-[var(--border-default)] rounded-[var(--radius-md)] px-3.5 py-2.5 cursor-pointer text-sm text-[var(--text-secondary)] w-full hover:border-[var(--border-strong)] transition-colors duration-150"
              >
                <span className="text-[var(--text-tertiary)] flex">
                  {showAddr ? <Icons.ChevDown /> : <Icons.ChevRight />}
                </span>
                <span className="font-semibold">Organisation address</span>
                {(country || street || city) && (
                  <span className="text-[11px] text-[var(--text-tertiary)] ml-auto truncate">
                    {[street, city, country].filter(Boolean).join(", ").slice(0, 40)}
                  </span>
                )}
              </button>
            </Field>

            {showAddr && (
              <div className="bg-[var(--surface-sunken)] rounded-[var(--radius-lg)] p-4 mb-3.5 border border-[var(--border-subtle)]">
                {country === "United Kingdom" && (
                  <Field label="Postcode Lookup">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input value={lookupPostcode} onChange={setLookupPostcode} placeholder="e.g. EC1A 1BB" />
                      </div>
                      <Btn onClick={handlePostcodeLookup} variant="outline" disabled={lookupLoading}>
                        {lookupLoading ? "Searching…" : "Find address"}
                      </Btn>
                    </div>
                    {lookupError && (
                      <div className="text-xs text-[var(--danger-600)] mt-1.5">{lookupError}</div>
                    )}
                    {lookupResult && (
                      <div className="text-xs text-[var(--success-700)] mt-1.5">Address found — fields updated below.</div>
                    )}
                  </Field>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Country" required>
                    <Select value={country} onChange={v => { setCountry(v); setState(""); }} options={COUNTRIES} />
                  </Field>
                  <Field label="State / County">
                    {stateOpts.length > 0
                      ? <Select value={state} onChange={setState} options={stateOpts} placeholder="Select…" />
                      : <Input value={state} onChange={setState} placeholder="Enter…" />}
                  </Field>
                </div>
                <Field label="Street Address">
                  <Input value={street} onChange={setStreet} placeholder="123 High Street" />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="City / Town">
                    <Input value={city} onChange={setCity} />
                  </Field>
                  <Field label="Postcode / ZIP">
                    <Input value={postcode} onChange={setPostcode} />
                  </Field>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Currency" required>
                <Select
                  value={currency}
                  onChange={setCurrency}
                  options={CURRENCIES_LIST.map(c => ({ value: normalizeCurrencyCode(c), label: c }))}
                />
              </Field>
              <Field label="Time Zone">
                <Select value={timezone} onChange={setTimezone} options={TIMEZONES} />
              </Field>
            </div>

            <div className="flex items-center justify-between px-3.5 py-3 bg-[var(--surface-sunken)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] mt-2 mb-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Do you deliver physical items?</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">If disabled, shipping fields stay optional and hidden by default.</div>
              </div>
              <SlideToggle value={deliversItems} onChange={setDeliversItems} />
            </div>

            {bType === "Sole Trader / Freelancer" && (
              <Field label="Accounting Basis" hint="Most sole traders use Cash Basis for simplicity">
                <Toggle value={accountingBasis} onChange={setAccountingBasis} options={["Accrual", "Cash"]} />
              </Field>
            )}

            {/* VAT */}
            <div className="flex items-center justify-between px-3.5 py-3 bg-[var(--surface-sunken)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] mb-1">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">VAT Registered</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Are you registered to charge VAT?</div>
              </div>
              <SlideToggle value={vatReg} onChange={v => { setVatReg(v); setVatNumTouched(false); }} />
            </div>

            {vatReg && (
              <div className="bg-[var(--surface-sunken)] rounded-[var(--radius-lg)] p-4 mb-3.5 border border-[var(--border-subtle)]">
                <Field label="VAT Registration Number" required error={vatNumError}>
                  <Input
                    value={vatNum}
                    onChange={v => { setVatNum(v); setVatNumTouched(true); }}
                    placeholder="GB123456789"
                    error={!!vatNumError}
                  />
                </Field>
                {vatNum && validateVatNumber(vatNum) && (
                  <div className="flex items-center gap-1.5 text-[var(--success-700)] text-xs font-semibold mb-2.5">
                    <Icons.Check /> VAT number format valid
                  </div>
                )}
                <Field label="VAT Scheme" hint="Determines when VAT is due to HMRC">
                  <Select
                    value={vatScheme}
                    onChange={v => { setVatScheme(v); if (v === "Flat Rate Scheme") setFlatRate(true); else setFlatRate(false); }}
                    options={["Standard", "Cash Accounting", "Flat Rate Scheme", "Annual Accounting"]}
                  />
                </Field>
                {vatScheme === "Flat Rate Scheme" && (
                  <Field label="Flat Rate %" hint="Your sector flat rate percentage">
                    <Input value={flatRatePct} onChange={setFlatRatePct} type="number" placeholder="e.g. 12.5" />
                  </Field>
                )}
                <Checkbox
                  checked={importExport}
                  onChange={setImportExport}
                  label="I import/export goods and services from other countries"
                />
              </div>
            )}

            {!vatReg && (
              <InfoBox color="var(--warning-600)">
                Items and invoices will not include VAT. You cannot legally charge VAT to customers until VAT registered.
              </InfoBox>
            )}

            {/* CIS */}
            {isCIS && (
              <>
                <div className="flex items-center justify-between px-3.5 py-3 bg-[var(--surface-sunken)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] mt-2 mb-1">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">CIS Registered</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Construction Industry Scheme</div>
                  </div>
                  <SlideToggle value={cisReg} onChange={v => setCisReg(v)} />
                </div>

                {cisReg && (
                  <div className="bg-[var(--surface-sunken)] rounded-[var(--radius-lg)] p-4 mb-3.5 border border-[var(--border-subtle)]">
                    <Field label="UTR Number" hint="Unique Taxpayer Reference — 10 digits">
                      <div className="relative">
                        <Input value={cisUtr} onChange={setCisUtr} placeholder="e.g. 1234567890" />
                        <span
                          className={`absolute right-2.5 top-1/2 -translate-y-1/2 flex ${cisUtrValid ? "text-[var(--success-600)]" : "text-[var(--danger-600)]"}`}
                        >
                          {cisUtrValid ? <Icons.Check /> : <Icons.X />}
                        </span>
                      </div>
                    </Field>
                    <Field label="CIS Registration Status">
                      <Select value={cisRegistrationStatus} onChange={setCisRegistrationStatus} options={["Net", "Gross"]} />
                    </Field>
                    <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider my-2.5">
                      CIS Role
                    </div>
                    <Checkbox checked={cisContractor} onChange={setCisContractor} label="Contractor (I engage subcontractors)" />
                    <Checkbox checked={cisSub} onChange={setCisSub} label="Subcontractor (I work for contractors)" />
                    {cisSub && cisRegistrationStatus !== "Gross" && (
                      <Field label="CIS Deduction Rate">
                        <Select value={cisRate} onChange={setCisRate} options={CIS_RATES} />
                      </Field>
                    )}
                    <InfoBox>CIS deduction will be shown on invoices and automatically deducted from the total due.</InfoBox>
                  </div>
                )}
              </>
            )}

            <button
              onClick={handleComplete}
              disabled={!canSubmit}
              className="w-full h-11 mt-4 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] disabled:bg-[var(--surface-sunken)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed text-white border-none rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150"
            >
              Complete setup →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
