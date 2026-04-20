/**
 * PayslipDocument — renders a single payslip as an A4 document.
 *
 * Mirrors the structure and styling of A4InvoiceDoc for brand consistency.
 * Used for on-screen preview only — the downloadable PDF is built directly
 * from data via jsPDF in generatePayslipPdf.js.
 */

import { fmt, fmtDate } from "../../utils/helpers";

const mono = "'Courier New', monospace";

const C = {
  heading:   "#1a1a2e",
  body:      "#374151",
  muted:     "#6b7280",
  faint:     "#9ca3af",
  border:    "#e2e8f0",
  lightBg:   "#f8fafc",
  accent:    "#1e6be0",
  positive:  "#16A34A",
  negative:  "#dc2626",
};

function fmtRange(start, end) {
  const opts = { day: "2-digit", month: "short", year: "numeric" };
  const s = start ? new Date(start).toLocaleDateString("en-GB", opts) : "—";
  const e = end   ? new Date(end).toLocaleDateString("en-GB", opts)   : "—";
  return `${s} – ${e}`;
}

export default function PayslipDocument({
  payslip,
  employee,
  payrollRun,
  employer = {},
  showEmployerCopy = false,
  docId = "payslip-pdf-doc",
}) {
  const s = payslip || {};
  const emp = employee || {};
  const run = payrollRun || {};
  const currSym = "£";

  const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Employee";
  const addr = emp.address || {};
  const isHourly = emp.salary_type === "hourly";

  // Deduction rows (only show > 0)
  const deductions = [
    { label: "Income Tax",                       thisPeriod: Number(s.tax_deducted || 0),     ytd: s.tax_ytd },
    { label: `Employee NI (Cat ${emp.ni_category || "A"})`, thisPeriod: Number(s.ni_employee || 0), ytd: s.ni_ytd },
    ...(Number(s.pension_employee || 0) > 0 ? [{ label: `Pension (${emp.pension_employee_pct || 5}%)`, thisPeriod: Number(s.pension_employee), ytd: null }] : []),
    ...(Number(s.student_loan || 0) > 0 ? [{ label: `Student Loan (${(emp.student_loan_plan || "").replace("plan", "Plan ").replace("postgrad", "Postgrad")})`, thisPeriod: Number(s.student_loan), ytd: null }] : []),
    ...(Number(s.other_deductions || 0) > 0 ? [{ label: "Other Deductions", thisPeriod: Number(s.other_deductions), ytd: null }] : []),
  ].filter(d => d.thisPeriod > 0);

  const totalDeductions = deductions.reduce((sum, d) => sum + d.thisPeriod, 0);
  const hasYtd = s.gross_ytd != null || s.tax_ytd != null || s.ni_ytd != null;

  const thStyle = { padding: "8px 10px", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1.5px solid ${C.border}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdStyle = { padding: "7px 10px", fontSize: 11, color: C.body, borderBottom: `1px solid #f1f5f9` };
  const tdRight = { ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const tdBold  = { ...tdRight, fontWeight: 700, color: C.heading };

  return (
    <div id={docId} style={{ width: "210mm", minHeight: "297mm", padding: "18mm 16mm", color: C.body, background: "#fff", boxSizing: "border-box" }}>

      {/* ═══ SECTION 1 — HEADER ═══ */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          {employer.logo && <img src={employer.logo} alt="" style={{ maxHeight: 44, maxWidth: 140, marginBottom: 8, objectFit: "contain" }} />}
          <div style={{ fontSize: 16, fontWeight: 800, color: C.heading }}>{employer.name || "Employer"}</div>
          {employer.payeRef && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>PAYE Ref: {employer.payeRef}</div>}
          {employer.address && <div style={{ fontSize: 10, color: C.muted, marginTop: 2, maxWidth: 200 }}>{employer.address}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.heading, letterSpacing: "0.08em" }}>PAYSLIP</div>
          <div style={{ fontSize: 11, color: C.body, marginTop: 6 }}>Pay Date: <strong>{fmtDate(run.pay_date)}</strong></div>
          <div style={{ fontSize: 11, color: C.body, marginTop: 2 }}>Period: <strong>{fmtRange(run.period_start, run.period_end)}</strong></div>
          {run.tax_month && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Tax Month {run.tax_month}</div>}
          {run.tax_week && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Tax Week {run.tax_week}</div>}
        </div>
      </div>

      {/* ═══ SECTION 2 — EMPLOYEE INFO ═══ */}
      <div style={{ background: C.lightBg, borderRadius: 6, border: `1px solid ${C.border}`, padding: "12px 14px", marginBottom: 18, display: "flex", justifyContent: "space-between", gap: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Employee</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.heading }}>{name}</div>
          {addr.street && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{addr.street}</div>}
          {(addr.city || addr.postcode) && <div style={{ fontSize: 10, color: C.muted }}>{[addr.city, addr.postcode].filter(Boolean).join(", ")}</div>}
          {emp.email && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{emp.email}</div>}
        </div>
        <div style={{ textAlign: "right", minWidth: 160 }}>
          <div style={{ fontSize: 10, color: C.muted }}>NI Number: <span style={{ fontFamily: mono, fontWeight: 600, color: C.heading }}>{emp.ni_number || "—"}</span></div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Tax Code: <span style={{ fontWeight: 600, color: C.heading }}>{emp.tax_code || "—"}</span></div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>NI Category: <span style={{ fontWeight: 600, color: C.heading }}>{emp.ni_category || "A"}</span></div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Employee ID: <span style={{ fontFamily: mono, fontSize: 9, color: C.faint }}>{(emp.id || "").slice(-8)}</span></div>
        </div>
      </div>

      {/* ═══ SECTION 3 — PAYMENTS TABLE ═══ */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
        <thead>
          <tr>
            <th style={thStyle}>Description</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Units</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Rate</th>
            <th style={{ ...thStyle, textAlign: "right" }}>This Period</th>
            {hasYtd && <th style={{ ...thStyle, textAlign: "right" }}>YTD</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Basic Pay</td>
            <td style={tdRight}>{isHourly && s.hours_worked ? s.hours_worked : "—"}</td>
            <td style={tdRight}>{isHourly ? fmt(currSym, emp.salary_amount) : "—"}</td>
            <td style={tdBold}>{fmt(currSym, s.gross_pay)}</td>
            {hasYtd && <td style={tdRight}>{s.gross_ytd != null ? fmt(currSym, s.gross_ytd) : "—"}</td>}
          </tr>
          {Number(s.other_additions || 0) > 0 && (
            <tr>
              <td style={tdStyle}>Other Additions</td>
              <td style={tdRight}>—</td>
              <td style={tdRight}>—</td>
              <td style={tdBold}>{fmt(currSym, s.other_additions)}</td>
              {hasYtd && <td style={tdRight}>—</td>}
            </tr>
          )}
          {/* Gross total row */}
          <tr style={{ background: C.lightBg }}>
            <td colSpan={3} style={{ ...tdStyle, fontWeight: 700, color: C.heading, borderBottom: `1.5px solid ${C.border}` }}>Gross Pay</td>
            <td style={{ ...tdBold, borderBottom: `1.5px solid ${C.border}` }}>{fmt(currSym, Number(s.gross_pay || 0) + Number(s.other_additions || 0))}</td>
            {hasYtd && <td style={{ ...tdBold, borderBottom: `1.5px solid ${C.border}` }}>{s.gross_ytd != null ? fmt(currSym, s.gross_ytd) : "—"}</td>}
          </tr>
        </tbody>
      </table>

      {/* ═══ SECTION 4 — DEDUCTIONS TABLE ═══ */}
      {deductions.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
          <thead>
            <tr>
              <th style={thStyle}>Deductions</th>
              <th style={{ ...thStyle, textAlign: "right" }}>This Period</th>
              {hasYtd && <th style={{ ...thStyle, textAlign: "right" }}>YTD</th>}
            </tr>
          </thead>
          <tbody>
            {deductions.map(d => (
              <tr key={d.label}>
                <td style={tdStyle}>{d.label}</td>
                <td style={{ ...tdRight, color: C.negative }}>{fmt(currSym, d.thisPeriod)}</td>
                {hasYtd && <td style={tdRight}>{d.ytd != null ? fmt(currSym, d.ytd) : "—"}</td>}
              </tr>
            ))}
            <tr style={{ background: "#fef2f2" }}>
              <td style={{ ...tdStyle, fontWeight: 700, color: C.negative, borderBottom: `1.5px solid ${C.border}` }}>Total Deductions</td>
              <td style={{ ...tdBold, color: C.negative, borderBottom: `1.5px solid ${C.border}` }}>{fmt(currSym, totalDeductions)}</td>
              {hasYtd && (
                <td style={{ ...tdBold, color: C.negative, borderBottom: `1.5px solid ${C.border}` }}>
                  {(s.tax_ytd != null && s.ni_ytd != null) ? fmt(currSym, Number(s.tax_ytd || 0) + Number(s.ni_ytd || 0)) : "—"}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      )}

      {/* ═══ SECTION 5 — NET PAY SUMMARY ═══ */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, background: C.lightBg, borderRadius: 6, border: `1px solid ${C.border}`, padding: "12px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Gross Pay</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.heading, fontVariantNumeric: "tabular-nums" }}>{fmt(currSym, s.gross_pay)}</div>
        </div>
        <div style={{ flex: 1, background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca", padding: "12px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.negative, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Total Deductions</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.negative, fontVariantNumeric: "tabular-nums" }}>{fmt(currSym, totalDeductions)}</div>
        </div>
        <div style={{ flex: 1.3, background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0", padding: "12px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.positive, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Net Pay</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.positive, fontVariantNumeric: "tabular-nums" }}>{fmt(currSym, s.net_pay)}</div>
        </div>
      </div>

      {/* ═══ SECTION 6 — EMPLOYER COSTS ═══ */}
      {showEmployerCopy && (
        <div style={{ borderTop: `2px dashed ${C.border}`, paddingTop: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Employer Costs</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Employer NI</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Employer Pension</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Total Employment Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>{fmt(currSym, s.ni_employer)}</td>
                <td style={tdRight}>{fmt(currSym, s.pension_employer)}</td>
                <td style={tdBold}>{fmt(currSym, Number(s.gross_pay || 0) + Number(s.ni_employer || 0) + Number(s.pension_employer || 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ SECTION 7 — FOOTER ═══ */}
      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 8, color: C.faint }}>This is a record of your earnings and deductions. Keep for your records.</div>
        <div style={{ fontSize: 8, color: C.faint }}>Generated by InvoiceSaga · {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
      </div>
    </div>
  );
}
