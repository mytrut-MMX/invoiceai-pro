import { useState, useMemo, useContext, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import EmptyState from "../components/ui/EmptyState";
import { StatusBadge } from "../components/shared/moduleListUI";
import { upsert, fmt } from "../utils/helpers";
import { CUR_SYM } from "../constants";
import * as dataAccess from "../lib/dataAccess";
import EmployeeForm from "../modals/EmployeeModal";

// ─── DESIGN TOKENS (matches CustomersPage) ───────────────────────────────────
const T = {
  // surfaces
  pageBg:      "#f4f5f7",
  cardBg:      "#fff",
  cardBorder:  "1px solid #e8e8ec",
  cardRadius:  12,
  cardShadow:  "0 1px 4px rgba(0,0,0,0.05)",
  // table
  theadBg:     "#f9fafb",
  rowBorder:   "1px solid #f3f4f6",
  toolbarBorder:"1px solid #f0f0f4",
  cellPad:     "11px 16px",
  // text
  heading:     "#1a1a2e",
  body:        "#374151",
  muted:       "#6b7280",
  faint:       "#9ca3af",
  // status
  positive:    "#166534",
  negative:    "#b91c1c",
  // interactive
  rowHover:    "#f8faff",
  actionBorder:"#e8e8ec",
};

// Deterministic avatar palette keyed on name initial (same as CustomersPage)
const AVATAR_PALETTES = [
  { bg:"#eff6ff", fg:"#1d4ed8" },
  { bg:"#fef3c7", fg:"#92400e" },
  { bg:"#f0fdf4", fg:"#166534" },
  { bg:"#fdf4ff", fg:"#7e22ce" },
  { bg:"#fff1f2", fg:"#be123c" },
  { bg:"#f0f9ff", fg:"#0369a1" },
  { bg:"#fafaf9", fg:"#44403c" },
];
const avatarPalette = (name = "") =>
  AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];

const FREQ_LABELS = { weekly: "Weekly", fortnightly: "Fortnightly", monthly: "Monthly" };

// ─── SHARED SUB-COMPONENTS ───────────────────────────────────────────────────

function MetricCard({ label, value, sub, color = T.heading }) {
  return (
    <div style={{ background:T.cardBg, border:T.cardBorder, borderRadius:10, padding:"14px 18px", flex:"1 1 140px", minWidth:0 }}>
      <div style={{ fontSize:10, fontWeight:700, color:T.faint, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5 }}>
        {label}
      </div>
      <div style={{ fontSize:18, fontWeight:800, color, fontVariantNumeric:"tabular-nums", lineHeight:1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function EmployeeAvatar({ name }) {
  const { bg, fg } = avatarPalette(name);
  return (
    <div style={{
      width:30, height:30, borderRadius:"50%",
      background:bg, color:fg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:700, fontSize:12, flexShrink:0,
      fontFamily:ff,
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Annualise a salary value based on its type and frequency. */
function annualise(amount, salaryType, payFrequency) {
  const n = Number(amount || 0);
  if (salaryType === "annual") return n;
  // hourly → approximate annual (assume 37.5 hrs/week × 52)
  if (salaryType === "hourly") return n * 37.5 * 52;
  // Otherwise treat as periodic gross
  if (payFrequency === "weekly") return n * 52;
  if (payFrequency === "fortnightly") return n * 26;
  return n * 12; // monthly default
}

/** Monthly equivalent for cost card. */
function monthlyEquiv(amount, salaryType, payFrequency) {
  return annualise(amount, salaryType, payFrequency) / 12;
}

function formatSalary(currSym, amount, salaryType) {
  const n = Number(amount || 0);
  if (salaryType === "hourly") return `${currSym}${n.toLocaleString("en-GB", { minimumFractionDigits:2, maximumFractionDigits:2 })}/hr`;
  return `${currSym}${n.toLocaleString("en-GB", { minimumFractionDigits:0, maximumFractionDigits:0 })}/yr`;
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const { user, orgSettings } = useContext(AppCtx);
  const [searchParams, setSearchParams] = useSearchParams();
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Load employees on mount via dataAccess
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const data = await dataAccess.loadEmployees(user.id);
        if (!cancelled) setEmployees(data || []);
      } catch { /* no-op */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Filters driven by URL search params
  const search = searchParams.get("q") || "";
  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set("q", v) : n.delete("q"); return n; }, { replace: true });

  // ─── handlers ─────────────────────────────────────────────────────────────
  const deleteEmployee = (emp) => {
    const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "this employee";
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      setEmployees(p => p.filter(x => x.id !== emp.id));
      if (user?.id) dataAccess.deleteEmployee?.(user.id, emp.id);
    }
  };

  const openNew  = () => { setEditingEmployee(null); setShowForm(true); };
  const openEdit = (emp) => { setEditingEmployee(emp); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingEmployee(null); };
  const onSave = (emp) => { setEmployees(p => upsert(p, emp)); closeForm(); };

  // ─── filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return employees;
    return employees.filter(e =>
      `${e.first_name || ""} ${e.last_name || ""}`.toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.ni_number || "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  // ─── summary metrics ───────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const active = employees.filter(e => (e.status || "Active") !== "Leaver");
    const leavers = employees.length - active.length;
    let totalMonthlyCost = 0;
    let totalAnnual = 0;
    for (const e of active) {
      const annual = annualise(e.salary_amount, e.salary_type, e.pay_frequency);
      totalAnnual += annual;
      totalMonthlyCost += monthlyEquiv(e.salary_amount, e.salary_type, e.pay_frequency);
    }
    return {
      activeCount: active.length,
      totalMonthlyCost,
      avgSalary: active.length > 0 ? totalAnnual / active.length : 0,
      leavers,
    };
  }, [employees]);

  const hasSearch = search.length > 0;

  // ─── form ──────────────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <EmployeeForm
        existing={editingEmployee}
        onClose={closeForm}
        onSave={onSave}
      />
    );
  }

  // ─── loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, background:T.pageBg, minHeight:"100vh", fontFamily:ff }}>
        <div style={{ textAlign:"center", padding:"80px 24px", color:T.muted, fontSize:14 }}>Loading employees…</div>
      </div>
    );
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, background:T.pageBg, minHeight:"100vh", fontFamily:ff }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:T.heading, margin:"0 0 3px" }}>Employees</h1>
          <p style={{ color:T.muted, fontSize:12, margin:0 }}>
            {employees.length} employee{employees.length !== 1 ? "s" : ""} · manage your team
          </p>
        </div>
        <Btn onClick={openNew} variant="primary" icon={<Icons.Plus />}>New Employee</Btn>
      </div>

      {/* Summary strip */}
      {employees.length > 0 && (
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          <MetricCard label="Active Employees" value={metrics.activeCount} color={T.heading} />
          <MetricCard label="Monthly Cost"     value={fmt(currSym, metrics.totalMonthlyCost)} color="#1d4ed8" />
          <MetricCard label="Avg. Salary"      value={fmt(currSym, metrics.avgSalary)} sub="annualised" color={T.positive} />
          <MetricCard label="Leavers"          value={metrics.leavers} color={metrics.leavers > 0 ? T.negative : T.faint} />
        </div>
      )}

      {/* Main card */}
      <div style={{ background:T.cardBg, borderRadius:T.cardRadius, border:T.cardBorder, boxShadow:T.cardShadow, overflow:"hidden" }}>

        {/* Toolbar */}
        <div style={{ padding:"10px 16px", borderBottom:T.toolbarBorder, display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, flex:1, minWidth:140, border:"1px solid #e8e8ec", borderRadius:8, padding:"7px 10px", background:"#f9fafb" }}>
            <span style={{ color:T.faint, display:"flex", flexShrink:0 }}><Icons.Search /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or NI number…"
              style={{ flex:1, border:"none", outline:"none", fontSize:13, color:T.heading, background:"transparent", fontFamily:ff }}
            />
            {hasSearch && (
              <button onClick={() => setSearch("")}
                style={{ background:"none", border:"none", cursor:"pointer", color:T.faint, fontSize:16, padding:0, lineHeight:1, display:"flex" }}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
            <thead>
              <tr style={{ background:T.theadBg, borderBottom:T.toolbarBorder }}>
                {[
                  { label:"Employee",  align:"left"  },
                  { label:"Role/Type", align:"left"  },
                  { label:"NI Number", align:"left"  },
                  { label:"Tax Code",  align:"left"  },
                  { label:"Salary",    align:"right" },
                  { label:"Status",    align:"left"  },
                  { label:"",          align:"right" },
                ].map(({ label, align }) => (
                  <th key={label} style={{
                    padding:"8px 16px",
                    textAlign:align,
                    fontSize:10, fontWeight:700,
                    color:T.faint,
                    textTransform:"uppercase", letterSpacing:"0.07em",
                    whiteSpace:"nowrap",
                  }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    {employees.length === 0 ? (
                      <EmptyState
                        icon={Icons.User}
                        title="No employees yet"
                        description="Add your first employee to start running payroll."
                        action={{ label: "New Employee", onClick: openNew, icon: <Icons.Plus /> }}
                      />
                    ) : (
                      <EmptyState
                        icon={Icons.Search}
                        title="No employees match your search"
                        description="Try a different name, email or NI number"
                        action={{ label: "Clear search", onClick: () => setSearch(""), variant: "outline" }}
                      />
                    )}
                  </td>
                </tr>
              ) : filtered.map(emp => {
                const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Unnamed";
                const status = emp.status || "Active";

                return (
                  <tr
                    key={emp.id}
                    style={{ borderBottom:T.rowBorder, transition:"background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    {/* Employee */}
                    <td style={{ padding:T.cellPad, minWidth:180 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <EmployeeAvatar name={fullName} />
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:T.heading, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {fullName}
                          </div>
                          {emp.email && (
                            <div style={{ fontSize:11, color:T.muted, marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:180 }}>
                              {emp.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role/Type */}
                    <td style={{ padding:T.cellPad, whiteSpace:"nowrap" }}>
                      <span style={{ fontSize:13, color:T.body }}>
                        {FREQ_LABELS[emp.pay_frequency] || "Monthly"}
                      </span>
                    </td>

                    {/* NI Number */}
                    <td style={{ padding:T.cellPad, whiteSpace:"nowrap" }}>
                      <span style={{ fontSize:13, color:T.body, fontFamily:"'Courier New', Courier, monospace", letterSpacing:"0.04em" }}>
                        {emp.ni_number || "—"}
                      </span>
                    </td>

                    {/* Tax Code */}
                    <td style={{ padding:T.cellPad, whiteSpace:"nowrap" }}>
                      {emp.tax_code ? (
                        <StatusBadge status={emp.tax_code} />
                      ) : (
                        <span style={{ fontSize:13, color:T.faint }}>—</span>
                      )}
                    </td>

                    {/* Salary */}
                    <td style={{ padding:T.cellPad, textAlign:"right", whiteSpace:"nowrap" }}>
                      <span style={{ fontSize:13, fontWeight:600, color:T.heading, fontVariantNumeric:"tabular-nums" }}>
                        {emp.salary_amount ? formatSalary(currSym, emp.salary_amount, emp.salary_type) : "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding:T.cellPad, whiteSpace:"nowrap" }}>
                      <StatusBadge status={status} />
                    </td>

                    {/* Actions */}
                    <td style={{ padding:T.cellPad, textAlign:"right", whiteSpace:"nowrap" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>
                        <button
                          onClick={() => openEdit(emp)}
                          title="Edit employee"
                          style={{ background:"none", border:`1px solid ${T.actionBorder}`, borderRadius:6, padding:"5px 7px", cursor:"pointer", color:T.muted, display:"flex", alignItems:"center", transition:"all 0.12s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor="#1e6be0"; e.currentTarget.style.color="#1e6be0"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor=T.actionBorder; e.currentTarget.style.color=T.muted; }}
                        ><Icons.Edit /></button>
                        <button
                          onClick={() => deleteEmployee(emp)}
                          title="Delete employee"
                          style={{ background:"none", border:`1px solid ${T.actionBorder}`, borderRadius:6, padding:"5px 7px", cursor:"pointer", color:T.muted, display:"flex", alignItems:"center", transition:"all 0.12s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor="#fecaca"; e.currentTarget.style.color=T.negative; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor=T.actionBorder; e.currentTarget.style.color=T.muted; }}
                        ><Icons.Trash /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && employees.length > 0 && (
          <div style={{ padding:"8px 16px", borderTop:T.toolbarBorder, fontSize:11, color:T.faint, textAlign:"right" }}>
            {hasSearch ? `${filtered.length} of ${employees.length}` : employees.length} employee{employees.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
