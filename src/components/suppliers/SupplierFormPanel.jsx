import { useState } from "react";
import {
  ff,
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

export default function SupplierFormPanel({ existing, onClose, onSave, suppliers = [] }) {
  const [activeTab, setActiveTab] = useState("Details");
  const [saved, setSaved] = useState(false);

  // Details tab
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

  // Tax & Registration tab
  const [companyNumber, setCompanyNumber] = useState(existing?.company_number || "");
  const [utr, setUtr] = useState(existing?.utr || "");
  const [vatNumber, setVatNumber] = useState(existing?.vat_number || "");
  const [isVatRegistered, setIsVatRegistered] = useState(existing?.is_vat_registered || false);
  const [defaultReverseCharge, setDefaultReverseCharge] = useState(existing?.default_reverse_charge || false);

  // CIS tab
  const [isCis, setIsCis] = useState(existing?.cis?.is_subcontractor || false);
  const [cisRate, setCisRate] = useState(existing?.cis?.rate || "standard_20");
  const [cisTraderType, setCisTraderType] = useState(existing?.cis?.trader_type || "sole_trader");
  const [cisVerificationNumber, setCisVerificationNumber] = useState(existing?.cis?.verification_number || "");
  const [cisVerificationDate, setCisVerificationDate] = useState(existing?.cis?.verification_date || "");
  const [cisLabourOnly, setCisLabourOnly] = useState(existing?.cis?.labour_only || false);

  // Address tab
  const addr = existing?.billingAddress || {};
  const [billStreet1, setBillStreet1] = useState(addr.street1 || "");
  const [billStreet2, setBillStreet2] = useState(addr.street2 || "");
  const [billCity, setBillCity] = useState(addr.city || "");
  const [billState, setBillState] = useState(addr.state || "");
  const [billZip, setBillZip] = useState(addr.zip || "");
  const [billCountry, setBillCountry] = useState(addr.country || "");

  // Remarks tab
  const [notes, setNotes] = useState(existing?.notes || "");

  const handleSave = () => {
    const name = displayName.trim() || `${firstName} ${lastName}`.trim() || company.trim();
    if (!name) return alert("Please enter a supplier name.");

    const supplier = {
      id: existing?.id,
      name,
      legal_name: company || null,
      trading_name: null,
      type,
      email: email.trim() || null,
      phone: stripPhoneForStorage(phone) || null,
      website: website.trim() || null,
      billingAddress: {
        street1: billStreet1,
        street2: billStreet2,
        city: billCity,
        state: billState,
        zip: billZip,
        country: billCountry,
      },
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
    <div style={{ background: "#FAFAF7", minHeight: "100vh", fontFamily: ff }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "1px solid #E8E6E0",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              fontSize: 13,
              fontFamily: ff,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: 0,
            }}
          >
            ← Suppliers
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={saved}>
            {saved ? "Saved ✓" : existing ? "Save Changes" : "Save Supplier"}
          </Btn>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px 0" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #E8E6E0",
            padding: "18px 22px",
            marginBottom: 0,
          }}
        >
          <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
            {SUPPLIER_TYPES.map((t) => (
              <label
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#374151",
                }}
              >
                <input
                  type="radio"
                  name="supType"
                  checked={type === t}
                  onChange={() => setType(t)}
                  style={{ accentColor: "#D97706" }}
                />
                {t}
              </label>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <Field label="Salutation">
              <Select
                value={salutation}
                onChange={setSalutation}
                options={["Mr", "Mrs", "Ms", "Dr", "Prof", "Mx", "Rev"]}
                placeholder="— Select —"
              />
            </Field>
            <Field label="First Name">
              <Input value={firstName} onChange={setFirstName} placeholder="First name" />
            </Field>
            <Field label="Last Name">
              <Input value={lastName} onChange={setLastName} placeholder="Last name" />
            </Field>
          </div>

          {type === "Business" && (
            <div style={{ marginBottom: 14 }}>
              <Field label="Legal / Company Name">
                <Input value={company} onChange={setCompany} placeholder="Registered company name" />
              </Field>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <Field label="Supplier Display Name">
              <Input value={displayName} onChange={setDisplayName} placeholder="How this supplier appears in lists" />
              {displayName && suppliers.some(s => s.id !== existing?.id && s.name?.toLowerCase() === displayName.toLowerCase()) && (
                <div style={{ fontSize: 11, color: "#d97706", marginTop: 4 }}>
                  ⚠ A supplier with this name already exists
                </div>
              )}
            </Field>
            <Field label="Email">
              <Input value={email} onChange={setEmail} type="email" />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Phone">
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onBlur={() => setPhone(formatPhoneNumber(phone))}
                placeholder="+44 …"
                style={{
                  width: "100%",
                  padding: "9px 11px",
                  border: "1px solid #e8e8ec",
                  borderRadius: 5,
                  fontSize: 15,
                  fontFamily: ff,
                  color: "#1A1A1A",
                  background: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </Field>
            <Field label="Website">
              <Input value={website} onChange={setWebsite} placeholder="https://" />
            </Field>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "16px auto 0", padding: "0 24px 40px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #E8E6E0",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", borderBottom: "1px solid #E8E6E0", padding: "0 4px" }}>
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "12px 16px 10px",
                  fontSize: 13,
                  fontWeight: activeTab === t ? 600 : 400,
                  color: activeTab === t ? "#D97706" : "#6b7280",
                  borderBottom: activeTab === t ? "2px solid #D97706" : "2px solid transparent",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  marginBottom: "-1px",
                  whiteSpace: "nowrap",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ padding: "20px 22px" }}>
            {activeTab === "Details" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Currency">
                  <Select value={currency} onChange={setCurrency} options={CURRENCIES} />
                </Field>
                <Field label="Default Payment Terms">
                  <Select value={paymentTerms} onChange={setPaymentTerms} options={PAYMENT_TERMS} />
                </Field>
              </div>
            )}

            {activeTab === "Tax & Registration" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {type === "Business" && (
                  <Field label="Company Registration Number (Companies House)">
                    <Input value={companyNumber} onChange={setCompanyNumber} placeholder="e.g. 12345678" />
                  </Field>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="UTR (Unique Taxpayer Reference)">
                    <Input value={utr} onChange={setUtr} placeholder="10-digit UTR" />
                  </Field>
                  <Field label="VAT Number">
                    <Input value={vatNumber} onChange={setVatNumber} placeholder="GB123456789" />
                  </Field>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
                  <input
                    type="checkbox"
                    checked={isVatRegistered}
                    onChange={e => setIsVatRegistered(e.target.checked)}
                    style={{ accentColor: "#D97706" }}
                  />
                  VAT Registered
                </label>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
                    <input
                      type="checkbox"
                      checked={defaultReverseCharge}
                      onChange={e => setDefaultReverseCharge(e.target.checked)}
                      style={{ accentColor: "#D97706" }}
                    />
                    Default to Reverse Charge on bills
                  </label>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, marginLeft: 22 }}>
                    Enable for VAT-registered suppliers providing CIS-qualifying construction services (applies from 1 Mar 2021).
                  </div>
                </div>
              </div>
            )}

            {activeTab === "CIS" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                  <input
                    type="checkbox"
                    checked={isCis}
                    onChange={e => setIsCis(e.target.checked)}
                    style={{ accentColor: "#D97706" }}
                  />
                  This supplier is a CIS subcontractor
                </label>

                {isCis && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <Field label="Verification Number">
                        <Input
                          value={cisVerificationNumber}
                          onChange={setCisVerificationNumber}
                          placeholder="V1234567890"
                        />
                      </Field>
                      <Field label="Verification Date">
                        <input
                          type="date"
                          value={cisVerificationDate}
                          onChange={e => setCisVerificationDate(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 11px",
                            border: "1px solid #e8e8ec",
                            borderRadius: 5,
                            fontSize: 15,
                            fontFamily: ff,
                            color: "#1A1A1A",
                            background: "#fff",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </Field>
                    </div>
                    {cisVerificationDate && (() => {
                      const d = new Date(cisVerificationDate);
                      const twoYearsAgo = new Date();
                      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
                      return d < twoYearsAgo ? (
                        <div style={{ fontSize: 12, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "8px 12px" }}>
                          ⚠ HMRC recommends re-verifying subcontractors not paid in the past 2 tax years.
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
                        <input
                          type="checkbox"
                          checked={cisLabourOnly}
                          onChange={e => setCisLabourOnly(e.target.checked)}
                          style={{ accentColor: "#D97706" }}
                        />
                        Labour only (no materials on invoices)
                      </label>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, marginLeft: 22 }}>
                        When enabled, 100% of bills from this supplier are treated as labour for CIS deduction.
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "Address" && (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6b7280",
                    letterSpacing: "0.05em",
                    marginBottom: 12,
                  }}
                >
                  BILLING ADDRESS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Field label="Street 1">
                    <Input value={billStreet1} onChange={setBillStreet1} />
                  </Field>
                  <Field label="Street 2">
                    <Input value={billStreet2} onChange={setBillStreet2} />
                  </Field>
                  <Field label="City">
                    <Input value={billCity} onChange={setBillCity} />
                  </Field>
                  <Field label="State / County">
                    <Input value={billState} onChange={setBillState} />
                  </Field>
                  <Field label="Postal / ZIP Code">
                    <Input value={billZip} onChange={setBillZip} />
                  </Field>
                  <Field label="Country">
                    <Input value={billCountry} onChange={setBillCountry} />
                  </Field>
                </div>
              </div>
            )}

            {activeTab === "Remarks" && (
              <Field
                label={
                  <>
                    Remarks <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Internal notes)</span>
                  </>
                }
              >
                <Textarea value={notes} onChange={setNotes} rows={4} placeholder="Any notes about this supplier..." />
              </Field>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
