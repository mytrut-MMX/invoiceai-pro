import { useState, useContext } from "react";
import { CUR_SYM, PAYMENT_TERMS_OPTS } from "../constants";
import { Field, Input, Select, Textarea, Btn } from "../components/atoms";
import { formatPhoneNumber, stripPhoneForStorage } from "../utils/helpers";
import { useCISSettings } from "../hooks/useCISSettings";
import { AppCtx } from "../context/AppContext";
import CustomFieldsEditor from "../components/shared/CustomFieldsEditor";

const TABS = ["Other Details", "Address", "Contact Persons", "Custom Fields", "Remarks"];
const CURRENCIES = Object.keys(CUR_SYM);
const PAYMENT_TERMS = PAYMENT_TERMS_OPTS.filter((term) => term !== "Custom");

const textInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

export default function CustomerForm({ existing, onClose, onSave, settings, customers = [] }) {
  const [activeTab, setActiveTab] = useState("Other Details");
  const [saved, setSaved] = useState(false);
  const { cisEnabled } = useCISSettings();

  const [custType, setCustType] = useState(existing?.type || "Business");
  const [salutation, setSalutation] = useState(existing?.salutation || "");
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
  const [shipStreet1, setShipStreet1] = useState(existing?.shippingAddress?.street1 || "");
  const [shipStreet2, setShipStreet2] = useState(existing?.shippingAddress?.street2 || "");
  const [shipCity, setShipCity] = useState(existing?.shippingAddress?.city || "");
  const [shipState, setShipState] = useState(existing?.shippingAddress?.state || "");
  const [shipZip, setShipZip] = useState(existing?.shippingAddress?.zip || "");
  const [shipCountry, setShipCountry] = useState(existing?.shippingAddress?.country || "");
  const [contactPersons, setContactPersons] = useState(
    existing?.contactPersons || [{ salutation: "", firstName: "", lastName: "", email: "", phone: "", mobile: "" }],
  );
  const [remarks, setRemarks] = useState(existing?.notes || "");
  const [cisRegistered, setCisRegistered] = useState(existing?.cis?.registered ?? false);
  const [cisUtr, setCisUtr] = useState(existing?.cis?.utr || "");
  const [selfBilledByCustomer, setSelfBilledByCustomer] = useState(existing?.self_billed_by_customer ?? false);
  const [customFields, setCustomFields] = useState(existing?.customFields || []);
  const [vatNumber, setVatNumber] = useState(existing?.vat_number || "");
  const [sbSectionOpen, setSbSectionOpen] = useState(false);
  const { orgSettings } = useContext(AppCtx) || {};
  const sbGatePassed = Boolean(vatNumber) && orgSettings?.vatReg === "Yes";

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
      type: custType,
      salutation,
      name: displayName || `${firstName} ${lastName}`.trim(),
      firstName, lastName, company, email,
      phone: stripPhoneForStorage(phone),
      website, currency, paymentTerms, remarks,
      vat_number: vatNumber || null,
      contactPersons: (contactPersons || []).map(cp => ({
        ...cp,
        phone: stripPhoneForStorage(cp.phone),
        mobile: stripPhoneForStorage(cp.mobile),
      })),
      cis: {
        registered: cisRegistered,
        utr: cisUtr,
        businessType: "Contractor",
      },
      billingAddress: {
        street1: billStreet1, street2: billStreet2,
        city: billCity, state: billState, zip: billZip, country: billCountry,
      },
      shippingAddress: {
        street1: shipStreet1, street2: shipStreet2,
        city: shipCity, state: shipState, zip: shipZip, country: shipCountry,
      },
      self_billed_by_customer: selfBilledByCustomer,
      // Agreement id is created in the Phase 3 SBA flow, never from this modal.
      self_billing_agreement_id: existing?.self_billing_agreement_id ?? null,
      customFields,
    };
    setSaved(true);
    setTimeout(() => onSave(customer), 600);
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
        >
          ← Customers
        </button>
        <div className="flex gap-2">
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={saved}>
            {saved ? "Saved ✓" : existing ? "Save changes" : "Save customer"}
          </Btn>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-5 pb-10">
        {/* Primary details card */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 mb-4">
          <div className="flex gap-5 mb-4 flex-wrap">
            {["Business", "Individual"].map((t) => (
              <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm text-[var(--text-secondary)]">
                <input
                  type="radio"
                  name="custType"
                  checked={custType === t}
                  onChange={() => setCustType(t)}
                  className="accent-[var(--brand-600)]"
                />
                {t}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <Field label="Salutation">
              <Select
                value={salutation}
                onChange={setSalutation}
                options={["Mr", "Mrs", "Ms", "Dr", "Prof", "Mx", "Rev"]}
                placeholder="— Select —"
              />
            </Field>
            <Field label="First Name"><Input value={firstName} onChange={setFirstName} placeholder="First name" /></Field>
            <Field label="Last Name"><Input value={lastName} onChange={setLastName} placeholder="Last name" /></Field>
          </div>

          {custType === "Business" && (
            <div className="mb-3">
              <Field label="Company Name">
                <Input value={company} onChange={setCompany} placeholder="Company name" />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Field label="Customer Display Name">
              <Input value={displayName} onChange={setDisplayName} />
              {displayName && customers.some(c => c.id !== existing?.id && c.name?.toLowerCase() === displayName.toLowerCase()) && (
                <div className="text-[11px] text-[var(--warning-700)] mt-1">
                  ⚠ A customer with this name already exists
                </div>
              )}
            </Field>
            <Field label="Email"><Input value={email} onChange={setEmail} type="email" /></Field>
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
            <Field label="Website"><Input value={website} onChange={setWebsite} placeholder="https://" /></Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <Field label="VAT Number">
              <Input value={vatNumber} onChange={setVatNumber} placeholder="GB 123 4567 89" />
            </Field>
          </div>
        </div>

        {/* Self-Billing Arrangement (advanced) — collapsed by default */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] mb-4" style={{ marginTop: "21px" }}>
          <button
            type="button"
            onClick={() => setSbSectionOpen((v) => !v)}
            aria-expanded={sbSectionOpen}
            aria-controls="customer-sb-panel"
            className="w-full flex items-center justify-between px-5 py-3 bg-transparent border-none cursor-pointer text-sm font-semibold text-[var(--text-primary)]"
          >
            <span>Self-Billing Arrangement (advanced)</span>
            <span aria-hidden="true" className="text-[var(--text-tertiary)]">{sbSectionOpen ? "▾" : "▸"}</span>
          </button>
          {sbSectionOpen && (
            <div id="customer-sb-panel" className="px-5 pb-5 pt-1" style={{ gap: "21px" }}>
              {!sbGatePassed ? (
                <div role="status" className="border border-dashed border-[var(--border-subtle)] rounded-[var(--radius-md)] p-4 text-sm text-[var(--text-secondary)]">
                  Self-billing arrangements require both parties to be VAT-registered. Enter a VAT
                  number above, and ensure your business VAT registration is set in Settings → Tax.
                </div>
              ) : (
                <>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={selfBilledByCustomer}
                      onChange={(e) => setSelfBilledByCustomer(e.target.checked)}
                      className="accent-[var(--brand-600)]"
                    />
                    This customer issues self-billed invoices to me
                  </label>
                  {selfBilledByCustomer && (
                    <div role="status" className="mt-3 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3 leading-relaxed">
                      With this flag enabled, you cannot issue your own invoices to this customer
                      while an active agreement exists. Received self-bills will appear in your
                      Invoices list.
                      <br />
                      Next step: create the agreement document from Customers →{" "}
                      <span className="font-medium">{displayName || existing?.name || "this customer"}</span>
                      {" "}→ Set up self-billing. (Coming in Phase 3.)
                    </div>
                  )}
                  <div className="mt-2 text-xs text-[var(--text-tertiary)]">
                    Agreement ID: {existing?.self_billing_agreement_id ?? "not yet created"}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tabs card */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
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
            {activeTab === "Other Details" && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="CIS Registered">
                      <Select
                        value={String(cisRegistered)}
                        onChange={v => setCisRegistered(v === "true")}
                        options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]}
                      />
                    </Field>
                    <Field label="CIS UTR">
                      <Input value={cisUtr} onChange={setCisUtr} placeholder="1234567890" />
                    </Field>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Address" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-tertiary)] tracking-wider uppercase mb-3">
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
                <div>
                  <div className="text-xs font-semibold text-[var(--text-tertiary)] tracking-wider uppercase mb-3 flex items-center gap-2">
                    Shipping address
                    <button
                      onClick={copyBillingToShipping}
                      className="text-[11px] text-[var(--brand-600)] hover:text-[var(--brand-700)] bg-transparent border-none cursor-pointer font-normal normal-case tracking-normal"
                    >
                      ↓ Copy billing
                    </button>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Field label="Street 1"><Input value={shipStreet1} onChange={setShipStreet1} /></Field>
                    <Field label="Street 2"><Input value={shipStreet2} onChange={setShipStreet2} /></Field>
                    <Field label="City"><Input value={shipCity} onChange={setShipCity} /></Field>
                    <Field label="State / County"><Input value={shipState} onChange={setShipState} /></Field>
                    <Field label="Postal / ZIP Code"><Input value={shipZip} onChange={setShipZip} /></Field>
                    <Field label="Country"><Input value={shipCountry} onChange={setShipCountry} /></Field>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Contact Persons" && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[var(--surface-sunken)]">
                        {["Salutation", "First Name", "Last Name", "Email", "Phone", "Mobile", ""].map(h => (
                          <th
                            key={h}
                            className="py-2 px-2.5 text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)] whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(contactPersons || [{ salutation: "", firstName: "", lastName: "", email: "", phone: "", mobile: "" }]).map((cp, i) => (
                        <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                          {["salutation", "firstName", "lastName", "email", "phone", "mobile"].map(f => (
                            <td key={f} className="py-1.5 px-1.5 align-middle">
                              {f === "salutation" ? (
                                <Select
                                  value={cp[f] || ""}
                                  onChange={v => {
                                    const arr = [...(contactPersons || [{}])];
                                    arr[i] = { ...arr[i], [f]: v };
                                    setContactPersons(arr);
                                  }}
                                  options={["Mr", "Mrs", "Ms", "Dr", "Prof", "Mx", "Rev"]}
                                  placeholder="— Select —"
                                />
                              ) : (f === "phone" || f === "mobile") ? (
                                <input
                                  type="text"
                                  value={cp[f] || ""}
                                  onChange={e => {
                                    const arr = [...(contactPersons || [{}])];
                                    arr[i] = { ...arr[i], [f]: e.target.value };
                                    setContactPersons(arr);
                                  }}
                                  onBlur={() => {
                                    const arr = [...(contactPersons || [{}])];
                                    arr[i] = { ...arr[i], [f]: formatPhoneNumber(cp[f]) };
                                    setContactPersons(arr);
                                  }}
                                  className={textInputCls}
                                />
                              ) : (
                                <Input
                                  value={cp[f] || ""}
                                  onChange={v => {
                                    const arr = [...(contactPersons || [{}])];
                                    arr[i] = { ...arr[i], [f]: v };
                                    setContactPersons(arr);
                                  }}
                                />
                              )}
                            </td>
                          ))}
                          <td className="py-1.5 px-1">
                            <button
                              onClick={() => {
                                const arr = [...(contactPersons || [])];
                                arr.splice(i, 1);
                                setContactPersons(arr);
                              }}
                              className="text-[var(--text-tertiary)] hover:text-[var(--danger-600)] bg-transparent border-none cursor-pointer text-base leading-none"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() =>
                    setContactPersons([
                      ...(contactPersons || []),
                      { salutation: "", firstName: "", lastName: "", email: "", phone: "", mobile: "" },
                    ])
                  }
                  className="mt-3 bg-transparent border-none cursor-pointer text-sm text-[var(--brand-600)] hover:text-[var(--brand-700)] flex items-center gap-1.5 font-medium"
                >
                  ＋ Add contact person
                </button>
              </div>
            )}

            {activeTab === "Custom Fields" && (
              <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />
            )}

            {activeTab === "Remarks" && (
              <Field
                label={<>Remarks <span className="text-[var(--text-tertiary)] font-normal">(For Internal Use)</span></>}
              >
                <Textarea value={remarks} onChange={setRemarks} rows={4} placeholder="Any notes about this customer..." />
              </Field>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
