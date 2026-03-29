import { ff } from "../../constants";
import { Icons } from "../icons";

export const moduleUi = {
  page: {
    padding: "clamp(16px,3vw,30px) clamp(12px,3.2vw,34px)",
    maxWidth: 1180,
    fontFamily: ff,
  },
  headerTitle: { fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" },
  helperText: { margin: "6px 0 0", fontSize: 13, color: "#64748b" },
  toolbar: {
    marginTop: 16,
    marginBottom: 14,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
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
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
    overflow: "hidden",
  },
  tableHead: { background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 },
  th: {
    padding: "11px 16px",
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  td: { padding: "13px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#334155" },
  empty: { padding: "56px 20px", textAlign: "center", color: "#94a3b8" },
  rowAction: {
    width: 28, height: 28, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: 4,
  },
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

export function SoftBadge({ children, color = "#475569", bg = "#e2e8f0" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 8, fontSize: 11, fontWeight: 700, color, background: bg }}>
      {children}
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
