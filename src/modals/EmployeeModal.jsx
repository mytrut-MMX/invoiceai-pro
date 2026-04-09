import { useState, useContext } from "react";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Field, Input, Select, Btn, SlideToggle, Toggle } from "../components/atoms";
import { Icons } from "../components/icons";
import { formatPhoneNumber, stripPhoneForStorage, formatSortCode, stripSortCode } from "../utils/helpers";
import * as dataAccess from "../lib/dataAccess";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const NI_REGEX = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/i;
const TAX_CODE_REGEX = /^[SC]?(\d{1,4}[LMNT]|BR|D0|D1|D2|0T|NT|K\d+)( ?[WM]1)?$/i;

const NI_CATEGORIES = [
  { value: "A", label: "A — Standard" },
  { value: "B", label: "B — Married women reduced" },
  { value: "C", label: "C — Over State Pension age" },
  { value: "H", label: "H — Apprentice under 25" },
  { value: "J", label: "J — Deferred" },
  { value: "M", label: "M — Under 21" },
  { value: "Z", label: "Z — Under 21 deferred" },
];

const STUDENT_LOAN_OPTIONS = [
  { value: "none",    label: "None" },
  { value: "plan1",   label: "Plan 1" },
  { value: "plan2",   label: "Plan 2" },
  { value: "plan4",   label: "Plan 4" },
  { value: "plan5",   label: "Plan 5" },
  { value: "postgrad", label: "Postgrad" },
];

const TITLES = ["Mr", "Mrs", "Ms", "Dr", "Prof", "Mx", "Rev"];

// ─── SECTION HEADER ──────────────────────────────────────────────────────────

function SectionToggle({ label, open, onToggle, preview }) {
  return (
    <button onClick={onToggle}
      style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"1.5px dashed #CCC", borderRadius:7, padding:"9px 14px", cursor:"pointer", color:"#555", fontSize:13, fontFamily:ff, width:"100%", marginBottom: open ? 0 : 0 }}>
      <span style={{ color:"#888" }}>{open ? <Icons.ChevDown /> : <Icons.ChevRight />}</span>
      <span style={{ fontWeight:600 }}>{label}</span>
      {!open && preview && <span style={{ fontSize:11, color:"#888", marginLeft:"auto" }}>{preview}</span>}
    </button>
  );
}

function SectionBody({ children }) {
  return (
    <div style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 14px 2px", marginTop:8, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
      {children}
    </div>
  );
}

const req = (label) => <>{label} <span style={{ color:"#dc2626" }}>*</span></>;

// ─── MAIN FORM ───────────────────────────────────────────────────────────────

export default function EmployeeForm({ existing, onClose, onSave }) {
  const { user } = useContext(AppCtx);

  // Sections
  const [showPersonal, setShowPersonal] = useState(true);
  const [showTaxNI, setShowTaxNI] = useState(!existing);
  const [showEmployment, setShowEmployment] = useState(!existing);
  const [showPension, setShowPension] = useState(false);
  const [showBank, setShowBank] = useState(false);

  // Personal
  const [title, setTitle] = useState(existing?.title || "");
  const [firstName, setFirstName] = useState(existing?.first_name || "");
  const [lastName, setLastName] = useState(existing?.last_name || "");
  const [email, setEmail] = useState(existing?.email || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [dob, setDob] = useState(existing?.date_of_birth || "");
  const [street, setStreet] = useState(existing?.address?.street || "");
  const [city, setCity] = useState(existing?.address?.city || "");
  const [postcode, setPostcode] = useState(existing?.address?.postcode || "");
  const [country, setCountry] = useState(existing?.address?.country || "United Kingdom");

  // Tax & NI
  const [niNumber, setNiNumber] = useState(existing?.ni_number || "");
  const [niError, setNiError] = useState("");
  const [taxCode, setTaxCode] = useState(existing?.tax_code || "1257L");
  const [taxCodeError, setTaxCodeError] = useState("");
  const [niCategory, setNiCategory] = useState(existing?.ni_category || "A");
  const [studentLoan, setStudentLoan] = useState(existing?.student_loan_plan || "none");

  // Employment & Pay
  const [startDate, setStartDate] = useState(existing?.start_date || "");
  const [leaveDate, setLeaveDate] = useState(existing?.leave_date || "");
  const [salaryType, setSalaryType] = useState(existing?.salary_type || "annual");
  const [salaryAmount, setSalaryAmount] = useState(existing?.salary_amount ?? "");
  const [payFrequency, setPayFrequency] = useState(existing?.pay_frequency || "monthly");
  const [isDirector, setIsDirector] = useState(existing?.is_director ?? false);

  // Pension
  const [pensionEnrolled, setPensionEnrolled] = useState(existing?.pension_enrolled ?? false);
  const [pensionEmployee, setPensionEmployee] = useState(existing?.pension_employee_pct ?? 5);
  const [pensionEmployer, setPensionEmployer] = useState(existing?.pension_employer_pct ?? 3);

  // Bank
  const [bankName, setBankName] = useState(existing?.bank_details?.bank_name || "");
  const [sortCode, setSortCode] = useState(existing?.bank_details?.sort_code || "");
  const [accountNumber, setAccountNumber] = useState(existing?.bank_details?.account_number || "");

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validateNI = (v) => {
    const trimmed = v.trim().toUpperCase();
    if (!trimmed) { setNiError("NI number is required"); return false; }
    if (!NI_REGEX.test(trimmed)) { setNiError("Invalid NI number (e.g. AB123456C)"); return false; }
    setNiError(""); return true;
  };

  const validateTaxCode = (v) => {
    const trimmed = v.trim().toUpperCase();
    if (!trimmed) { setTaxCodeError("Tax code is required"); return false; }
    if (!TAX_CODE_REGEX.test(trimmed)) { setTaxCodeError("Invalid tax code (e.g. 1257L, BR, S1257L)"); return false; }
    setTaxCodeError(""); return true;
  };

  const canSave =
    firstName.trim() &&
    lastName.trim() &&
    niNumber.trim() && !niError &&
    taxCode.trim() && !taxCodeError &&
    startDate &&
    salaryAmount !== "" && Number(salaryAmount) >= 0;

  // ─── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Final validation pass
    const niOk = validateNI(niNumber);
    const taxOk = validateTaxCode(taxCode);
    if (!niOk || !taxOk || !canSave) return;

    setSaving(true);
    setSaveError("");

    const status = leaveDate && new Date(leaveDate) <= new Date() ? "leaver" : "active";

    const employee = {
      id: existing?.id || crypto.randomUUID(),
      title: title || null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: stripPhoneForStorage(phone) || null,
      date_of_birth: dob || null,
      ni_number: niNumber.trim().toUpperCase(),
      address: { street, city, postcode, country },
      tax_code: taxCode.trim().toUpperCase(),
      ni_category: niCategory,
      student_loan_plan: studentLoan,
      salary_type: salaryType,
      salary_amount: Number(salaryAmount),
      pay_frequency: payFrequency,
      start_date: startDate,
      leave_date: leaveDate || null,
      status,
      is_director: isDirector,
      pension_enrolled: pensionEnrolled,
      pension_employee_pct: Number(pensionEmployee),
      pension_employer_pct: Number(pensionEmployer),
      bank_details: (bankName || sortCode || accountNumber) ? {
        bank_name: bankName,
        sort_code: stripSortCode(sortCode),
        account_number: accountNumber.replace(/\D/g, "").slice(0, 8),
      } : null,
    };

    try {
      if (user?.id && dataAccess.saveEmployee) {
        const result = await dataAccess.saveEmployee(user.id, employee);
        if (result?.error) { setSaveError(typeof result.error === "string" ? result.error : "Failed to save"); setSaving(false); return; }
      }
      onSave(employee);
    } catch (err) {
      setSaveError(err?.message || "Failed to save");
      setSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:"#FAFAF7", minHeight:"100vh", fontFamily:ff }}>

      {/* Sticky header */}
      <div style={{
        position:"sticky", top:0, zIndex:10, background:"#fff",
        borderBottom:"1px solid #E8E6E0", padding:"12px 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <button onClick={onClose}
          style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:13, fontFamily:ff, display:"flex", alignItems:"center", gap:4, padding:0 }}>
          ← Employees
        </button>
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!canSave || saving}>
            {saving ? "Saving…" : existing ? "Save Changes" : "Save Employee"}
          </Btn>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 24px 40px" }}>

        {saveError && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#b91c1c" }}>
            {saveError}
          </div>
        )}

        {/* ── Section 1: Personal Details ─────────────────────────────────── */}
        <div style={{ marginBottom:14 }}>
          <SectionToggle label="Personal Details" open={showPersonal} onToggle={() => setShowPersonal(!showPersonal)}
            preview={firstName || lastName ? `${firstName} ${lastName}`.trim() : null} />
          {showPersonal && (
            <SectionBody>
              <div style={{ display:"grid", gridTemplateColumns:"100px 1fr 1fr", gap:14, marginBottom:14 }}>
                <Field label="Title">
                  <Select value={title} onChange={setTitle} options={TITLES} placeholder="—" />
                </Field>
                <Field label={req("First Name")}>
                  <Input value={firstName} onChange={setFirstName} placeholder="First name" />
                </Field>
                <Field label={req("Last Name")}>
                  <Input value={lastName} onChange={setLastName} placeholder="Last name" />
                </Field>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <Field label="Email">
                  <Input value={email} onChange={setEmail} type="email" placeholder="email@example.com" />
                </Field>
                <Field label="Phone">
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => setPhone(formatPhoneNumber(phone))} placeholder="+44 …"
                    style={{ width:"100%", padding:"9px 11px", border:"1px solid #e8e8ec", borderRadius:5, fontSize:15, fontFamily:ff, color:"#1A1A1A", background:"#fff", outline:"none", boxSizing:"border-box", transition:"border 0.15s" }}
                    onFocus={e => e.target.style.borderColor="#1e6be0"} />
                </Field>
              </div>
              <div style={{ marginBottom:14 }}>
                <Field label="Date of Birth">
                  <Input value={dob} onChange={setDob} type="date" />
                </Field>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <Field label="Street">
                  <Input value={street} onChange={setStreet} placeholder="123 High Street" />
                </Field>
                <Field label="City / Town">
                  <Input value={city} onChange={setCity} placeholder="London" />
                </Field>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <Field label="Postcode">
                  <Input value={postcode} onChange={setPostcode} placeholder="SW1A 1AA" />
                </Field>
                <Field label="Country">
                  <Input value={country} onChange={setCountry} placeholder="United Kingdom" />
                </Field>
              </div>
            </SectionBody>
          )}
        </div>

        {/* ── Section 2: Tax & NI ─────────────────────────────────────────── */}
        <div style={{ marginBottom:14 }}>
          <SectionToggle label="Tax & National Insurance" open={showTaxNI} onToggle={() => setShowTaxNI(!showTaxNI)}
            preview={niNumber ? `NI: ${niNumber}` : null} />
          {showTaxNI && (
            <SectionBody>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <Field label={req("NI Number")} error={niError}>
                  <input
                    value={niNumber}
                    onChange={e => { setNiNumber(e.target.value.toUpperCase()); if (niError) setNiError(""); }}
                    onBlur={() => validateNI(niNumber)}
                    placeholder="AB123456C"
                    style={{ width:"100%", padding:"9px 11px", border:`1px solid ${niError?"#fca5a5":"#e8e8ec"}`, borderRadius:5, fontSize:15, fontFamily:"'Courier New', Courier, monospace", color:"#1A1A1A", background:"#fff", outline:"none", boxSizing:"border-box", letterSpacing:"0.06em", transition:"border 0.15s" }}
                    onFocus={e => e.target.style.borderColor = niError ? "#dc2626" : "#1e6be0"}
                  />
                </Field>
                <Field label={req("Tax Code")} error={taxCodeError}>
                  <input
                    value={taxCode}
                    onChange={e => { setTaxCode(e.target.value.toUpperCase()); if (taxCodeError) setTaxCodeError(""); }}
                    onBlur={() => validateTaxCode(taxCode)}
                    placeholder="1257L"
                    style={{ width:"100%", padding:"9px 11px", border:`1px solid ${taxCodeError?"#fca5a5":"#e8e8ec"}`, borderRadius:5, fontSize:15, fontFamily:ff, color:"#1A1A1A", background:"#fff", outline:"none", boxSizing:"border-box", transition:"border 0.15s" }}
                    onFocus={e => e.target.style.borderColor = taxCodeError ? "#dc2626" : "#1e6be0"}
                  />
                </Field>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <Field label={req("NI Category")}>
                  <Select value={niCategory} onChange={setNiCategory} options={NI_CATEGORIES} />
                </Field>
                <Field label="Student Loan Plan">
                  <Select value={studentLoan} onChange={setStudentLoan} options={STUDENT_LOAN_OPTIONS} />
                </Field>
              </div>
            </SectionBody>
          )}
        </div>

        {/* ── Section 3: Employment & Pay ──────────────────────────────────── */}
        <div style={{ marginBottom:14 }}>
          <SectionToggle label="Employment & Pay" open={showEmployment} onToggle={() => setShowEmployment(!showEmployment)}
            preview={salaryAmount ? `${salaryType === "hourly" ? "Hourly" : "Annual"} · ${payFrequency}` : null} />
          {showEmployment && (
            <SectionBody>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <Field label={req("Start Date")}>
                  <Input value={startDate} onChange={setStartDate} type="date" />
                </Field>
                <Field label="Leave Date" hint="Set to make employee a Leaver">
                  <Input value={leaveDate} onChange={setLeaveDate} type="date" />
                </Field>
              </div>
              <div style={{ marginBottom:14 }}>
                <Field label={req("Salary Type")}>
                  <Toggle value={salaryType === "annual" ? "Annual" : "Hourly"} onChange={v => setSalaryType(v === "Annual" ? "annual" : "hourly")} options={["Annual", "Hourly"]} />
                </Field>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <Field label={req(salaryType === "hourly" ? "Hourly rate (£)" : "Annual salary (£)")}>
                  <Input value={salaryAmount} onChange={setSalaryAmount} type="number" placeholder={salaryType === "hourly" ? "12.50" : "30000"} />
                </Field>
                <Field label={req("Pay Frequency")}>
                  <Select value={payFrequency} onChange={setPayFrequency}
                    options={[{ value:"weekly", label:"Weekly" }, { value:"fortnightly", label:"Fortnightly" }, { value:"monthly", label:"Monthly" }]} />
                </Field>
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:14, padding:"8px 0" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>Company Director</div>
                  <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>
                    Mark if this employee is a director of the company (used for Employment Allowance eligibility checks).
                  </div>
                </div>
                <SlideToggle value={isDirector} onChange={setIsDirector} />
              </div>
            </SectionBody>
          )}
        </div>

        {/* ── Section 4: Pension ───────────────────────────────────────────── */}
        <div style={{ marginBottom:14 }}>
          <SectionToggle label="Pension" open={showPension} onToggle={() => setShowPension(!showPension)}
            preview={pensionEnrolled ? `${pensionEmployee}% / ${pensionEmployer}%` : "Not enrolled"} />
          {showPension && (
            <SectionBody>
              <div style={{ marginBottom:14 }}>
                <Field label="Auto-enrolled in workplace pension">
                  <SlideToggle value={pensionEnrolled} onChange={setPensionEnrolled} />
                </Field>
              </div>
              {pensionEnrolled && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                  <Field label="Employee contribution %" hint="Minimum 5%">
                    <Input value={pensionEmployee} onChange={setPensionEmployee} type="number" placeholder="5" />
                  </Field>
                  <Field label="Employer contribution %" hint="Minimum 3%">
                    <Input value={pensionEmployer} onChange={setPensionEmployer} type="number" placeholder="3" />
                  </Field>
                </div>
              )}
            </SectionBody>
          )}
        </div>

        {/* ── Section 5: Bank Details ─────────────────────────────────────── */}
        <div style={{ marginBottom:14 }}>
          <SectionToggle label="Bank Details" open={showBank} onToggle={() => setShowBank(!showBank)}
            preview={bankName || null} />
          {showBank && (
            <SectionBody>
              <div style={{ marginBottom:14 }}>
                <Field label="Bank Name">
                  <Input value={bankName} onChange={setBankName} placeholder="e.g. HSBC, Barclays" />
                </Field>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <Field label="Sort Code">
                  <Input
                    value={sortCode}
                    onChange={(v) => setSortCode(formatSortCode(v))}
                    placeholder="12-34-56"
                    style={{ fontFamily:"'Courier New', Courier, monospace", letterSpacing:"0.06em" }}
                  />
                </Field>
                <Field label="Account Number">
                  <Input
                    value={accountNumber}
                    onChange={(v) => setAccountNumber(v.replace(/\D/g, "").slice(0, 8))}
                    placeholder="12345678"
                    style={{ fontFamily:"'Courier New', Courier, monospace", letterSpacing:"0.06em" }}
                  />
                </Field>
              </div>
            </SectionBody>
          )}
        </div>

      </div>
    </div>
  );
}
