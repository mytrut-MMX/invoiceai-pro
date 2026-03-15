import { useContext, useMemo, useState } from "react";
import { ff, SALUTATIONS, CUR_SYM, CIS_RATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Toggle, Switch, Textarea, Btn, AddressForm, PaymentTermsField, InfoBox } from "../components/atoms";
import { formatPhoneNumber } from "../utils/helpers";

const validateVatNumber = (rawVat) => {
  const vat = String(rawVat || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!vat) return null;
  if (/^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/.test(vat)) return true;
  if (/^[A-Z]{2}[A-Z0-9]{8,12}$/.test(vat)) return true;
  return false;
};

const sectionBaseStyle = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e8e8ec",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  marginBottom: 14,
};

function SectionCard({ title, children }) {
  return (
    <section style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", padding:"18px 22px" }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>{title}</div>
      {children}
    </section>
  );
}

export default function CustomerForm({ existing, onClose, onSave }) {
  const { orgSettings } = useContext(AppCtx);
  const isEdit = !!existing;
  const isOrgVatRegistered = orgSettings?.vatReg === "Yes";
  const ea = { street: "", city: "", county: "", postcode: "", country: "United Kingdom" };

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
        utr,
        cisRegistered: cifRegistered,
        cisRole,
        cisRate: isFlatRateSelected && cisFlatRate ? `Flat rate (${cisFlatRate}%)` : cisDeductRate,
      },
    });
      };

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", fontFamily: ff }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding:"0 0 40px" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #e8e8ec", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:13, fontFamily:ff, display:"flex", alignItems:"center", gap:4 }}>
              ← Customers
            </button>
            <span style={{ color:"#d1d5db" }}>/</span>
            <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>
              {isEdit ? existing.name : "New Customer"}
            </span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={onClose} variant="outline">Cancel</Btn>
            <Btn onClick={handleSave} variant="primary">
              {isEdit ? "Save Changes" : "Save Customer"}
            </Btn>
          </div>
        </div>

          <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          <SectionCard title="Basic Info"> 
            <Field label="Customer Type" required>
              <Toggle value={custType} onChange={setCustType} options={["Business", "Individual"]} />
            </Field>
            <div style={{ background: "#F9F9F9", borderRadius: 10, padding: "14px 14px 2px", marginBottom: 14, border: "1px solid #EBEBEB" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Primary Contact</div>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 10 }}>
                <Field label="Salutation"><Select value={salutation} onChange={setSalutation} options={SALUTATIONS} placeholder="—" /></Field>
                <Field label="First Name" required><Input value={firstName} onChange={setFirstName} placeholder="Jane" /></Field>
                <Field label="Last Name" required><Input value={lastName} onChange={setLastName} placeholder="Smith" /></Field>
              </div>
              </div>
            {custType === "Business" && <Field label="Company Name"><Input value={companyName} onChange={v => { setCompanyName(v); if (!displayName || displayName === companyName) setDisplayName(v); }} placeholder="Acme Corporation Ltd" /></Field>}
            <Field label="Display Name (on invoices)" required><Input value={displayName} onChange={setDisplayName} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Email" required><Input value={email} onChange={setEmail} type="email" placeholder="jane@example.com" /></Field>
              <Field label="Work Phone"><Input value={workPhone} onChange={v => setWorkPhone(formatPhoneNumber(v))} placeholder="+44 20 7946 0000" /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Mobile"><Input value={mobile} onChange={v => setMobile(formatPhoneNumber(v))} placeholder="+44 7700 900000" /></Field>
              <Field label="Website"><Input value={website} onChange={setWebsite} placeholder="https://example.com" /></Field>
            </div>
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 14, marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 12 }}>Other Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Currency"><Select value={currency} onChange={setCurrency} options={Object.keys(CUR_SYM).map(k => ({ value: k, label: `${k} (${CUR_SYM[k]})` }))} /></Field>
                <Field label="Payment Terms"><PaymentTermsField value={paymentTerms} onChange={setPaymentTerms} customDays={customDays} onCustomDaysChange={setCustomDays} /></Field>
                </div>
              </div>
          </SectionCard>

                  <SectionCard title="Address & Payment">
            <AddressForm address={billing} onChange={setBilling} label="Billing Address" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #EBEBEB", margin: "4px 0 14px" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Shipping same as billing</span>
              <Switch checked={sameAddr} onChange={v => { setSameAddr(v); if (!v) setShippingAddr({ ...ea }); }} />
            </div>
            {!sameAddr && <AddressForm address={shippingAddr} onChange={setShippingAddr} label="Shipping Address" />}
          </SectionCard>

              <SectionCard title="Tax Details">
            {isOrgVatRegistered && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #EBEBEB", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>VAT Registered</div>
                    <div style={{ fontSize: 11, color: "#AAA", marginTop: 1 }}>Enable if customer is VAT registered</div>
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
          </SectionCard>

          <SectionCard title="Contact Persons">
            {contacts.map((cp, idx) => (
              <div key={cp.id} style={{ background: "#F9F9F9", borderRadius: 10, padding: "12px 12px 4px", marginBottom: 10, border: "1px solid #EBEBEB" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact {idx + 1}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555", cursor: "pointer" }}><Switch checked={cp.isPrimary} onChange={v => updContact(cp.id, "isPrimary", v)} /> Primary</label>
                    <button onClick={() => delContact(cp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CCC" }} onMouseEnter={e => e.currentTarget.style.color = "#DC2626"} onMouseLeave={e => e.currentTarget.style.color = "#CCC"}><Icons.Trash /></button>
                  </div>
                </div>
              <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: 8 }}>
                  <Field label="Title"><Select value={cp.salutation} onChange={v => updContact(cp.id, "salutation", v)} options={SALUTATIONS} placeholder="—" /></Field>
                  <Field label="First Name"><Input value={cp.firstName} onChange={v => updContact(cp.id, "firstName", v)} placeholder="First" /></Field>
                  <Field label="Last Name"><Input value={cp.lastName} onChange={v => updContact(cp.id, "lastName", v)} placeholder="Last" /></Field>
                </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Email"><Input value={cp.email} onChange={v => updContact(cp.id, "email", v)} /></Field>
                  <Field label="Phone"><Input value={cp.phone} onChange={v => updContact(cp.id, "phone", formatPhoneNumber(v))} /></Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Job Title"><Input value={cp.jobTitle} onChange={v => updContact(cp.id, "jobTitle", v)} placeholder="Finance Manager" /></Field>
                  <Field label="Department"><Input value={cp.department} onChange={v => updContact(cp.id, "department", v)} placeholder="Accounts" /></Field>
                </div>
              </div>
            ))}
            <Btn onClick={addContact} variant="outline" size="sm" icon={<Icons.Plus />}>Add Contact Person</Btn>
          </SectionCard>

          <SectionCard title="Remarks">
            <Textarea value={remarks} onChange={setRemarks} placeholder="Internal notes…" rows={3} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
