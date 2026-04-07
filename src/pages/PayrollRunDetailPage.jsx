import { useState, useEffect, useContext, useMemo } from "react";
import { ff, CUR_SYM } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import { StatusBadge } from "../components/shared/moduleListUI";
import { fmt, fmtDate } from "../utils/helpers";
import { supabase } from "../lib/supabase";
import { approvePayrollRun, submitPayrollRun } from "../utils/payroll/payrollService";
import PayslipDetailModal from "../components/payroll/PayslipDetailModal";

// ─── AVATAR (same palette as CustomersPage / EmployeesPage) ──────────────────
const AVATAR_PALETTES = [
  { bg:"#eff6ff", fg:"#1d4ed8" }, { bg:"#fef3c7", fg:"#92400e" },
  { bg:"#f0fdf4", fg:"#166534" }, { bg:"#fdf4ff", fg:"#7e22ce" },
  { bg:"#fff1f2", fg:"#be123c" }, { bg:"#f0f9ff", fg:"#0369a1" },
  { bg:"#fafaf9", fg:"#44403c" },
];
const avatarPalette = (name = "") => AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];

function EmpAvatar({ name }) {
  const { bg, fg } = avatarPalette(name);
  return (
    <div style={{ width:28, height:28, borderRadius:"50%", background:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:11, flexShrink:0, fontFamily:ff }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

// ─── TAX MONTH NAMES ─────────────────────────────────────────────────────────
const TAX_MONTH_NAMES = ["", "April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];

// ─── CONFIRM MODAL ──────────────────────────────────────────────────────────
function ConfirmModal({ title, message, warning, confirmLabel, confirmVariant = "primary", onConfirm, onCancel, busy }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.35)" }}
      onClick={onCancel}>
      <div style={{ background:"#fff", borderRadius:14, padding:"24px 28px", width:440, maxWidth:"92vw", boxShadow:"0 12px 40px rgba(0,0,0,0.18)", fontFamily:ff }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize:16, fontWeight:700, color:"#1a1a2e", margin:"0 0 10px" }}>{title}</h3>
        <p style={{ fontSize:13, color:"#374151", margin:"0 0 8px", lineHeight:1.5 }}>{message}</p>
        {warning && (
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:12, color:"#92400e" }}>
            {warning}
          </div>
        )}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
          <Btn variant="outline" onClick={onCancel} disabled={busy}>Cancel</Btn>
          <Btn variant={confirmVariant} onClick={onConfirm} disabled={busy}>
            {busy ? "Processing…" : confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function PayrollRunDetailPage({ runId, onBack }) {
  const { user, orgSettings } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [run, setRun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  // Modals
  const [confirmAction, setConfirmAction] = useState(null); // {type, ...}
  const [viewPayslip, setViewPayslip] = useState(null);
  const [showEmployerCosts, setShowEmployerCosts] = useState(false);

  // ─── Load run + payslips + employees ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!runId || !supabase) { setLoading(false); return; }
      try {
        const [runRes, slipRes] = await Promise.all([
          supabase.from("payroll_runs").select("*").eq("id", runId).single(),
          supabase.from("payslips").select("*").eq("payroll_run_id", runId),
        ]);
        if (runRes.error) throw runRes.error;
        if (!cancelled) {
          setRun(runRes.data);
          const slips = slipRes.data || [];
          setPayslips(slips);

          // Load employees referenced by payslips
          const empIds = [...new Set(slips.map(s => s.employee_id))];
          if (empIds.length > 0) {
            const { data: emps } = await supabase.from("employees").select("*").in("id", empIds);
            if (!cancelled && emps) {
              const map = {};
              for (const e of emps) map[e.id] = e;
              setEmployees(map);
            }
          }
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load payroll run");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [runId]);

  // ─── Metrics ───────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!run) return {};
    const totalDeductions = Number(run.total_tax || 0) + Number(run.total_ni_employee || 0) + Number(run.total_pension_employee || 0) + Number(run.total_student_loan || 0);
    const employerCost = Number(run.total_gross || 0) + Number(run.total_ni_employer || 0) + Number(run.total_pension_employer || 0);
    return { totalDeductions, employerCost };
  }, [run]);

  // ─── Action handlers ───────────────────────────────────────────────────────
  const handleAction = async (type) => {
    setBusy(true);
    setActionError("");
    let result;
    try {
      if (type === "approve") {
        result = await approvePayrollRun(runId);
      } else if (type === "unapprove") {
        // Unapprove = set back to draft (simple status update)
        const { data, error: err } = await supabase.from("payroll_runs").update({ status: "draft" }).eq("id", runId).select().single();
        result = err ? { error: err.message } : { success: true, run: data };
      } else if (type === "submit") {
        result = await submitPayrollRun(runId);
      } else if (type === "markPaid") {
        const { data, error: err } = await supabase.from("payroll_runs").update({ status: "paid" }).eq("id", runId).select().single();
        result = err ? { error: err.message } : { success: true, run: data };
      } else if (type === "discard") {
        const { error: err } = await supabase.from("payroll_runs").delete().eq("id", runId);
        if (err) { result = { error: err.message }; } else { setBusy(false); setConfirmAction(null); onBack?.(); return; }
      }
    } catch (err) {
      result = { error: err?.message || "Action failed" };
    }
    setBusy(false);
    setConfirmAction(null);
    if (result?.error) { setActionError(typeof result.error === "string" ? result.error : "Action failed"); }
    else if (result?.run) { setRun(result.run); }
  };

  // ─── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>
        <div style={{ textAlign:"center", padding:"80px 24px", color:"#94a3b8", fontSize:14 }}>Loading payroll run…</div>
      </div>
    );
  }
  if (error || !run) {
    return (
      <div style={{ background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>
        <div style={{ maxWidth:600, margin:"0 auto", padding:"60px 24px", textAlign:"center" }}>
          <div style={{ fontSize:14, color:"#b91c1c", marginBottom:16 }}>{error || "Payroll run not found"}</div>
          <Btn variant="outline" onClick={onBack}>← Back to Payroll</Btn>
        </div>
      </div>
    );
  }

  const statusLabel = (run.status || "draft").charAt(0).toUpperCase() + (run.status || "draft").slice(1);
  const taxMonthName = TAX_MONTH_NAMES[run.tax_month] || "";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>

      {/* Sticky header */}
      <div style={{ position:"sticky", top:0, zIndex:10, background:"#fff", borderBottom:"1px solid #e8e8ec", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:13, fontFamily:ff, padding:0 }}>← Payroll</button>
          <span style={{ color:"#d1d5db" }}>/</span>
          <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>
            {fmtDate(run.pay_date)} run
          </span>
          <StatusBadge status={statusLabel} />
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {run.status === "draft" && (
            <>
              <Btn variant="ghost" onClick={() => setConfirmAction({ type:"discard", title:"Discard Draft", message:"Delete this draft payroll run? All payslips will be lost.", confirmLabel:"Discard", confirmVariant:"danger" })}>Discard</Btn>
              <Btn variant="primary" onClick={() => setConfirmAction({ type:"approve", title:"Approve Payroll", message:`Approve payroll for ${payslips.length} employee${payslips.length!==1?"s":""} totalling ${fmt(currSym, run.total_net||0)} net?`, confirmLabel:"Approve" })}>Approve →</Btn>
            </>
          )}
          {run.status === "approved" && (
            <>
              <Btn variant="outline" onClick={() => setConfirmAction({ type:"unapprove", title:"Unapprove", message:"Move this run back to draft status?", confirmLabel:"Unapprove" })}>Unapprove</Btn>
              <Btn variant="primary" onClick={() => setConfirmAction({ type:"submit", title:"Submit to HMRC", message:`Submit FPS for ${payslips.length} employee${payslips.length!==1?"s":""}?`, warning:"This will post to the ledger and create a PAYE liability. This cannot be undone.", confirmLabel:"Submit to HMRC" })}>Submit to HMRC →</Btn>
            </>
          )}
          {run.status === "submitted" && (
            <>
              <Btn variant="outline" onClick={() => console.log("Download FPS XML — not yet implemented")}>Download FPS XML</Btn>
              <Btn variant="primary" onClick={() => setConfirmAction({ type:"markPaid", title:"Mark as Paid", message:"Mark this payroll run as paid?", confirmLabel:"Mark Paid" })}>Mark as Paid</Btn>
            </>
          )}
          {run.status === "paid" && (
            <Btn variant="outline" onClick={() => console.log("Download payslips ZIP — not yet implemented")}>Download Payslips</Btn>
          )}
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 24px 48px" }}>

        {/* Error banner */}
        {actionError && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#b91c1c", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>{actionError}</span>
            <button onClick={() => setActionError("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#b91c1c", fontSize:16, padding:0 }}>×</button>
          </div>
        )}

        {/* Summary hero */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:20 }}>
          {[
            { label:"Total Gross",      value: fmt(currSym, run.total_gross || 0),       color:"#0f172a" },
            { label:"Total Deductions",  value: fmt(currSym, metrics.totalDeductions||0), color:"#dc2626" },
            { label:"Total Net",         value: fmt(currSym, run.total_net || 0),         color:"#16A34A", highlight:true },
            { label:"Employer Cost",     value: fmt(currSym, metrics.employerCost||0),    color:"#1d4ed8" },
          ].map(c => (
            <div key={c.label} style={{
              background: c.highlight ? "#f0fdf4" : "#fff",
              border: c.highlight ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              borderRadius:12, padding:"18px 20px", textAlign:"center",
            }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>{c.label}</div>
              <div style={{ fontSize:24, fontWeight:800, color:c.color, fontVariantNumeric:"tabular-nums" }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Period info row */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", padding:"12px 20px", marginBottom:20, display:"flex", gap:28, flexWrap:"wrap", fontSize:13 }}>
          <div><span style={{ color:"#94a3b8", fontWeight:600 }}>Period: </span><span style={{ color:"#1a1a2e", fontWeight:600 }}>{fmtDate(run.period_start)} – {fmtDate(run.period_end)}</span></div>
          <div><span style={{ color:"#94a3b8", fontWeight:600 }}>Pay Date: </span><span style={{ color:"#1a1a2e", fontWeight:600 }}>{fmtDate(run.pay_date)}</span></div>
          <div><span style={{ color:"#94a3b8", fontWeight:600 }}>Tax Month: </span><span style={{ color:"#1a1a2e", fontWeight:600 }}>Month {run.tax_month}{taxMonthName ? ` (${taxMonthName})` : ""}</span></div>
          <div><span style={{ color:"#94a3b8", fontWeight:600 }}>Employees: </span><span style={{ color:"#1a1a2e", fontWeight:600 }}>{payslips.length}</span></div>
        </div>

        {/* Payslips table */}
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", boxShadow:"0 4px 16px rgba(15,23,42,0.05)", overflow:"hidden", marginBottom:20 }}>
          <div style={{ padding:"12px 20px", borderBottom:"1px solid #e8e8ec" }}>
            <span style={{ fontSize:14, fontWeight:700, color:"#1a1a2e" }}>Payslips</span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:760 }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["Employee", "Gross", "Tax", "NI (ee)", "Pension (ee)", "Student Loan", "Net", ""].map(h => (
                    <th key={h} style={{ padding:"10px 16px", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:"1px solid #e2e8f0", textAlign: h === "Employee" || h === "" ? "left" : "right", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payslips.map(slip => {
                  const emp = employees[slip.employee_id] || {};
                  const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Unknown";
                  return (
                    <tr key={slip.id} style={{ borderBottom:"1px solid #f3f4f6" }}
                      onMouseEnter={e => e.currentTarget.style.background="#f9fafb"}
                      onMouseLeave={e => e.currentTarget.style.background=""}>
                      <td style={{ padding:"10px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <EmpAvatar name={name} />
                          <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{name}</span>
                        </div>
                      </td>
                      <td style={{ padding:"10px 16px", fontSize:13, fontWeight:600, color:"#1a1a2e", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, slip.gross_pay)}</td>
                      <td style={{ padding:"10px 16px", fontSize:13, color:"#dc2626", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, slip.tax_deducted)}</td>
                      <td style={{ padding:"10px 16px", fontSize:13, color:"#dc2626", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, slip.ni_employee)}</td>
                      <td style={{ padding:"10px 16px", fontSize:13, color:"#dc2626", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, slip.pension_employee)}</td>
                      <td style={{ padding:"10px 16px", fontSize:13, color:"#dc2626", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, slip.student_loan)}</td>
                      <td style={{ padding:"10px 16px", fontSize:13, fontWeight:700, color:"#16A34A", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, slip.net_pay)}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <Btn size="sm" variant="ghost" icon={<Icons.Eye />} onClick={() => setViewPayslip(slip)} />
                      </td>
                    </tr>
                  );
                })}
                {payslips.length === 0 && (
                  <tr><td colSpan={8} style={{ padding:"40px 20px", textAlign:"center", color:"#94a3b8", fontSize:13 }}>No payslips in this run.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employer costs (collapsible) */}
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden" }}>
          <button onClick={() => setShowEmployerCosts(!showEmployerCosts)}
            style={{ width:"100%", padding:"12px 20px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontFamily:ff, fontSize:14, fontWeight:700, color:"#1a1a2e" }}>
            <span style={{ color:"#94a3b8" }}>{showEmployerCosts ? <Icons.ChevDown /> : <Icons.ChevRight />}</span>
            Employer Costs
            <span style={{ fontSize:12, fontWeight:500, color:"#94a3b8", marginLeft:"auto" }}>{fmt(currSym, metrics.employerCost || 0)} total</span>
          </button>
          {showEmployerCosts && (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Employee", "Employer NI", "Employer Pension", "Total Employer Cost"].map(h => (
                      <th key={h} style={{ padding:"10px 16px", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:"1px solid #e2e8f0", borderTop:"1px solid #e2e8f0", textAlign: h === "Employee" ? "left" : "right", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(slip => {
                    const emp = employees[slip.employee_id] || {};
                    const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Unknown";
                    const total = Number(slip.gross_pay || 0) + Number(slip.ni_employer || 0) + Number(slip.pension_employer || 0);
                    return (
                      <tr key={slip.id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                        <td style={{ padding:"10px 16px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <EmpAvatar name={name} />
                            <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{name}</span>
                          </div>
                        </td>
                        <td style={{ padding:"10px 16px", fontSize:13, color:"#374151", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, slip.ni_employer)}</td>
                        <td style={{ padding:"10px 16px", fontSize:13, color:"#374151", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, slip.pension_employer)}</td>
                        <td style={{ padding:"10px 16px", fontSize:13, fontWeight:700, color:"#1a1a2e", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          warning={confirmAction.warning}
          confirmLabel={confirmAction.confirmLabel}
          confirmVariant={confirmAction.confirmVariant}
          busy={busy}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => handleAction(confirmAction.type)}
        />
      )}

      {/* Payslip detail modal */}
      {viewPayslip && (
        <PayslipDetailModal
          payslip={viewPayslip}
          employee={employees[viewPayslip.employee_id]}
          run={run}
          employer={{ name: orgSettings?.companyName, payeRef: orgSettings?.payeRef, address: orgSettings?.address, logo: orgSettings?.logo }}
          currSym={currSym}
          onClose={() => setViewPayslip(null)}
        />
      )}
    </div>
  );
}
