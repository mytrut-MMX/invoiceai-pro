import { Icons } from "../icons";
import { StatusBadge as AtomStatusBadge } from "../atoms";

/**
 * Shared list-page UI helpers. This file serves two audiences:
 *
 *  1. Tailwind-first pages (InvoiceListView and others rewritten in F4) —
 *     use Btn, StatusBadge, Pagination directly and ignore this file. The
 *     new list helpers (ListPageShell, ListTh, ListActionBtn, etc.) exported
 *     below are Tailwind components built on design tokens.
 *
 *  2. Legacy pages that still spread `...moduleUi.foo` into inline styles.
 *     Those pages continue to work — the `moduleUi` object below now uses
 *     CSS custom-property values (var(--token)) so the visual language
 *     matches the rest of the app even without a full rewrite.
 */

// ───────────────────────────────────────────────────────────────────────────
// Legacy: CSS-in-JS style object used by pages not yet rewritten to Tailwind.
// Kept for backward compatibility. Prefer Tailwind classes for new code.
// ───────────────────────────────────────────────────────────────────────────

export const moduleUi = {
  pageCanvas: {
    background: "var(--surface-page)",
    minHeight: "100vh",
  },
  page: {
    width: "100%",
    padding: "clamp(18px,3.2vw,32px)",
    maxWidth: 1280,
    margin: "0 auto",
    minHeight: "100vh",
  },
  sectionStack: { display: "grid", gap: 14 },
  focusRing: { outline: "2px solid var(--brand-600)", outlineOffset: 2 },
  pageHeaderWrap: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  pageTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
    color: "var(--text-primary)",
  },
  helperText: {
    margin: "4px 0 0",
    fontSize: 14,
    lineHeight: 1.5,
    color: "var(--text-secondary)",
    maxWidth: 780,
  },
  countPill: {
    display: "inline-flex",
    alignItems: "center",
    marginLeft: 8,
    borderRadius: 999,
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-card)",
    color: "var(--text-secondary)",
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 9px",
    verticalAlign: "middle",
  },
  toolbar: {
    padding: 12,
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-card)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  toolbarLeft: { display: "flex", alignItems: "center", gap: 10, flex: "1 1 320px", flexWrap: "wrap" },
  toolbarRight: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 240,
    maxWidth: 380,
    flex: 1,
    padding: "8px 12px",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
    background: "var(--surface-sunken)",
    color: "var(--text-tertiary)",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 14,
    lineHeight: 1.35,
    background: "transparent",
    color: "var(--text-primary)",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
  },
  summaryCard: {
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: 16,
    boxShadow: "var(--shadow-sm)",
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--text-tertiary)",
    fontWeight: 600,
  },
  summaryValue: {
    fontSize: 18,
    marginTop: 4,
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.2,
    fontVariantNumeric: "tabular-nums",
  },
  summaryHint: { fontSize: 11, color: "var(--text-tertiary)", marginTop: 3 },
  tableCard: {
    background: "var(--surface-card)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    boxShadow: "var(--shadow-sm)",
    overflow: "hidden",
  },
  card: {
    background: "var(--surface-card)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    boxShadow: "var(--shadow-sm)",
    overflow: "hidden",
  },
  tableScroller: { overflowX: "auto" },
  tableHead: {
    background: "var(--surface-sunken)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  stickyHead: { position: "sticky", top: 0, zIndex: 2 },
  th: {
    padding: "10px 16px",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    borderBottom: "1px solid var(--border-subtle)",
    whiteSpace: "nowrap",
    textAlign: "left",
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--border-subtle)",
    fontSize: 14,
    color: "var(--text-primary)",
    verticalAlign: "middle",
  },
  primaryText: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--text-primary)",
    lineHeight: 1.3,
  },
  secondaryText: {
    fontSize: 12,
    color: "var(--text-tertiary)",
    marginTop: 2,
  },
  moneyCell: {
    textAlign: "right",
    fontWeight: 500,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
  rowHover: { transition: "background-color 150ms ease" },
  empty: { padding: "56px 20px", textAlign: "center", color: "var(--text-secondary)" },
  emptyIcon: {
    display: "inline-flex",
    width: 44,
    height: 44,
    borderRadius: "var(--radius-lg)",
    background: "var(--surface-sunken)",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-tertiary)",
    marginBottom: 10,
  },
};

// Legacy theme map — kept for pages still importing it.
// StatusBadge itself now routes through atoms; this object is only a
// compatibility shim if anything still looks up colors directly.
const TOKEN_TONE = {
  Draft:    { bg: "var(--neutral-50)", color: "var(--neutral-600)",   border: "var(--border-subtle)" },
  Sent:     { bg: "var(--info-50)",    color: "var(--info-700)",      border: "var(--info-100)" },
  Accepted: { bg: "var(--success-50)", color: "var(--success-700)",   border: "var(--success-100)" },
  Invoiced: { bg: "var(--brand-50)",   color: "var(--brand-700)",     border: "var(--brand-100)" },
  Expired:  { bg: "var(--warning-50)", color: "var(--warning-700)",   border: "var(--warning-100)" },
  Paid:     { bg: "var(--success-50)", color: "var(--success-700)",   border: "var(--success-100)" },
  Overdue:  { bg: "var(--danger-50)",  color: "var(--danger-700)",    border: "var(--danger-100)" },
  Partial:  { bg: "var(--warning-50)", color: "var(--warning-700)",   border: "var(--warning-100)" },
  Void:     { bg: "var(--neutral-50)", color: "var(--text-tertiary)", border: "var(--border-subtle)" },
  Voided:   { bg: "var(--neutral-50)", color: "var(--text-tertiary)", border: "var(--border-subtle)" },
  Reconciled: { bg: "var(--success-50)", color: "var(--success-700)", border: "var(--success-100)" },
  Pending:  { bg: "var(--neutral-50)", color: "var(--neutral-600)",   border: "var(--border-subtle)" },
  Refunded: { bg: "var(--danger-50)",  color: "var(--danger-700)",    border: "var(--danger-100)" },
  Submitted:{ bg: "var(--info-50)",    color: "var(--info-700)",      border: "var(--info-100)" },
  Finalized:{ bg: "var(--success-50)", color: "var(--success-700)",   border: "var(--success-100)" },
  Approved: { bg: "var(--success-50)", color: "var(--success-700)",   border: "var(--success-100)" },
  Reimbursed:{ bg: "var(--brand-50)",  color: "var(--brand-700)",     border: "var(--brand-100)" },
  Active:   { bg: "var(--success-50)", color: "var(--success-700)",   border: "var(--success-100)" },
  Inactive: { bg: "var(--neutral-50)", color: "var(--neutral-600)",   border: "var(--border-subtle)" },
  Business: { bg: "var(--info-50)",    color: "var(--info-700)",      border: "var(--info-100)" },
  Individual:{ bg: "var(--neutral-50)",color: "var(--neutral-600)",   border: "var(--border-subtle)" },
  "Awaiting Approval": { bg: "var(--warning-50)", color: "var(--warning-700)", border: "var(--warning-100)" },
  Leaver:   { bg: "var(--neutral-50)", color: "var(--text-tertiary)", border: "var(--border-subtle)" },
};
export const statusBadgeTheme = TOKEN_TONE;

// ───────────────────────────────────────────────────────────────────────────
// Components — Tailwind + tokens
// ───────────────────────────────────────────────────────────────────────────

export function ModulePageHeader({ title, subtitle, helper, count, right, countLabel = "records" }) {
  const helperText = subtitle || helper;
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">
          {title}
          {typeof count === "number" && (
            <span className="inline-flex items-center ml-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] text-[11px] font-semibold px-2 py-0.5 align-middle">
              {count.toLocaleString()} {countLabel}
            </span>
          )}
        </h1>
        {helperText && (
          <p className="text-sm text-[var(--text-secondary)] mt-1 m-0 max-w-[780px]">{helperText}</p>
        )}
      </div>
      {right}
    </div>
  );
}

export function ModuleToolbar({ search, filters, right }) {
  return (
    <div className="p-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] flex items-center justify-between gap-2.5 flex-wrap">
      <div className="flex items-center gap-2.5 flex-[1_1_320px] flex-wrap">
        {search}
        {filters}
      </div>
      {right ? <div className="flex items-center gap-2 flex-wrap">{right}</div> : null}
    </div>
  );
}

export function ModuleStatsRow({ items = [] }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            {item.label}
          </div>
          <div
            className="text-lg font-semibold mt-1 tabular-nums leading-tight"
            style={{ color: item.color || "var(--text-primary)" }}
          >
            {item.value}
          </div>
          {item.helper ? <div className="text-[11px] text-[var(--text-tertiary)] mt-1">{item.helper}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function ModuleTableCard({ children, minWidth, stickyHeader = false }) {
  return (
    <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={minWidth ? { minWidth } : undefined}>
          {typeof children === "function" ? children({ stickyHeader }) : children}
        </table>
      </div>
    </div>
  );
}

// StatusBadge — delegates to atoms so all pages share one source of truth.
export function StatusBadge({ status }) {
  return <AtomStatusBadge status={status} />;
}

export function EmptyStatePanel({ icon, title = "Nothing to show", message, text, cta }) {
  const content = message || text;
  return (
    <div className="py-14 px-5 text-center">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] text-[var(--text-tertiary)] mb-2.5">
        {icon || <Icons.Info />}
      </div>
      {title && <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</div>}
      {content && <div className="text-sm text-[var(--text-secondary)]">{content}</div>}
      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}

export function PageSectionCard({ children, className = "" }) {
  return (
    <section
      className={`bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] p-4 ${className}`}
    >
      {children}
    </section>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", ariaLabel = "Search" }) {
  return (
    <label className="flex items-center gap-2 min-w-[240px] max-w-[380px] flex-1 px-3 h-9 border border-[var(--border-subtle)] rounded-[var(--radius-md)] bg-[var(--surface-sunken)] text-[var(--text-tertiary)]">
      <Icons.Search />
      <input
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 border-none outline-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
      />
    </label>
  );
}

// Backward-compatible aliases
export const ModuleHeader = ModulePageHeader;
export const EmptyState = EmptyStatePanel;
export const moduleSelectStyles = {
  select: {
    height: 36,
    padding: "0 10px",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    fontSize: 13,
    background: "var(--surface-card)",
    color: "var(--text-primary)",
  },
};
