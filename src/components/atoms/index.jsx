import { useState } from "react";
import { Icons } from "../icons";

// ─── FIELD ───────────────────────────────────────────────────────────────────
export const Field = ({ label, children, required, hint, error }) => (
  <div className="mb-3.5">
    {label && (
      <label
        className={[
          "block mb-1.5 text-xs font-semibold uppercase tracking-wide",
          error ? "text-[var(--danger-600)]" : "text-[var(--text-secondary)]",
        ].join(" ")}
      >
        {label}
        {required && <span className="text-[var(--danger-600)] ml-0.5">*</span>}
      </label>
    )}
    {children}
    {error && (
      <div className="mt-1 flex items-center gap-1 text-xs text-[var(--danger-600)]">
        <Icons.Alert />
        {error}
      </div>
    )}
    {!error && hint && (
      <div className="mt-1 text-xs text-[var(--text-tertiary)]">{hint}</div>
    )}
  </div>
);

// ─── INPUT ───────────────────────────────────────────────────────────────────
export const Input = ({ value, onChange, placeholder, type = "text", style: sx = {}, readOnly, align = "left", error, maxLength }) => {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      maxLength={maxLength}
      className={[
        "w-full h-9 px-3 border rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] box-border transition-colors duration-150",
        "outline-none focus:shadow-[var(--focus-ring)]",
        error
          ? "border-[var(--danger-600)]"
          : "border-[var(--border-default)] focus:border-[var(--brand-600)]",
        readOnly ? "bg-[var(--surface-sunken)]" : "bg-white",
        alignCls,
      ].join(" ")}
      style={sx}
    />
  );
};

// ─── TEXTAREA ────────────────────────────────────────────────────────────────
export const Textarea = ({ value, onChange, placeholder, rows = 3, maxLength }) => (
  <textarea
    value={value ?? ""}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    maxLength={maxLength}
    className="w-full min-h-[80px] px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none resize-y box-border leading-6 transition-colors duration-150 focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]"
  />
);

// ─── SELECT ──────────────────────────────────────────────────────────────────
export const Select = ({ value, onChange, options, placeholder, style: sx = {} }) => (
  <div className="relative">
    <select
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      className={[
        "w-full h-9 pl-3 pr-8 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white outline-none appearance-none cursor-pointer box-border transition-colors duration-150",
        "focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
        value ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]",
      ].join(" ")}
      style={sx}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o =>
        typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
      <Icons.ChevDown />
    </div>
  </div>
);

// ─── TOGGLE (button group) ───────────────────────────────────────────────────
export const Toggle = ({ value, onChange, options }) => (
  <div className="flex">
    {options.map((o, i) => {
      const active = value === o;
      return (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={[
            "flex-1 h-9 px-3 text-sm border transition-colors duration-150 cursor-pointer",
            i === 0 ? "rounded-l-[var(--radius-md)]" : "-ml-px",
            i === options.length - 1 ? "rounded-r-[var(--radius-md)]" : "",
            active
              ? "bg-[var(--brand-600)] text-white border-[var(--brand-600)] font-semibold z-10 relative"
              : "bg-white text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-sunken)]",
          ].join(" ")}
        >
          {o}
        </button>
      );
    })}
  </div>
);

// ─── TOGGLE SWITCH ───────────────────────────────────────────────────────────
// Standard: track w-11 h-6, thumb w-5 h-5, translate-x-0.5 / translate-x-5
export const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={[
      "relative w-11 h-6 rounded-full border-none cursor-pointer flex-shrink-0 transition-colors duration-200",
      "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      checked ? "bg-[var(--brand-600)]" : "bg-[var(--border-default)]",
    ].join(" ")}
  >
    <div
      className={[
        "absolute top-[2px] left-0 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200",
        checked ? "translate-x-5" : "translate-x-0.5",
      ].join(" ")}
    />
  </button>
);

// ─── SWITCH ──────────────────────────────────────────────────────────────────
export const Switch = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={[
      "relative w-11 h-6 rounded-full border-none cursor-pointer flex-shrink-0 transition-colors duration-200",
      "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
      checked ? "bg-[var(--brand-600)]" : "bg-[var(--border-default)]",
    ].join(" ")}
  >
    <div
      className={[
        "absolute top-[2px] left-0 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200",
        checked ? "translate-x-5" : "translate-x-0.5",
      ].join(" ")}
    />
  </button>
);

// ─── SLIDE TOGGLE ────────────────────────────────────────────────────────────
export const SlideToggle = ({ value, onChange }) => (
  <div className="flex items-center gap-2.5">
    <span
      className={[
        "text-xs font-bold min-w-[24px] text-right",
        value ? "text-[var(--text-tertiary)]" : "text-[var(--danger-600)]",
      ].join(" ")}
    >
      No
    </span>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={[
        "relative w-11 h-6 rounded-full border-none cursor-pointer flex-shrink-0 transition-colors duration-200",
        "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
        value ? "bg-[var(--success-600)]" : "bg-[var(--border-default)]",
      ].join(" ")}
    >
      <div
        className={[
          "absolute top-[2px] left-0 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200",
          value ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
    <span
      className={[
        "text-xs font-bold min-w-[24px]",
        value ? "text-[var(--success-600)]" : "text-[var(--text-tertiary)]",
      ].join(" ")}
    >
      Yes
    </span>
  </div>
);

// ─── CHECKBOX ────────────────────────────────────────────────────────────────
export const Checkbox = ({ checked, onChange, label }) => (
  <label className="flex items-start gap-2.5 cursor-pointer mb-2">
    <div
      onClick={() => onChange(!checked)}
      className={[
        "w-[18px] h-[18px] min-w-[18px] mt-0.5 border-2 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors duration-150",
        checked
          ? "bg-[var(--brand-600)] border-[var(--brand-600)] text-white"
          : "bg-white border-[var(--border-default)]",
      ].join(" ")}
    >
      {checked && <Icons.Check />}
    </div>
    <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{label}</span>
  </label>
);

// ─── BUTTON ──────────────────────────────────────────────────────────────────
const BTN_SIZES = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
};
const BTN_VARIANTS = {
  primary: "bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white border border-transparent",
  accent:  "bg-[var(--info-600)] hover:bg-[var(--info-700)] text-white border border-transparent",
  success: "bg-[var(--success-600)] hover:bg-[var(--success-700)] text-white border border-transparent",
  dark:    "bg-[var(--surface-dark)] hover:bg-[var(--surface-dark-2)] text-white border border-transparent",
  outline: "bg-white border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
  ghost:   "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] border border-transparent",
  danger:  "bg-[var(--danger-50)] text-[var(--danger-600)] border border-[var(--danger-100)] hover:bg-[var(--danger-100)]",
};

export const Btn = ({ onClick, children, variant = "primary", size = "md", disabled, icon, className = "", style: sx = {}, type = "button" }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={[
      "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] font-medium whitespace-nowrap",
      "transition-colors duration-150",
      "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      BTN_SIZES[size] || BTN_SIZES.md,
      BTN_VARIANTS[variant] || BTN_VARIANTS.primary,
      className,
    ].join(" ")}
    style={sx}
  >
    {icon}
    {children}
  </button>
);

// ─── TAG ─────────────────────────────────────────────────────────────────────
export const Tag = ({ children, color = "#1A1A1A" }) => (
  <span
    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
    style={{ background: color + "18", color }}
  >
    {children}
  </span>
);

// ─── RIBBON ──────────────────────────────────────────────────────────────────
const RIBBON_COLORS = {
  Draft:    "var(--text-tertiary)",
  Sent:     "var(--info-600)",
  Paid:     "var(--success-600)",
  Overdue:  "var(--danger-600)",
  Partial:  "var(--warning-600)",
  Accepted: "var(--success-600)",
  Declined: "var(--danger-600)",
  Invoiced: "var(--brand-500)",
  Expired:  "var(--warning-600)",
  Pending:  "var(--text-tertiary)",
};
export const Ribbon = ({ status }) => {
  const color = RIBBON_COLORS[status] || "var(--text-tertiary)";
  return (
    <div className="absolute top-0 right-0 w-[88px] h-[88px] overflow-hidden z-10 pointer-events-none">
      <div
        className="absolute top-[22px] -right-[26px] w-[110px] text-white text-center py-1 rotate-45 shadow-[var(--shadow-md)]"
        style={{
          background: color,
          fontSize: 9,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {status}
      </div>
    </div>
  );
};

// ─── STATUS BADGE (new) ──────────────────────────────────────────────────────
const NEUTRAL   = { bg: "var(--neutral-50)", text: "var(--neutral-600)",   dot: "var(--neutral-600)" };
const INFO      = { bg: "var(--info-50)",    text: "var(--info-700)",      dot: "var(--info-600)" };
const SUCCESS   = { bg: "var(--success-50)", text: "var(--success-700)",   dot: "var(--success-600)" };
const DANGER    = { bg: "var(--danger-50)",  text: "var(--danger-700)",    dot: "var(--danger-600)" };
const WARNING   = { bg: "var(--warning-50)", text: "var(--warning-700)",   dot: "var(--warning-600)" };
const BRAND     = { bg: "var(--brand-50)",   text: "var(--brand-700)",     dot: "var(--brand-500)" };
const MUTED     = { bg: "var(--neutral-50)", text: "var(--text-tertiary)", dot: "var(--text-disabled)" };

const STATUS_BADGE_STYLES = {
  // invoice + bill lifecycle
  Draft:    NEUTRAL,
  Sent:     INFO,
  Paid:     SUCCESS,
  Overdue:  DANGER,
  Partial:  WARNING,
  "Partially Paid": WARNING,
  Void:     MUTED,
  Voided:   MUTED,
  // quote lifecycle
  Accepted: SUCCESS,
  Declined: DANGER,
  Invoiced: BRAND,
  Expired:  WARNING,
  Pending:  NEUTRAL,
  // payments
  Reconciled: SUCCESS,
  Refunded:   DANGER,
  // generic workflow
  Submitted:  INFO,
  Approved:   SUCCESS,
  Finalized:  SUCCESS,
  Reimbursed: BRAND,
  "Awaiting Approval": WARNING,
  // entities
  Active:      SUCCESS,
  Inactive:    NEUTRAL,
  Business:    INFO,
  Individual:  NEUTRAL,
  Leaver:      MUTED,
};
export const StatusBadge = ({ status }) => {
  const s = STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.Draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm)] text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {status}
    </span>
  );
};

// ─── SECTION CARD ────────────────────────────────────────────────────────────
export const SectionCard = ({ title, subtitle, children }) => (
  <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] p-5 mb-3.5">
    {(title || subtitle) && (
      <div className="mb-3.5">
        {title && <div className="text-sm font-bold text-[var(--text-primary)]">{title}</div>}
        {subtitle && <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{subtitle}</div>}
      </div>
    )}
    {children}
  </div>
);

// ─── INFO BOX ────────────────────────────────────────────────────────────────
export const InfoBox = ({ children, color = "var(--info-600)" }) => (
  <div
    className="flex gap-2 px-3 py-2.5 rounded-[var(--radius-md)] border-l-4 mt-2"
    style={{
      background: `color-mix(in srgb, ${color} 8%, transparent)`,
      borderLeftColor: color,
      color,
    }}
  >
    <div className="mt-0.5 flex-shrink-0">
      <Icons.Info />
    </div>
    <p className="m-0 text-xs leading-relaxed" style={{ color }}>
      {children}
    </p>
  </div>
);

// ─── EXPAND SECTION ──────────────────────────────────────────────────────────
export const ExpandSection = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[var(--border-subtle)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3.5 bg-transparent border-none cursor-pointer text-sm font-semibold text-[var(--text-secondary)]"
      >
        {title}
        <span
          className={[
            "flex text-[var(--text-tertiary)] transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          <Icons.ChevDown />
        </span>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
};

// ─── ADDRESS FORM ────────────────────────────────────────────────────────────
export const AddressForm = ({ address = {}, onChange, label }) => {
  const u = (k, v) => onChange({ ...address, [k]: v });
  return (
    <div>
      {label && (
        <div className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2.5">
          {label}
        </div>
      )}
      <Field label="Street">
        <Input value={address.street} onChange={v => u("street", v)} placeholder="123 High Street" />
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="City">
          <Input value={address.city} onChange={v => u("city", v)} placeholder="London" />
        </Field>
        <Field label="County / State">
          <Input value={address.county} onChange={v => u("county", v)} placeholder="Greater London" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Postcode / ZIP">
          <Input value={address.postcode} onChange={v => u("postcode", v)} placeholder="EC1A 1BB" />
        </Field>
        <Field label="Country">
          <Select
            value={address.country}
            onChange={v => u("country", v)}
            options={["United Kingdom", "Australia", "Austria", "Belgium", "Brazil", "Canada", "United States"]}
            placeholder="Select…"
          />
        </Field>
      </div>
    </div>
  );
};

// ─── PAYMENT TERMS FIELD ─────────────────────────────────────────────────────
export const PaymentTermsField = ({ value, onChange, customDays, onCustomDaysChange }) => {
  const PAYMENT_TERMS_OPTS = ["Due on Receipt", "Net 7", "Net 14", "Net 30", "Net 60", "Net 90", "Custom"];
  return (
    <div>
      <Select value={value} onChange={onChange} options={PAYMENT_TERMS_OPTS} />
      {value === "Custom" && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={customDays}
            onChange={onCustomDaysChange}
            type="number"
            placeholder="e.g. 45"
            style={{ maxWidth: 90 }}
          />
          <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
            days from invoice date
          </span>
        </div>
      )}
    </div>
  );
};
