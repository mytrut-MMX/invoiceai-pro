import { useState } from "react";
import { ff, CUR_SYM, PAYMENT_TERMS_OPTS } from "../constants";
import { Field, Input, Select, Textarea, Btn } from "../components/atoms";
import { useCISSettings } from "../hooks/useCISSettings";

const TABS = ["Other Details", "Address", "Contact Persons", "Custom Fields", "Remarks"];
const CURRENCIES = Object.keys(CUR_SYM);
const PAYMENT_TERMS = PAYMENT_TERMS_OPTS.filter((term) => term !== "Custom");
const CIS_RATES = [
  { label: "20% — Standard", value: 20 },
  { label: "30% — Higher (unverified)", value: 30 },
  { label: "0% — Gross payment", value: 0 },
];

export default function CustomerForm({ existing, onClose, onSave, settings, customers = [] }) {
  const [activeTab, setActiveTab] = useState("Other Details");
  const [saved, setSaved] = useState(false);
  const { cisEnabled } = useCISSettings();
  const [custType, setCustType] = useState("Business");
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState(existing?.firstName || "");
  const [lastName, setLastName] = useState(existing?.lastName || "");
  const [displayName, setDisplayName] = useState(existing?.name || "");
  const [email, setEmail] = useState(existing?.email || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [website, setWebsite] = useState(existing?.website || "");
  const [company, setCompany] = useState(existing?.company || "");
  const [currency, setCurrency] = useState(existing?.currency || "GBP");
  const [paymentTerms, setPaymentTerms] = useState(existing?.paymentTerms || "Due on Receipt");
  const [billStreet1, setBillStreet1] = useState(existing?.billingAddress?.street1 || "");
  const [billStreet2, setBillStreet2] = useState(existing?.billingAddress?.street2 || "");
  const [billCity, setBillCity] = useState(existing?.billingAddress?.city || "");
  const [billState, setBillState] = useState(existing?.billingAddress?.state || "");
  const [billZip, setBillZip] = useState(existing?.billingAddress?.zip || "");
  const [billCountry, setBillCountry] = useState(existing?.billingAddress?.country || "");
  const [shipStreet1, setShipStreet1] = useState("");
  const [shipStreet2, setShipStreet2] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipZip, setShipZip] = useState("");
  const [shipCountry, setShipCountry] = useState("");
  const [contactPersons, setContactPersons] = useState(
    existing?.contactPersons || [{ salutation: "", firstName: "", lastName: "", email: "", phone: "", mobile: "" }],
  );
  const [remarks, setRemarks] = useState(existing?.notes || "");
  const [cisRegistered, setCisRegistered] = useState(existing?.cis?.registered ?? false);
  const [cisUtr, setCisUtr] = useState(existing?.cis?.utr || "");
  const [cisRate, setCisRate] = useState(existing?.cis?.rate || CIS_RATES[0].label);
  const [cisVerification, setCisVerification] = useState(existing?.cis?.verification || "Net");
  const [cisBusinessType, setCisBusinessType] = useState(existing?.cis?.businessType || "Subcontractor");
  
  const copyBillingToShipping = () => {
    setShipStreet1(billStreet1);
    setShipStreet2(billStreet2);
    setShipCity(billCity);
    setShipState(billState);
    setShipZip(billZip);
    setShipCountry(billCountry);
  };

  const handleSave = () => {
    const customer = {
      id: existing?.id || Date.now(),
      name: displayName || `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      company,
      email,
      phone,
      website,
      currency,
      paymentTerms,
      remarks,
      contactPersons,
      cis: {
        registered: cisRegistered,
        utr: cisUtr,
        rate: cisRate,
        rateValue: CIS_RATES.find((r) => r.label === cisRate)?.value ?? 0,
        verification: cisVerification,
        businessType: cisBusinessType,
      },
      billingAddress: {
        street1: billStreet1,
        street2: billStreet2,
        city: billCity,
        state: billState,
        zip: billZip,
        country: billCountry,
      },
    shippingAddress: {
        street1: shipStreet1,
        street2: shipStreet2,
        city: shipCity,
        state: shipState,
        zip: shipZip,
        country: shipCountry,
      },
    };
    setSaved(true);
    setTimeout(() => onSave(customer), 600);
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
            ← Customers
          </button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111110" }}>
            {existing ? existing.name || "Edit Customer" : "New Customer"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={saved}>
            {saved ? "Saved ✓" : existing ? "Save Changes" : "Save Customer"}
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
            {["Business", "Individual"].map((t) => (
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
                  name="custType"
                  checked={custType === t}
                  onChange={() => setCustType(t)}
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
                options={["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."]}
                placeholder="Select..."
              />
            </Field>
<Field label="First Name">
              <Input value={firstName} onChange={setFirstName} placeholder="First name" />
            </Field>
            <Field label="Last Name">
              <Input value={lastName} onChange={setLastName} placeholder="Last name" />
            </Field>
          </div>

          {custType === "Business" && (
            <div style={{ marginBottom: 14 }}>
              <Field label="Company Name">
                <Input value={company} onChange={setCompany} placeholder="Company name" />
              </Field>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <Field label="Customer Display Name">
              <Input value={displayName} onChange={setDisplayName} />
              {displayName && customers.some(c => c.id !== existing?.id && c.name?.toLowerCase() === displayName.toLowerCase()) && (
                <div style={{ fontSize:11, color:"#d97706", marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
                  ⚠ A customer with this name already exists
                </div>
              )}
            </Field>
            <Field label="Email">
              <Input value={email} onChange={setEmail} type="email" />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Phone">
              <Input value={phone} onChange={setPhone} />
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
            {activeTab === "Other Details" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Currency">
                    <Select value={currency} onChange={setCurrency} options={CURRENCIES || ["GBP", "USD", "EUR"]} />
                  </Field>
                  <Field label="Payment Terms">
                    <Select
                      value={paymentTerms}
                      onChange={setPaymentTerms}
                      options={PAYMENT_TERMS || ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"]}
                    />
                  </Field>
                </div>

                {cisEnabled && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="CIS Registered">
                      <Select
                        value={String(cisRegistered)}
                        onChange={(v) => setCisRegistered(v === "true")}
                        options={[
                          { value: "true", label: "Yes" },
                          { value: "false", label: "No" },
                        ]}
                      />
                    </Field>
                    <Field label="CIS UTR">
                      <Input value={cisUtr} onChange={setCisUtr} placeholder="1234567890" />
                    </Field>
                    <Field label="CIS Rate">
                      <Select value={cisRate} onChange={setCisRate} options={CIS_RATES.map((r) => r.label)} />
                    </Field>
                    <Field label="Verification">
                      <Select value={cisVerification} onChange={setCisVerification} options={["Net", "Gross", "Unverified"]} />
                    </Field>
                    <Field label="Business Type">
                      <Select value={cisBusinessType} onChange={setCisBusinessType} options={["Subcontractor", "Contractor", "Both"]} />
                    </Field>
                  </div>
                )}
              </div>
            )}
          
            {activeTab === "Address" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
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

                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#6b7280",
                      letterSpacing: "0.05em",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    SHIPPING ADDRESS
                    <button
                      onClick={copyBillingToShipping}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#D97706",
                        fontSize: 11,
                        fontFamily: "inherit",
                        fontWeight: 400,
                      }}
                    >
                      ↓ Copy billing
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Field label="Street 1">
                      <Input value={shipStreet1} onChange={setShipStreet1} />
                    </Field>
                    <Field label="Street 2">
                      <Input value={shipStreet2} onChange={setShipStreet2} />
                    </Field>
                    <Field label="City">
                      <Input value={shipCity} onChange={setShipCity} />
                    </Field>
                    <Field label="State / County">
                      <Input value={shipState} onChange={setShipState} />
                    </Field>
                    <Field label="Postal / ZIP Code">
                      <Input value={shipZip} onChange={setShipZip} />
                    </Field>
                    <Field label="Country">
                      <Input value={shipCountry} onChange={setShipCountry} />
                    </Field>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "Contact Persons" && (
              <div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F5F4F0" }}>
                      {["Salutation", "First Name", "Last Name", "Email", "Phone", "Mobile", ""].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 10px",
                            textAlign: "left",
                            fontWeight: 600,
                            color: "#6b7280",
                            fontSize: 12,
                            borderBottom: "1px solid #E8E6E0",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(contactPersons || [{ salutation: "", firstName: "", lastName: "", email: "", phone: "", mobile: "" }]).map(
                      (cp, i) => (
                        <tr key={i}>
                          {["salutation", "firstName", "lastName", "email", "phone", "mobile"].map((f) => (
                            <td key={f} style={{ padding: "6px 6px" }}>
                              <Input
                                value={cp[f] || ""}
                                onChange={(v) => {
                                  const arr = [...(contactPersons || [{}])];
                                  arr[i] = { ...arr[i], [f]: v };
                                  setContactPersons(arr);
                                }}
                              />
                            </td>
                          ))}
                          <td style={{ padding: "6px 4px" }}>
                            <button
                              onClick={() => {
                                const arr = [...(contactPersons || [])];
                                arr.splice(i, 1);
                                setContactPersons(arr);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#9ca3af",
                                fontSize: 16,
                                lineHeight: 1,
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
                <button
                  onClick={() =>
                    setContactPersons([
                      ...(contactPersons || []),
                      { salutation: "", firstName: "", lastName: "", email: "", phone: "", mobile: "" },
                    ])
                  }
                  style={{
                    marginTop: 12,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#D97706",
                    fontSize: 13,
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  ＋ Add Contact Person
                </button>
              </div>
            )}

            {activeTab === "Custom Fields" && (
              <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
                No custom fields configured for Customers.
              </div>
            )}

            {activeTab === "Remarks" && (
              <div>
                 <Field
                  label={
                    <>
                      Remarks <span style={{ color: "#9ca3af", fontWeight: 400 }}>(For Internal Use)</span>
                    </>
                  }
                >
                  <Textarea value={remarks} onChange={setRemarks} rows={4} placeholder="Any notes about this customer..." />
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
