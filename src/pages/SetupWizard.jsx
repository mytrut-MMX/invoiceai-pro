import { useState } from "react";
import { validateUkCrn } from "../utils/helpers";
import { validateImageDataUrl } from "../utils/security";
import { Icons } from "../components/icons";
import InvoiceSagaLogo from "../components/InvoiceSagaLogo";

const STEPS = [
  { title: "Company Details" },
  { title: "Contact & Address" },
  { title: "Industry & Tax" },
  { title: "Bank & Payment" },
  { title: "Integrations" },
];

const inputBaseCls =
  "w-full h-9 px-3 border rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none transition-colors duration-150 box-border";

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    currency: "GBP",
    Corporation_tax_rate: "20",
    payment_terms: "30",
    country: "United Kingdom",
    vat_registered: "yes",
    cis_registered: "no",
    cis_rate: "20",
  });
  const [errors, setErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState(null);

  const set = (k, v) => {
    setData(d => ({ ...d, [k]: v }));
    setErrors(e => ({ ...e, [k]: false }));
  };

  // SEC-005: anthropic_key removed from required — server-side ANTHROPIC_API_KEY env var is used
  const REQUIRED = [["name"], ["address", "city", "email"], [], [], []];

  const validate = () => {
    const errs = {};
    (REQUIRED[step] || []).forEach(f => { if (!data[f]?.trim()) errs[f] = true; });
    if (step === 0 && data.crn && !validateUkCrn(data.crn)) errs.crn = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const handleLogo = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target.result;
      if (validateImageDataUrl(result)) {
        setLogoPreview(result);
        set("logo", result);
      }
    };
    reader.readAsDataURL(file);
  };

  const finish = () => {
    if (!validate()) return;
    const logo = logoPreview || data.logo;
    // Write to canonical location instead of legacy `logo` field
    onComplete({
      ...data,
      branding: { ...(data.branding || {}), logoUrl: logo, showLogo: true },
    });
  };

  const I = ({ k, label, placeholder, type = "text", required, options }) => {
    const hasError = !!errors[k];
    return (
      <div>
        <label
          className={[
            "block mb-1.5 text-[11px] font-semibold uppercase tracking-wider",
            hasError ? "text-[var(--danger-600)]" : "text-[var(--text-tertiary)]",
          ].join(" ")}
        >
          {label}
          {required && <span className="text-[var(--danger-600)] ml-0.5">*</span>}
        </label>
        {type === "select" ? (
          <select
            value={data[k] || ""}
            onChange={e => set(k, e.target.value)}
            className={[
              inputBaseCls,
              hasError
                ? "border-[var(--danger-600)] focus:shadow-[var(--focus-ring)]"
                : "border-[var(--border-default)] focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
              "cursor-pointer",
            ].join(" ")}
          >
            {(options || []).map(o => (
              <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={data[k] || ""}
            onChange={e => set(k, e.target.value)}
            placeholder={placeholder}
            className={[
              inputBaseCls,
              hasError
                ? "border-[var(--danger-600)] focus:shadow-[var(--focus-ring)]"
                : "border-[var(--border-default)] focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
            ].join(" ")}
          />
        )}
        {hasError && <div className="text-[11px] text-[var(--danger-600)] mt-1">Required</div>}
      </div>
    );
  };

  const YesNo = ({ k, label, hint }) => (
    <div>
      <label className="block mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </label>
      <div className="flex gap-2">
        {["yes", "no"].map(v => {
          const active = data[k] === v;
          return (
            <button
              key={v}
              onClick={() => set(k, v)}
              className={[
                "flex-1 h-9 rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150",
                active
                  ? "bg-[var(--text-primary)] text-white border border-[var(--text-primary)]"
                  : "bg-white text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--surface-sunken)]",
              ].join(" ")}
            >
              {v === "yes" ? "Yes" : "No"}
            </button>
          );
        })}
      </div>
      {hint && <div className="text-[11px] text-[var(--text-tertiary)] mt-1">{hint}</div>}
    </div>
  );

  const renderStep = () => {
    if (step === 0) return (
      <div className="flex flex-col gap-3.5">
        <label className="flex items-center gap-3.5 cursor-pointer px-3.5 py-3 border-2 border-dashed border-[var(--border-default)] rounded-[var(--radius-lg)] hover:border-[var(--border-strong)] transition-colors duration-150">
          {logoPreview ? (
            <img src={logoPreview} alt="logo" className="h-11 object-contain rounded-[var(--radius-sm)]" />
          ) : (
            <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
          <div>
            <div className="font-semibold text-sm text-[var(--text-primary)]">
              {logoPreview ? "Change logo" : "Upload company logo"}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">Shown on all invoices & quotes</div>
          </div>
          <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <I k="name" label="Company Name" required placeholder="Acme Ltd" />
          <I k="crn" label="Company Reg. No (CRN)" placeholder="12345678 or SC123456" />
        </div>
      </div>
    );

    if (step === 1) return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <I k="email" label="Email" required placeholder="invoices@company.com" type="email" />
        <I k="phone" label="Phone" placeholder="+44 20 1234 5678" />
        <I k="fax" label="Fax" placeholder="+44 20 1234 5679" />
        <I k="website" label="Website" placeholder="www.company.com" />
        <div className="md:col-span-2">
          <I k="address" label="Street Address" required placeholder="123 Business Road" />
        </div>
        <I k="city" label="City" required placeholder="London" />
        <I k="postcode" label="Postcode" placeholder="EC1A 1BB" />
        <I k="country" label="Country" placeholder="United Kingdom" />
      </div>
    );

    if (step === 2) return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <I k="currency" label="Default Currency" type="select" options={["GBP", "USD", "EUR", "RON"]} />
          <I k="payment_terms" label="Payment Terms (days)" placeholder="30" type="number" />
        </div>

        <YesNo k="vat_registered" label="Is your company registered for VAT?" hint="If yes, VAT will be applied to invoices" />

        {data.vat_registered === "yes" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 px-3.5 py-3.5 bg-[var(--success-50)] rounded-[var(--radius-lg)] border border-[var(--success-100)]">
            <I k="vat" label="VAT Number" placeholder="GB123456789" />
            <I k="tax_rate" label="VAT Rate (%)" placeholder="20" type="number" />
          </div>
        )}

        <YesNo
          k="cis_registered"
          label="Does your company operate under CIS (Construction Industry Scheme)?"
          hint="UK Construction Industry Scheme — applies CIS deduction to labour items"
        />

        {data.cis_registered === "yes" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 px-3.5 py-3.5 bg-[var(--warning-50)] rounded-[var(--radius-lg)] border border-[var(--warning-100)]">
            <I k="cis" label="CIS Number" placeholder="CIS123456" />
            <I k="cis_rate" label="CIS Deduction Rate (%)" placeholder="20" type="number" />
          </div>
        )}
      </div>
    );

    if (step === 3) return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <I k="bank_name" label="Bank Name" placeholder="Barclays Business" />
        <I k="bank_account" label="Account Number" placeholder="12345678" />
        <I k="bank_sort" label="Sort Code" placeholder="20-00-00" />
        <I k="bank_iban" label="IBAN" placeholder="GB29 NWBK 6016 1331 9268 19" />
      </div>
    );

    if (step === 4) return (
      <div className="flex flex-col gap-3.5">
        <div className="bg-[var(--success-50)] border border-[var(--success-100)] rounded-[var(--radius-md)] px-3.5 py-3 text-sm text-[var(--success-700)]">
          — <strong>AI features</strong> are powered by the server-configured Anthropic key — no setup needed here.
        </div>
        <div className="bg-[var(--surface-sunken)] rounded-[var(--radius-lg)] p-4 border border-[var(--border-subtle)]">
          <div className="font-semibold text-sm text-[var(--text-primary)] mb-2.5">
            EmailJS (optional — for sending invoices by email)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <I k="emailjs_service" label="Service ID" placeholder="service_xxxxxx" />
            <I k="emailjs_template" label="Template ID" placeholder="template_xxxxxx" />
            <div className="md:col-span-2">
              <I k="emailjs_public" label="Public Key" placeholder="xxxxxxxxxxxxxxxxxxx" type="password" />
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-2">
            Set up at{" "}
            <a href="https://emailjs.com" target="_blank" rel="noreferrer" className="text-[var(--brand-600)] hover:text-[var(--brand-700)]">
              emailjs.com
            </a>
            {" "}— free plan: 200 emails/month
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--surface-sunken)] flex items-center justify-center p-4">
      <div className="w-full max-w-[580px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <InvoiceSagaLogo height={28} />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] leading-tight m-0 mb-2">
            Set up your company
          </h1>
          <p className="text-sm text-[var(--text-secondary)] m-0">
            Complete once — your data stays private
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1 mb-6 justify-center">
          {STEPS.map((s, i) => {
            const isPast = i < step;
            const isCurrent = i === step;
            return (
              <div key={i} className="flex items-center gap-1">
                <div
                  className={[
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300",
                    isPast || isCurrent
                      ? "bg-[var(--text-primary)] text-white"
                      : "bg-[var(--border-subtle)] text-[var(--text-tertiary)]",
                  ].join(" ")}
                >
                  {isPast ? <Icons.Check /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={[
                      "w-7 h-px",
                      isPast ? "bg-[var(--text-primary)]" : "bg-[var(--border-subtle)]",
                    ].join(" ")}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-6 sm:p-8">
          <div className="mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Step {step + 1} of {STEPS.length}
            </div>
            <div className="text-lg font-semibold text-[var(--text-primary)] mt-0.5">
              {STEPS[step].title}
            </div>
          </div>

          {renderStep()}

          <div className="flex gap-2.5 mt-6">
            {step > 0 && (
              <button
                onClick={back}
                className="flex-1 h-11 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-transparent text-[var(--text-secondary)] font-semibold cursor-pointer text-sm hover:bg-[var(--surface-sunken)] transition-colors duration-150"
              >
                ← Back
              </button>
            )}
            <button
              onClick={step === STEPS.length - 1 ? finish : next}
              className="flex-[2] h-11 rounded-[var(--radius-md)] border-none bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] text-white font-semibold cursor-pointer text-sm transition-colors duration-150"
            >
              {step === STEPS.length - 1 ? "Launch dashboard →" : "Continue →"}
            </button>
          </div>
        </div>

        <div className="text-center mt-3.5 text-[11px] text-[var(--text-tertiary)]">
          Your data stays private
        </div>
      </div>
    </div>
  );
}
