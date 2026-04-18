import { useState, useContext } from "react";
import { AppCtx } from "../context/AppContext";
import { Field, Input, Select, Btn, SlideToggle, Toggle } from "../components/atoms";
import { Icons } from "../components/icons";
import { formatPhoneNumber, stripPhoneForStorage, formatSortCode, stripSortCode } from "../utils/helpers";
import * as dataAccess from "../lib/dataAccess";
import { useToast } from "../components/ui/Toast";

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

const textInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

function SectionToggle({ label, open, onToggle, preview }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 bg-transparent border border-dashed border-[var(--border-default)] rounded-[var(--radius-md)] px-3.5 py-2.5 cursor-pointer text-sm w-full text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-colors duration-150"
    >
      <span className="text-[var(--text-tertiary)] flex">
        {open ? <Icons.ChevDown /> : <Icons.ChevRight />}
      </span>
      <span className="font-semibold">{label}</span>
      {!open && preview && <span className="text-xs text-[var(--text-tertiary)] ml-auto">{preview}</span>}
    </button>
  );
}

function SectionBody({ children }) {
  return (
    <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] p-4 pb-1 mt-2 border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
      {children}
    </div>
  );
}

const req = (label) => <>{label} <span className="text-[var(--danger-600)]">*</span></>;

export default function EmployeeForm({ existing, onClose, onSave }) {
  const { user } = useContext(AppCtx);
  const { toast } = useToast();

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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  const handleSave = async () => {
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
      toast({ title: "Employee saved", variant: "success" });
    } catch (err) {
      setSaveError(err?.message || "Failed to save");
      setSaving(false);
    }
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
        >
          ← Employees
        </button>
        <div className="flex gap-2">
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!canSave || saving}>
            {saving ? "Saving…" : existing ? "Save changes" : "Save employee"}
          </Btn>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-5 pb-10">
        {saveError && (
          <div className="bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3.5 py-2.5 mb-4 text-sm text-[var(--danger-700)]">
            {saveError}
          </div>
        )}

        {/* Personal */}
        <div className="mb-3.5">
          <SectionToggle
            label="Personal details"
            open={showPersonal}
            onToggle={() => setShowPersonal(!showPersonal)}
            preview={firstName || lastName ? `${firstName} ${lastName}`.trim() : null}
          />
          {showPersonal && (
            <SectionBody>
              <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "100px 1fr 1fr" }}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Field label="Email">
                  <Input value={email} onChange={setEmail} type="email" placeholder="email@example.com" />
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
              </div>
              <div className="mb-3">
                <Field label="Date of Birth">
                  <Input value={dob} onChange={setDob} type="date" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Field label="Street">
                  <Input value={street} onChange={setStreet} placeholder="123 High Street" />
                </Field>
                <Field label="City / Town">
                  <Input value={city} onChange={setCity} placeholder="London" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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

        {/* Tax & NI */}
        <div className="mb-3.5">
          <SectionToggle
            label="Tax & National Insurance"
            open={showTaxNI}
            onToggle={() => setShowTaxNI(!showTaxNI)}
            preview={niNumber ? `NI: ${niNumber}` : null}
          />
          {showTaxNI && (
            <SectionBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Field label={req("NI Number")} error={niError}>
                  <input
                    value={niNumber}
                    onChange={e => { setNiNumber(e.target.value.toUpperCase()); if (niError) setNiError(""); }}
                    onBlur={() => validateNI(niNumber)}
                    placeholder="AB123456C"
                    className={[
                      "w-full h-9 px-3 rounded-[var(--radius-md)] text-sm bg-white outline-none box-border font-mono tracking-wider",
                      niError
                        ? "border border-[var(--danger-600)] focus:shadow-[var(--focus-ring)]"
                        : "border border-[var(--border-default)] focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
                    ].join(" ")}
                  />
                </Field>
                <Field label={req("Tax Code")} error={taxCodeError}>
                  <input
                    value={taxCode}
                    onChange={e => { setTaxCode(e.target.value.toUpperCase()); if (taxCodeError) setTaxCodeError(""); }}
                    onBlur={() => validateTaxCode(taxCode)}
                    placeholder="1257L"
                    className={[
                      "w-full h-9 px-3 rounded-[var(--radius-md)] text-sm bg-white outline-none box-border",
                      taxCodeError
                        ? "border border-[var(--danger-600)] focus:shadow-[var(--focus-ring)]"
                        : "border border-[var(--border-default)] focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
                    ].join(" ")}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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

        {/* Employment & Pay */}
        <div className="mb-3.5">
          <SectionToggle
            label="Employment & Pay"
            open={showEmployment}
            onToggle={() => setShowEmployment(!showEmployment)}
            preview={salaryAmount ? `${salaryType === "hourly" ? "Hourly" : "Annual"} · ${payFrequency}` : null}
          />
          {showEmployment && (
            <SectionBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Field label={req("Start Date")}>
                  <Input value={startDate} onChange={setStartDate} type="date" />
                </Field>
                <Field label="Leave Date" hint="Set to make employee a Leaver">
                  <Input value={leaveDate} onChange={setLeaveDate} type="date" />
                </Field>
              </div>
              <div className="mb-3">
                <Field label={req("Salary Type")}>
                  <Toggle
                    value={salaryType === "annual" ? "Annual" : "Hourly"}
                    onChange={v => setSalaryType(v === "Annual" ? "annual" : "hourly")}
                    options={["Annual", "Hourly"]}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Field label={req(salaryType === "hourly" ? "Hourly rate (£)" : "Annual salary (£)")}>
                  <Input
                    value={salaryAmount}
                    onChange={setSalaryAmount}
                    type="number"
                    placeholder={salaryType === "hourly" ? "12.50" : "30000"}
                  />
                </Field>
                <Field label={req("Pay Frequency")}>
                  <Select
                    value={payFrequency}
                    onChange={setPayFrequency}
                    options={[
                      { value: "weekly", label: "Weekly" },
                      { value: "fortnightly", label: "Fortnightly" },
                      { value: "monthly", label: "Monthly" },
                    ]}
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between gap-4 mb-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Company Director</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    Mark if this employee is a director of the company (used for Employment Allowance eligibility checks).
                  </div>
                </div>
                <SlideToggle value={isDirector} onChange={setIsDirector} />
              </div>
            </SectionBody>
          )}
        </div>

        {/* Pension */}
        <div className="mb-3.5">
          <SectionToggle
            label="Pension"
            open={showPension}
            onToggle={() => setShowPension(!showPension)}
            preview={pensionEnrolled ? `${pensionEmployee}% / ${pensionEmployer}%` : "Not enrolled"}
          />
          {showPension && (
            <SectionBody>
              <div className="mb-3">
                <Field label="Auto-enrolled in workplace pension">
                  <SlideToggle value={pensionEnrolled} onChange={setPensionEnrolled} />
                </Field>
              </div>
              {pensionEnrolled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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

        {/* Bank */}
        <div className="mb-3.5">
          <SectionToggle
            label="Bank details"
            open={showBank}
            onToggle={() => setShowBank(!showBank)}
            preview={bankName || null}
          />
          {showBank && (
            <SectionBody>
              <div className="mb-3">
                <Field label="Bank Name">
                  <Input value={bankName} onChange={setBankName} placeholder="e.g. HSBC, Barclays" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Field label="Sort Code">
                  <Input
                    value={sortCode}
                    onChange={v => setSortCode(formatSortCode(v))}
                    placeholder="12-34-56"
                    style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.06em" }}
                  />
                </Field>
                <Field label="Account Number">
                  <Input
                    value={accountNumber}
                    onChange={v => setAccountNumber(v.replace(/\D/g, "").slice(0, 8))}
                    placeholder="12345678"
                    style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.06em" }}
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
