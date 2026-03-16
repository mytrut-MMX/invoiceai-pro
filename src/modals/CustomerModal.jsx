import { useContext, useMemo, useState } from "react";
import { ff, SALUTATIONS, CUR_SYM, CIS_RATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Toggle, Switch, Textarea, Btn, AddressForm, PaymentTermsField, InfoBox } from "../components/atoms";
import { formatPhoneNumber } from "../utils/helpers";

const TABS = ["Other Details", "Address", "Contact Persons", "Remarks"];

const validateVatNumber = (rawVat) => {
  const vat = String(rawVat || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!vat) return null;
  if (/^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/.test(vat)) return true;
  if (/^[A-Z]{2}[A-Z0-9]{8,12}$/.test(vat)) return true;
  return false;
};

export default function CustomerForm({ existing, onClose, onSave }) {
  const { orgSettings } = useContext(AppCtx);
  const isEdit = !!existing;
  const isOrgVatRegistered = orgSettings?.vatReg === "Yes";
  const isOrgCisRegistered = orgSettings?.cisReg === "Yes";
  const ea = { street: "", city: "", county: "", postcode: "", country: "United Kingdom" };

  const [activeTab, setActiveTab] = useState("Other Details");
  const [custType, setCustType] = useState(existing?.type || "Business");
  const [salutation, setSalutation] = useState(existing?.salutation || "");
  const [firstName, setFirstName] = useState(existing?.firstName || "");
  const [lastName, setLastName] = useState(existing?.lastName || "");
  const [companyName, setCompanyName] = useState(existing?.companyName || "");
  const [displayName, setDisplayName] = useState(existing?.name || "");
  const [currency, setCurrency] = useState(existing?.currency || "GBP");
  const [email, setEmail] = useState(existing?.email || "");
  const [workPhone, setWorkPhone] = useState(existing?.phone || "");
  const [mobile, setMobile] = useState(existing?.mobile || "");
  const [website, setWebsite] = useState(existing?.website || "");
  const [paymentTerms, setPaymentTerms] = useState(existing?.paymentTerms || "Net 30");
  const [customDays, setCustomDays] = useState(existing?.customPaymentDays || "");
  const [billing, setBilling] = useState(existing?.billingAddress || { ...ea });
  const [sameAddr, setSameAddr] = useState(!existing?.shippingAddress);
  const [shippingAddr, setShippingAddr] = useState(existing?.shippingAddress || { ...ea });
  const [contacts, setContacts] = useState(existing?.contactPersons || []);
  const [remarks, setRemarks] = useState(existing?.remarks || "");
  const [customerVatRegistered, setCustomerVatRegistered] = useState(Boolean(existing?.taxDetails?.vatNumber));
  const [vatNumber, setVatNumber] = useState(existing?.taxDetails?.vatNumber || "");
  const [utr, setUtr] = useState(existing?.taxDetails?.utr || "");
  const [cifRegistered, setCifRegistered] = useState(existing?.taxDetails?.cisRegistered || false);
  const [cisRole, setCisRole] = useState(existing?.taxDetails?.cisRole || "");
  const existingCisRate = String(existing?.taxDetails?.cisRate || "20%");
  const existingFlatRateMatch = existingCisRate.match(/(\d+(?:\.\d+)?)/);
  const [cisDeductRate, setCisDeductRate] = useState(existingCisRate.toLowerCase().includes("flat rate") ? "Flat rate" : existingCisRate);
  const [cisFlatRate, setCisFlatRate] = useState(existingFlatRateMatch ? existingFlatRateMatch[1] : "");

  const addContact = () => setContacts(p => [...p, { id: crypto.randomUUID(), salutation: "", firstName: "", lastName: "", email: "", phone: "", jobTitle: "", department: "", isPrimary: false }]);
  const updContact = (id, f, v) => setContacts(p => p.map(c => (c.id === id ? { ...c, [f]: v } : c)));
  const delContact = id => setContacts(p => p.filter(c => c.id !== id));

  const isFlatRateSelected = cisDeductRate === "Flat rate";
  const vatValidation = useMemo(() => validateVatNumber(vatNumber), [vatNumber]);

  const handleSave = () => {
    onSave({
      id: existing?.id || crypto.randomUUID(),
      type: custType,
      salutation,
      firstName,
      lastName,
      companyName,
      name: displayName || `${firstName} ${lastName}`.trim() || companyName,
      currency,
      email,
      phone: formatPhoneNumber(workPhone),
      mobile: formatPhoneNumber(mobile),
      website,
      paymentTerms,
      customPaymentDays: customDays,
      billingAddress: billing,
      shippingAddress: sameAddr ? null : shippingAddr,
      contactPersons: contacts,
      remarks,
      taxDetails: {
        vatNumber: isOrgVatRegistered && customerVatRegistered ? vatNumber : "",
        utr: isOrgCisRegistered && cifRegistered ? utr : "",
        cisRegistered: isOrgCisRegistered ? cifRegistered : false,
        cisRole: isOrgCisRegistered && cifRegistered ? cisRole : "",
        cisRate: isOrgCisRegistered && cifRegistered
          ? (isFlatRateSelected && cisFlatRate ? `Flat rate (${cisFlatRate}%)` : cisDeductRate)
          : "",
      },
    });
    onClose();
  };

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", fontFamily: ff }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 0 40px" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #e8e8ec", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
           <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontFamily: ff, display: "flex", alignItems: "center", gap: 4 }}>
              ← Customers
            </button>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
              {isEdit ? existing.name : "New Customer"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={onClose} variant="outline">Cancel</Btn>
            <Btn onClick={handleSave} variant="primary" disabled={!displayName && !companyName && !firstName}>Save Customer</Btn>
          </div>
        </div>

          <div style={{
          background: "#fff",
          borderBottom: "1px solid #e8e8ec",
          padding: "0 24px",
          display: "flex", gap: 0
        }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "12px 18px 10px",
                fontSize: 13, fontWeight: activeTab === t ? 600 : 400,
                color: activeTab === t ? "#1e6be0" : "#6b7280",
                borderBottom: activeTab === t ? "2px solid #1e6be0" : "2px solid transparent",
                fontFamily: "inherit", transition: "all 0.15s",
                marginBottom: "-1px"
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", padding: "18px 22px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>Basic Info</div>

            <Field label="Customer Type">
              <Toggle value={custType} onChange={setCustType} options={["Business", "Individual"]} />
            </Field>
            
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 10 }}>
              <Field label="Salutation"><Select value={salutation} onChange={setSalutation} options={SALUTATIONS} placeholder="—" /></Field>
              <Field label="First Name"><Input value={firstName} onChange={setFirstName} placeholder="John" /></Field>
              <Field label="Last Name"><Input value={lastName} onChange={setLastName} placeholder="Doe" /></Field>
            </div>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Company Name"><Input value={companyName} onChange={setCompanyName} placeholder="Company Ltd" /></Field>
              <Field label="Display Name"><Input value={displayName} onChange={setDisplayName} placeholder="Shown on invoices" /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Email"><Input value={email} onChange={setEmail} type="email" placeholder="billing@company.com" /></Field>
              <Field label="Work Phone"><Input value={workPhone} onChange={v => setWorkPhone(formatPhoneNumber(v))} placeholder="+44..." /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Mobile"><Input value={mobile} onChange={v => setMobile(formatPhoneNumber(v))} placeholder="+44..." /></Field>
              <Field label="Website"><Input value={website} onChange={setWebsite} placeholder="https://..." /></Field>
            </div>
            </div>

              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", padding: "18px 22px" }}>
            {activeTab === "Other Details" && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>Other Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Currency">
                    <Select value={currency} onChange={setCurrency} options={Object.keys(CUR_SYM)} />
                  </Field>
                  <Field label="Payment Terms">
                    <PaymentTermsField value={paymentTerms} onChange={setPaymentTerms} customDays={customDays} onCustomDaysChange={setCustomDays} />
                  </Field>
                </div>
                
               {isOrgVatRegistered && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #EBEBEB", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>VAT Registered</div>
                      </div>
                      <Switch checked={customerVatRegistered} onChange={setCustomerVatRegistered} />
                    </div>
                    {customerVatRegistered && (
                      <Field label="VAT Number" hint="GB + 9 digits (or EU format)">
                        <div style={{ position: "relative" }}>
                          <Input value={vatNumber} onChange={setVatNumber} placeholder="GB123456789" style={{ paddingRight: 34 }} />
                          {vatValidation !== null && (
                            <div style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", color: vatValidation ? "#16A34A" : "#DC2626", display: "flex" }}>
                              {vatValidation ? <Icons.Check /> : <Icons.X />}
                            </div>
                          )}
                        </div>
                      </Field>
                    )}
                  </>
                )}
              
            {isOrgCisRegistered && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #EBEBEB", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>CIS Registered</div>
                        <div style={{ fontSize: 11, color: "#AAA", marginTop: 1 }}>Construction Industry Scheme</div>
                      </div>
                      <Switch checked={cifRegistered} onChange={setCifRegistered} />
                    </div>
                    {cifRegistered && (
                      <div style={{ background: "#F9F9F9", borderRadius: 8, padding: "12px 14px", border: "1px solid #EBEBEB" }}>
                        <Field label="UTR Number" hint="Unique Taxpayer Reference"><Input value={utr} onChange={setUtr} placeholder="1234567890" /></Field>
                        <Field label="CIS Role"><Select value={cisRole} onChange={setCisRole} options={["Contractor", "Subcontractor", "Both"]} placeholder="Select role…" /></Field>
                        {(cisRole === "Subcontractor" || cisRole === "Both") && (
                          <>
                            <Field label="CIS Deduction Rate"><Select value={cisDeductRate} onChange={setCisDeductRate} options={CIS_RATES} /></Field>
                            {isFlatRateSelected && <Field label="Flat Rate %"><Input value={cisFlatRate} onChange={setCisFlatRate} type="number" placeholder="e.g. 12" /></Field>}
                          </>
                        )}
                        <InfoBox>CIS deduction will be applied automatically on invoices raised for this customer.</InfoBox>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          
            {activeTab === "Address" && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>Address</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 10 }}>BILLING ADDRESS</div>
                    <AddressForm address={billing} onChange={setBilling} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>SHIPPING ADDRESS</div>
                      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
                        <Switch checked={sameAddr} onChange={setSameAddr} /> Same as billing
                      </label>
                    </div>
                    {sameAddr ? (
                      <InfoBox>Shipping address will follow billing address.</InfoBox>
                    ) : (
                      <AddressForm address={shippingAddr} onChange={setShippingAddr} />
                    )}
                  </div>
                </div>
              </div>
            )}
            
           {activeTab === "Contact Persons" && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>Contact Persons</div>
                {contacts.map((cp) => (
                  <div key={cp.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 1fr auto", gap: 10, marginBottom: 10 }}>
                    <Field label="Title"><Select value={cp.salutation} onChange={v => updContact(cp.id, "salutation", v)} options={SALUTATIONS} placeholder="—" /></Field>
                    <Field label="First Name"><Input value={cp.firstName} onChange={v => updContact(cp.id, "firstName", v)} /></Field>
                    <Field label="Last Name"><Input value={cp.lastName} onChange={v => updContact(cp.id, "lastName", v)} /></Field>
                    <Field label="Email"><Input value={cp.email} onChange={v => updContact(cp.id, "email", v)} /></Field>
                    <button onClick={() => delContact(cp.id)} style={{ alignSelf: "flex-end", marginBottom: 4, background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 16 }}>✕</button>
                  </div>
                ))}
                <button onClick={addContact} style={{ background: "none", border: "none", cursor: "pointer", color: "#1e6be0", fontSize: 13, fontFamily: "inherit", marginTop: 4 }}>
                  + Add Contact Person
                </button>
              </div>
            )}

            {activeTab === "Remarks" && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>Remarks</div>
                <Field label="Notes">
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
