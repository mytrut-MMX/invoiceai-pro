import { useState } from "react";
import {
  CUR_SYM,
  PAYMENT_TERMS_OPTS,
  SUPPLIER_TYPES,
  CIS_RATES_SUPPLIER,
  CIS_TRADER_TYPES,
} from "../../constants";
import { Field, Input, Select, Textarea, Btn } from "../atoms";
import { formatPhoneNumber, stripPhoneForStorage } from "../../utils/helpers";

const TABS = ["Details", "Tax & Registration", "CIS", "Address", "Remarks"];
const CURRENCIES = Object.keys(CUR_SYM);
const PAYMENT_TERMS = PAYMENT_TERMS_OPTS.filter((t) => t !== "Custom");

const dateInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

const textInputCls = dateInputCls;

export default function SupplierFormPanel({ existing, onClose, onSave, suppliers = [] }) {
  const [activeTab, setActiveTab] = useState("Details");
  const [saved, setSaved] = useState(false);

  const [type, setType] = useState(existing?.type || "Business");
  const [salutation, setSalutation] = useState(existing?.salutation || "");
  const [firstName, setFirstName] = useState(existing?.firstName || "");
  const [lastName, setLastName] = useState(existing?.lastName || "");
  const [company, setCompany] = useState(existing?.legal_name || "");
  const [displayName, setDisplayName] = useState(existing?.name || "");
  const [email, setEmail] = useState(existing?.email || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [website, setWebsite] = useState(existing?.website || "");
  const [currency, setCurrency] = useState(existing?.currency || "GBP");
  const [paymentTerms, setPaymentTerms] = useState(existing?.payment_terms || "Net 30");

  const [companyNumber, setCompanyNumber] = useState(existing?.company_number || "");
  const [utr, setUtr] = useState(existing?.utr || "");
  const [vatNumber, setVatNumber] = useState(existing?.vat_number || "");
  const [isVatRegistered, setIsVatRegistered] = useState(existing?.is_vat_registered || false);
  const [defaultReverseCharge, setDefaultReverseCharge] = useState(existing?.default_reverse_charge || false);

  const [isCis, setIsCis] = useState(existing?.cis?.is_subcontractor || false);
  const [cisRate, setCisRate] = useState(existing?.cis?.rate || "standard_20");
  const [cisTraderType, setCisTraderType] = useState(existing?.cis?.trader_type || "sole_trader");
  const [cisVerificationNumber, setCisVerificationNumber] = useState(existing?.cis?.verification_number || "");
  const [cisVerificationDate, setCisVerificationDate] = useState(existing?.cis?.verification_date || "");
  const [cisLabourOnly, setCisLabourOnly] = useState(existing?.cis?.labour_only || false);

  const addr = existing?.billingAddress || {};
  const [billStreet1, setBillStreet1] = useState(addr.street1 || "");
  const [billStreet2, setBillStreet2] = useState(addr.street2 || "");
  const [billCity, setBillCity] = useState(addr.city || "");
  const [billState, setBillState] = useState(addr.state || "");
  const [billZip, setBillZip] = useState(addr.zip || "");
  const [billCountry, setBillCountry] = useState(addr.country || "");

  const [notes, setNotes] = useState(existing?.notes || "");

  const handleSave = () => {
    const name = displayName.trim() || `${firstName} ${lastName}`.trim() || company.trim();
    if (!name) return alert("Please enter a supplier name.");

    const supplier = {
      id: existing?.id, name,
      legal_name: company || null,
      trading_name: null,
      type,
      email: email.trim() || null,
      phone: stripPhoneForStorage(phone) || null,
      website: website.trim() || null,
      billingAddress: { street1: billStreet1, street2: billStreet2, city: billCity, state: billState, zip: billZip, country: billCountry },
      company_number: companyNumber.trim() || null,
      utr: utr.trim() || null,
      vat_number: vatNumber.trim() || null,
      is_vat_registered: isVatRegistered,
      cis: {
        is_subcontractor: isCis,
        rate: isCis ? cisRate : null,
        trader_type: isCis ? cisTraderType : null,
        verification_number: isCis ? (cisVerificationNumber.trim() || null) : null,
        verification_date: isCis ? (cisVerificationDate || null) : null,
        labour_only: isCis ? cisLabourOnly : false,
      },
      self_billing: existing?.self_billing || { enabled: false },
      default_reverse_charge: defaultReverseCharge,
      payment_terms: paymentTerms,
      currency,
      notes: notes.trim() || null,
      is_active: existing?.is_active !== false,
    };

    setSaved(true);
    setTimeout(() => onSave(supplier), 400);
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
        >
          ← Suppliers
        </button>
        <div className="flex gap-2">
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={saved}>
            {saved ? "Saved ✓" : existing ? "Save changes" : "Save supplier"}
          </Btn>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-5">
        {/* Primary details card */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 mb-4">
          <div className="flex gap-5 mb-4 flex-wrap">
            {SUPPLIER_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm text-[var(--text-secondary)]">
                <input
                  type="radio"
                  name="supType"
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="accent-[var(--brand-600)]"
                />
                {t}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <Field label="Salutation">
              <Select value={salutation} onChange={setSalutation} options={["Mr", "Mrs", "Ms", "Dr", "Prof", "Mx", "Rev"]} placeholder="— Select —" />
            </Field>
            <Field label="First Name">
              <Input value={firstName} onChange={setFirstName} placeholder="First name" />
            </Field>
            <Field label="Last Name">
              <Input value={lastName} onChange={setLastName} placeholder="Last name" />
            </Field>
          </div>

          {type === "Business" && (
            <div className="mb-3">
              <Field label="Legal / Company Name">
                <Input value={company} onChange={setCompany} placeholder="Registered company name" />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Field label="Supplier Display Name">
              <Input value={displayName} onChange={setDisplayName} placeholder="How this supplier appears in lists" />
              {displayName && suppliers.some(s => s.id !== existing?.id && s.name?.toLowerCase() === displayName.toLowerCase()) && (
                <div className="text-[11px] text-[var(--warning-700)] mt-1">⚠ A supplier with this name already exists</div>
              )}
            </Field>
            <Field label="Email">
              <Input value={email} onChange={setEmail} type="email" />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <Input value={website} onChange={setWebsite} placeholder="https://" />
            </Field>
          </div>
        </div>

        {/* Tabs card */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden mb-10">
          <div className="flex border-b border-[var(--border-subtle)] px-1 overflow-x-auto">
            {TABS.map(t => {
              const active = activeTab === t;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={[
                    "py-3 px-4 text-sm cursor-pointer bg-transparent border-none -mb-px whitespace-nowrap transition-colors duration-150",
                    active
                      ? "text-[var(--brand-600)] font-semibold border-b-2 border-[var(--brand-600)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border-b-2 border-transparent",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {activeTab === "Details" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Currency">
                  <Select value={currency} onChange={setCurrency} options={CURRENCIES} />
                </Field>
                <Field label="Default Payment Terms">
                  <Select value={paymentTerms} onChange={setPaymentTerms} options={PAYMENT_TERMS} />
                </Field>
              </div>
            )}

            {activeTab === "Tax & Registration" && (
              <div className="flex flex-col gap-3">
                {type === "Business" && (
                  <Field label="Company Registration Number (Companies House)">
                    <Input value={companyNumber} onChange={setCompanyNumber} placeholder="e.g. 12345678" />
                  </Field>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="UTR (Unique Taxpayer Reference)">
                    <Input value={utr} onChange={setUtr} placeholder="10-digit UTR" />
                  </Field>
                  <Field label="VAT Number">
                    <Input value={vatNumber} onChange={setVatNumber} placeholder="GB123456789" />
                  </Field>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={isVatRegistered}
                    onChange={e => setIsVatRegistered(e.target.checked)}
                    className="accent-[var(--brand-600)]"
                  />
                  VAT Registered
                </label>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={defaultReverseCharge}
                      onChange={e => setDefaultReverseCharge(e.target.checked)}
                      className="accent-[var(--brand-600)]"
                    />
                    Default to Reverse Charge on bills
                  </label>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-1 ml-6">
                    Enable for VAT-registered suppliers providing CIS-qualifying construction services (applies from 1 Mar 2021).
                  </div>
                </div>
              </div>
            )}

            {activeTab === "CIS" && (
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={isCis}
                    onChange={e => setIsCis(e.target.checked)}
                    className="accent-[var(--brand-600)]"
                  />
                  This supplier is a CIS subcontractor
                </label>

                {isCis && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="CIS Rate">
                        <Select
                          value={cisRate}
                          onChange={setCisRate}
                          options={CIS_RATES_SUPPLIER.map(r => ({ value: r.value, label: r.label }))}
                        />
                      </Field>
                      <Field label="Trader Type">
                        <Select
                          value={cisTraderType}
                          onChange={setCisTraderType}
                          options={CIS_TRADER_TYPES.map(t => ({ value: t.value, label: t.label }))}
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Verification Number">
                        <Input value={cisVerificationNumber} onChange={setCisVerificationNumber} placeholder="V1234567890" />
                      </Field>
                      <Field label="Verification Date">
                        <input
                          type="date"
                          value={cisVerificationDate}
                          onChange={e => setCisVerificationDate(e.target.value)}
                          className={dateInputCls}
                        />
                      </Field>
                    </div>
                    {cisVerificationDate && (() => {
                      const d = new Date(cisVerificationDate);
                      const twoYearsAgo = new Date();
                      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
                      return d < twoYearsAgo ? (
                        <div className="text-xs text-[var(--warning-700)] bg-[var(--warning-50)] border border-[var(--warning-100)] rounded-[var(--radius-md)] px-3 py-2">
                          ⚠ HMRC recommends re-verifying subcontractors not paid in the past 2 tax years.
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={cisLabourOnly}
                          onChange={e => setCisLabourOnly(e.target.checked)}
                          className="accent-[var(--brand-600)]"
                        />
                        Labour only (no materials on invoices)
                      </label>
                      <div className="text-[11px] text-[var(--text-tertiary)] mt-1 ml-6">
                        When enabled, 100% of bills from this supplier are treated as labour for CIS deduction.
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "Address" && (
              <div>
                <div className="text-xs font-semibold text-[var(--text-tertiary)] tracking-wider mb-3 uppercase">
                  Billing address
                </div>
                <div className="flex flex-col gap-2.5">
                  <Field label="Street 1"><Input value={billStreet1} onChange={setBillStreet1} /></Field>
                  <Field label="Street 2"><Input value={billStreet2} onChange={setBillStreet2} /></Field>
                  <Field label="City"><Input value={billCity} onChange={setBillCity} /></Field>
                  <Field label="State / County"><Input value={billState} onChange={setBillState} /></Field>
                  <Field label="Postal / ZIP Code"><Input value={billZip} onChange={setBillZip} /></Field>
                  <Field label="Country"><Input value={billCountry} onChange={setBillCountry} /></Field>
                </div>
              </div>
            )}

            {activeTab === "Remarks" && (
              <Field label={<>Remarks <span className="text-[var(--text-tertiary)] font-normal">(Internal notes)</span></>}>
                <Textarea value={notes} onChange={setNotes} rows={4} placeholder="Any notes about this supplier..." />
              </Field>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
