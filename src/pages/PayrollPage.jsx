import { useState, useMemo, useEffect, useContext } from "react";
import { ff, CUR_SYM } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Input, Field } from "../components/atoms";
import { moduleUi, ModuleHeader, SearchInput, EmptyState, StatusBadge } from "../components/shared/moduleListUI";
import { fmt, fmtDate } from "../utils/helpers";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/shared/Pagination";
import * as dataAccess from "../lib/dataAccess";
import { createPayrollRun } from "../utils/payroll/payrollService";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: "all",       label: "All Runs" },
  { key: "draft",     label: "Draft" },
  { key: "approved",  label: "Approved" },
  { key: "submitted", label: "Submitted" },
  { key: "paid",      label: "Paid" },
];

/** Format a short date range e.g. "01 Apr – 30 Apr" */
function fmtRange(start, end) {
  const s = start ? new Date(start).toLocaleDateString("en-GB", { day:"2-digit", month:"short" }) : "—";
  const e = end   ? new Date(end).toLocaleDateString("en-GB", { day:"2-digit", month:"short" })   : "—";
  return `${s} – ${e}`;
}

/** Current tax year string e.g. "2025-26" */
function currentTaxYear() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const startYear = (m > 4 || (m === 4 && d >= 6)) ? y : y - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/** Previous tax year */
function prevTaxYear() {
  const cur = currentTaxYear();
  const startYear = parseInt(cur.split("-")[0], 10) - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/** Default period: 1st to last day of current month */
function defaultPeriod() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1).toISOString().split("T")[0];
  const end = new Date(y, m + 1, 0).toISOString().split("T")[0];
  // Last working day of month (skip Sat/Sun)
  const lastDay = new Date(y, m + 1, 0);
  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) lastDay.setDate(lastDay.getDate() - 1);
  const payDate = lastDay.toISOString().split("T")[0];
  return { start, end, payDate };
}

// ─── NEW RUN MODAL ──────────────────────────────────────────────────────────

function NewRunModal({ onClose, onCreate, creating, error }) {
  const defaults = defaultPeriod();
  const [periodStart, setPeriodStart] = useState(defaults.start);
  const [periodEnd, setPeriodEnd] = useState(defaults.end);
  const [payDate, setPayDate] = useState(defaults.payDate);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.35)" }}
      onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:14, padding:"24px 28px", width:420, maxWidth:"92vw", boxShadow:"0 12px 40px rgba(0,0,0,0.18)", fontFamily:ff }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize:17, fontWeight:700, color:"#1a1a2e", margin:"0 0 16px" }}>New Payroll Run</h3>

        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:12, color:"#b91c1c" }}>
            {error}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <Field label="Period Start">
            <Input value={periodStart} onChange={setPeriodStart} type="date" />
          </Field>
          <Field label="Period End">
            <Input value={periodEnd} onChange={setPeriodEnd} type="date" />
          </Field>
        </div>
        <div style={{ marginBottom:20 }}>
          <Field label="Pay Date">
            <Input value={payDate} onChange={setPayDate} type="date" />
          </Field>
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn variant="outline" onClick={onClose} disabled={creating}>Cancel</Btn>
          <Btn variant="primary" onClick={() => onCreate(periodStart, periodEnd, payDate)} disabled={creating || !periodStart || !periodEnd || !payDate}>
            {creating ? "Creating…" : "Create Run"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { user, orgSettings } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [runs, setRuns] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(currentTaxYear());
  const [showNewModal, setShowNewModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // ─── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const [runsData, empsData] = await Promise.all([
          dataAccess.loadPayrollRuns?.(user.id) ?? [],
          dataAccess.loadEmployees?.(user.id) ?? [],
        ]);
        if (!cancelled) {
          setRuns(runsData || []);
          setEmployeeCount((empsData || []).filter(e => (e.status || "active") === "active").length);
        }
      } catch { /* no-op */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ─── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...runs];
    if (statusFilter !== "all") {
      result = result.filter(r => r.status === statusFilter);
    }
    if (yearFilter) {
      result = result.filter(r => r.tax_year === yearFilter);
    }
    return result.sort((a, b) => new Date(b.pay_date) - new Date(a.pay_date));
  }, [runs, statusFilter, yearFilter]);

  const { page, setPage, totalPages, paginatedItems, totalItems, pageSize } = usePagination(filtered, 25);

  // ─── Metrics ───────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const thisMonth = runs.filter(r => r.pay_date >= monthStart && r.pay_date <= monthEnd);

    return {
      monthGross: thisMonth.reduce((s, r) => s + Number(r.total_gross || 0), 0),
      monthNet:   thisMonth.reduce((s, r) => s + Number(r.total_net || 0), 0),
      payeDue:    runs.filter(r => r.status !== "paid").reduce((s, r) => s + Number(r.total_tax || 0) + Number(r.total_ni_employee || 0) + Number(r.total_ni_employer || 0), 0),
    };
  }, [runs]);

  const hasFilters = statusFilter !== "all" || yearFilter !== currentTaxYear();

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateRun = async (periodStart, periodEnd, payDate) => {
    setCreating(true);
    setCreateError("");
    const result = await createPayrollRun(user.id, periodStart, periodEnd, payDate);
    setCreating(false);
    if (result.error) { setCreateError(result.error); return; }
    setRuns(prev => [result.run, ...prev]);
    setShowNewModal(false);
    console.log("Created payroll run:", result.run?.id, "— detail view coming in 16D");
  };

  const handleDelete = (run) => {
    if (run.status !== "draft") return;
    if (!window.confirm("Delete this draft payroll run? This cannot be undone.")) return;
    setRuns(prev => prev.filter(r => r.id !== run.id));
    if (user?.id) dataAccess.deletePayrollRun?.(user.id, run.id);
  };

  const handleViewRun = (run) => {
    console.log("Navigate to payroll run detail:", run.id, "— view coming in 16D");
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={moduleUi.pageCanvas}>
        <div style={{ ...moduleUi.page, maxWidth:1320, fontFamily:ff }}>
          <div style={{ textAlign:"center", padding:"80px 24px", color:"#94a3b8", fontSize:14 }}>Loading payroll…</div>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const cols = ["Pay Date", "Period", "Status", "Employees", "Gross", "Tax + NI", "Net", ""];

  return (
    <div style={moduleUi.pageCanvas}>
      <div style={{ ...moduleUi.page, maxWidth:1320, fontFamily:ff }}>
        <ModuleHeader
          title="Payroll"
          helper={`${runs.length} payroll run${runs.length !== 1 ? "s" : ""} · manage employee pay and HMRC submissions`}
          right={
            <Btn variant="primary" icon={<Icons.Plus />}
              disabled={employeeCount === 0}
              onClick={() => { setCreateError(""); setShowNewModal(true); }}>
              New Payroll Run
            </Btn>
          }
        />

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginTop:16, marginBottom:10 }}>
          {[
            { label: "This Month Gross", value: fmt(currSym, metrics.monthGross), color: "#0f172a" },
            { label: "This Month Net",   value: fmt(currSym, metrics.monthNet),   color: "#059669" },
            { label: "PAYE Due to HMRC", value: fmt(currSym, metrics.payeDue),    color: "#dc2626" },
            { label: "Active Employees", value: employeeCount,                     color: "#1d4ed8" },
          ].map(c => (
            <div key={c.label} style={moduleUi.summaryCard}>
              <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", color:"#94a3b8", fontWeight:700 }}>{c.label}</div>
              <div style={{ fontSize:20, marginTop:4, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ ...moduleUi.toolbar, marginTop:10, marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", flex:1 }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding:"8px 10px", border:"1px solid #dbe4ee", borderRadius:10, fontSize:12, background:"#fff", fontFamily:ff }}>
              {STATUS_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
              style={{ padding:"8px 10px", border:"1px solid #dbe4ee", borderRadius:10, fontSize:12, background:"#fff", fontFamily:ff }}>
              <option value={currentTaxYear()}>{currentTaxYear()}</option>
              <option value={prevTaxYear()}>{prevTaxYear()}</option>
            </select>
            {hasFilters && <Btn variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setYearFilter(currentTaxYear()); }}>Clear filters</Btn>}
            <span style={{ fontSize:12, color:"#9ca3af" }}>{filtered.length} run{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Table */}
        <div style={{ ...moduleUi.tableCard, flex:1, overflowY:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:780 }}>
            <thead>
              <tr style={{ ...moduleUi.tableHead, position:"sticky", top:0, zIndex:1 }}>
                {cols.map(h => (
                  <th key={h} style={{ ...moduleUi.th, textAlign: ["Gross","Tax + NI","Net","Employees"].includes(h) ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(run => {
                const totalTaxNI = Number(run.total_tax || 0) + Number(run.total_ni_employee || 0) + Number(run.total_ni_employer || 0);
                const statusLabel = (run.status || "draft").charAt(0).toUpperCase() + (run.status || "draft").slice(1);

                return (
                  <tr key={run.id}
                    onClick={() => handleViewRun(run)}
                    style={{ borderBottom:"1px solid #f3f4f6", cursor:"pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding:"11px 16px", fontSize:13, color:"#374151", whiteSpace:"nowrap" }}>
                      {fmtDate(run.pay_date)}
                    </td>
                    <td style={{ padding:"11px 16px", fontSize:13, color:"#1a1a2e", fontWeight:500, whiteSpace:"nowrap" }}>
                      {fmtRange(run.period_start, run.period_end)}
                    </td>
                    <td style={{ padding:"11px 16px" }}>
                      <StatusBadge status={statusLabel} />
                    </td>
                    <td style={{ padding:"11px 16px", fontSize:13, color:"#374151", textAlign:"right" }}>
                      {run.payslip_count ?? "—"}
                    </td>
                    <td style={{ padding:"11px 16px", fontSize:13, fontWeight:600, color:"#1a1a2e", textAlign:"right", whiteSpace:"nowrap" }}>
                      {fmt(currSym, run.total_gross || 0)}
                    </td>
                    <td style={{ padding:"11px 16px", fontSize:13, fontWeight:600, color:"#dc2626", textAlign:"right", whiteSpace:"nowrap" }}>
                      {fmt(currSym, totalTaxNI)}
                    </td>
                    <td style={{ padding:"11px 16px", fontSize:13, fontWeight:600, color:"#059669", textAlign:"right", whiteSpace:"nowrap" }}>
                      {fmt(currSym, run.total_net || 0)}
                    </td>
                    <td style={{ padding:"11px 12px" }} onClick={ev => ev.stopPropagation()}>
                      <div style={{ display:"flex", gap:2, opacity:0 }} className="row-actions"
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                        <Btn size="sm" variant="ghost" icon={<Icons.Eye />} onClick={() => handleViewRun(run)} />
                        {run.status === "draft" && (
                          <Btn size="sm" variant="ghost" icon={<Icons.Trash />} onClick={() => handleDelete(run)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><EmptyState icon={<Icons.Receipt />}
                  text={runs.length === 0
                    ? (employeeCount > 0
                        ? `No payroll runs yet. Run your first payroll for ${employeeCount} employee${employeeCount !== 1 ? "s" : ""}.`
                        : "No payroll runs yet. Add employees first to start running payroll.")
                    : "No payroll runs match your current filters."}
                  cta={runs.length === 0
                    ? (employeeCount > 0
                        ? <Btn variant="primary" onClick={() => { setCreateError(""); setShowNewModal(true); }}>New Payroll Run</Btn>
                        : <Btn variant="outline" disabled>Add employees first</Btn>)
                    : <Btn variant="outline" onClick={() => { setStatusFilter("all"); setYearFilter(currentTaxYear()); }}>Clear filters</Btn>}
                /></td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={pageSize} />
        </div>

        <style>{`tr:hover .row-actions { opacity: 1 !important; }`}</style>
      </div>

      {showNewModal && (
        <NewRunModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateRun}
          creating={creating}
          error={createError}
        />
      )}
    </div>
  );
}
