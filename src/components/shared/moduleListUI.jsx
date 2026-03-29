import { ff } from "../../constants";
import { Icons } from "../icons";

export const statusBadgeTheme = {
  Draft: { color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
  Sent: { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  Accepted: { color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  Invoiced: { color: "#6d28d9", bg: "#f5f3ff", border: "#d8b4fe" },
  Expired: { color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  Paid: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  Overdue: { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  Partial: { color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  Void: { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  Reconciled: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  Pending: { color: "#475569", bg: "#f8fafc", border: "#cbd5e1" },
  Refunded: { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  Submitted: { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  Approved: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  Reimbursed: { color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe" },
  Active: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  Inactive: { color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
};

export const moduleUi = {
  page: {
    width: "100%",
    padding: "clamp(18px,3.2vw,34px)",
    maxWidth: 1240,
    margin: "0 auto",
    fontFamily: ff,
    minHeight: "100vh",
  },
  pageCanvas: {
    background: "#f1f5f9",
    minHeight: "100vh",
  },
  sectionStack: {
    display: "grid",
    gap: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" },
  helperText: { margin: "6px 0 0", fontSize: 13, color: "#64748b" },
  toolbar: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #dbe4ee",
    background: "#ffffff",jn 
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
    gap: 12,
  },
  summaryCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: "13px 14px",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 220,
    maxWidth: 360,
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #dbe4ee",
    borderRadius: 10,
    background: "#fff",
  },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#0f172a", fontFamily: ff },
  card: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
    overflow: "hidden",
  },
  tableHead: { background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 },
  th: {
    padding: "10px 16px",
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  td: { padding: "13px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#334155" },
  primaryText: { fontSize: 13, fontWeight: 700, color: "#0f172a" },
  secondaryText: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  moneyCell: { textAlign: "right", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" },
  rowHover: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background-color 140ms ease",
  },
  empty: { padding: "60px 20px", textAlign: "center", color: "#94a3b8" },
};

export function ModuleHeader({ title, helper, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div>
        <h1 style={moduleUi.headerTitle}>{title}</h1>
        <p style={moduleUi.helperText}>{helper}</p>
      </div>
      {right}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div style={moduleUi.searchWrap}>
      <Icons.Search />
      <input value={value} onChange={onChange} placeholder={placeholder} style={moduleUi.searchInput} />
    </div>
  );
}

export function StatusBadge({ status }) {
  const tone = statusBadgeTheme[status] || { color: "#64748b", bg: "#f8fafc", border: "#cbd5e1" };
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
        padding: "3px 10px",
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

export function EmptyState({ icon, text, cta }) {
  return (
    <div style={moduleUi.empty}>
      <div style={{ display: "inline-flex", width: 42, height: 42, borderRadius: 12, background: "#f1f5f9", alignItems: "center", justifyContent: "center", color: "#64748b", marginBottom: 10 }}>
        {icon || <Icons.Info />}
      </div>
      <div style={{ fontSize: 13 }}>{text}</div>
      {cta && <div style={{ marginTop: 12 }}>{cta}</div>}
    </div>
  );
}
