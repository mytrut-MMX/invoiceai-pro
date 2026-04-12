import { ff } from "../../constants";
import { Icons } from "../icons";

const defaultBadgeTone = { color: "#475569", bg: "#f8fafc", border: "#dbe3ee" };

export const statusBadgeTheme = {
  Draft: { color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
  Sent: { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  Accepted: { color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  Invoiced: { color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe" },
  Expired: { color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  Paid: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  Overdue: { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  Partial: { color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  Void: { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  Voided: { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  Reconciled: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  Pending: { color: "#475569", bg: "#f8fafc", border: "#cbd5e1" },
  Refunded: { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  Submitted: { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  Approved: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  Reimbursed: { color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe" },
  Active: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  Inactive: { color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
  Business: { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  Individual: { color: "#6b7280", bg: "#f8fafc", border: "#dbe3ee" },
  "Awaiting Approval": { color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  Leaver: { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
};

export const moduleUi = {
  ageCanvas: { background: "#f3f6fb", minHeight: "100vh" },
  page: { width: "100%", padding: "clamp(18px,3.2vw,34px)", maxWidth: 1260, margin: "0 auto", fontFamily: ff, minHeight: "100vh" },
  sectionStack: { display: "grid", gap: 14 },
  focusRing: { outline: "2px solid #2563eb", outlineOffset: 2 },
  pageHeaderWrap: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  pageTitle: { margin: 0, fontSize: "clamp(1.4rem,2.4vw,1.72rem)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em", color: "#0f172a" },
  helperText: { margin: "6px 0 0", fontSize: 13, lineHeight: 1.45, color: "#64748b", maxWidth: 780 },
  countPill: {
    display: "inline-flex",
    alignItems: "center",
    marginLeft: 8,
    borderRadius: 999,
    border: "1px solid #dbe4ee",
    background: "#ffffff",
    color: "#475569",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 9px",
    verticalAlign: "middle",
  },
  toolbar: {
    padding: "12px",
    borderRadius: 12,
    border: "1px solid #dbe4ee",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  stoolbarLeft: { display: "flex", alignItems: "center", gap: 10, flex: "1 1 320px", flexWrap: "wrap" },
  toolbarRight: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 240,
    maxWidth: 380,
    flex: 1,
    padding: "9px 12px",
    border: "1px solid #dbe4ee",
    borderRadius: 10,
    background: "#fff",
    color: "#64748b",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 13,
    lineHeight: 1.35,
    background: "transparent",
    color: "#0f172a",
    fontFamily: ff,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
  },
  summaryCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "13px 14px",
  },
  summaryLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 700 },
  summaryValue: { fontSize: 22, marginTop: 4, fontWeight: 800, color: "#0f172a", lineHeight: 1.15 },
  summaryHint: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  tableCard: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    boxShadow: "0 6px 20px rgba(15,23,42,0.06)",
    overflow: "hidden",
  },
  tableScroller: { overflowX: "auto" },
  tableHead: { background: "#f8fafc" },
  stickyHead: { position: "sticky", top: 0, zIndex: 2 },
  th: {
    padding: "11px 16px",
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
    textAlign: "left",
  },
  td: { padding: "14px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#334155", verticalAlign: "middle" },
  primaryText: { fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 },
  secondaryText: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  moneyCell: { textAlign: "right", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" },
  rowHover: { borderBottom: "1px solid #f1f5f9", transition: "background-color 140ms ease" },
  empty: { padding: "56px 20px", textAlign: "center", color: "#64748b" },
  emptyIcon: {
    display: "inline-flex",
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    marginBottom: 10,
  },
};

const controlStyles = {
  select: { padding: "8px 10px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 12, background: "#fff", fontFamily: ff, color: "#0f172a" },
};

export function ModulePageHeader({ title, subtitle, helper, count, right, countLabel = "records" }) {
  const helperText = subtitle || helper;
  return (
    <div style={moduleUi.pageHeaderWrap}>
      <div>
        <h1 style={moduleUi.pageTitle}>
          {title}
          {typeof count === "number" && <span style={moduleUi.countPill}>{count.toLocaleString()} {countLabel}</span>}
        </h1>
        {helperText && <p style={moduleUi.helperText}>{helperText}</p>}
      </div>
      {right}
    </div>
  );
}

export function ModuleToolbar({ search, filters, right, style }) {
  return (
    <div style={{ ...moduleUi.toolbar, ...style }}>
      <div style={moduleUi.toolbarLeft}>
        {search}
        {filters}
      </div>
      {right ? <div style={moduleUi.toolbarRight}>{right}</div> : null}
    </div>
  );
}

export function ModuleStatsRow({ items = [] }) {
  return (
    <div style={moduleUi.summaryGrid}>
      {items.map((item) => (
        <div key={item.label} style={moduleUi.summaryCard}>
          <div style={moduleUi.summaryLabel}>{item.label}</div>
          <div style={{ ...moduleUi.summaryValue, color: item.color || moduleUi.summaryValue.color }}>{item.value}</div>
          {item.helper ? <div style={moduleUi.summaryHint}>{item.helper}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function ModuleTableCard({ children, minWidth, stickyHeader = false, style }) {
  return (
    <div style={{ ...moduleUi.tableCard, ...style }}>
      <div style={moduleUi.tableScroller}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth }}>
          {typeof children === "function" ? children({ stickyHeader }) : children}
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const tone = statusBadgeTheme[status] || defaultBadgeTone;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        color: tone.color,
        padding: "4px 10px",
        minHeight: 24,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone.color }} />
      {status}
    </span>
  );
}

export function EmptyStatePanel({ icon, title = "Nothing to show", message, text, cta }) {
  const content = message || text;
  return (
    <div style={moduleUi.empty}>
      <div style={moduleUi.emptyIcon}>{icon || <Icons.Info />}</div>
      {title ? <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 700, marginBottom: 4 }}>{title}</div> : null}
      {content ? <div style={{ fontSize: 13 }}>{content}</div> : null}
      {cta ? <div style={{ marginTop: 12 }}>{cta}</div> : null}
    </div>
  );
}

export function PageSectionCard({ children, style }) {
  return <section style={{ ...moduleUi.tableCard, padding: 14, ...style }}>{children}</section>;
}

export function SearchInput({ value, onChange, placeholder = "Search…", ariaLabel = "Search" }) {
  return (
    <label style={moduleUi.searchWrap}>
      <Icons.Search />
      <input aria-label={ariaLabel} value={value} onChange={onChange} placeholder={placeholder} style={moduleUi.searchInput} />
    </label>
  );
}

// Backward-compatible aliases for existing module pages.
export const ModuleHeader = ModulePageHeader;
export const EmptyState = EmptyStatePanel;
export const moduleSelectStyles = controlStyles;
