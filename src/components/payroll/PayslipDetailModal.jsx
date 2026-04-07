import { ff, CUR_SYM } from "../../constants";
import { Btn } from "../atoms";
import { fmtDate, fmt } from "../../utils/helpers";

// ─── PAYSLIP DETAIL MODAL ────────────────────────────────────────────────────

export default function PayslipDetailModal({ payslip, employee, run, currSym = "£", onClose }) {
  const s = payslip || {};
  const emp = employee || {};
  const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Employee";

  const totalDeductions = Number(s.tax_deducted || 0) + Number(s.ni_employee || 0) + Number(s.pension_employee || 0) + Number(s.student_loan || 0) + Number(s.other_deductions || 0);

  const payments = [
    { label: "Basic Pay", amount: Number(s.gross_pay || 0) },
    ...(Number(s.other_additions || 0) > 0 ? [{ label: "Other Additions", amount: Number(s.other_additions) }] : []),
  ];
  const totalGross = payments.reduce((sum, p) => sum + p.amount, 0);

  const deductions = [
    { label: "Income Tax",    amount: Number(s.tax_deducted || 0) },
    { label: "Employee NI",   amount: Number(s.ni_employee || 0) },
    ...(Number(s.pension_employee || 0) > 0 ? [{ label: `Pension (${emp.pension_employee_pct || 5}%)`, amount: Number(s.pension_employee) }] : []),
    ...(Number(s.student_loan || 0) > 0 ? [{ label: `Student Loan (${emp.student_loan_plan || ""})`.replace("none", "").trim(), amount: Number(s.student_loan) }] : []),
    ...(Number(s.other_deductions || 0) > 0 ? [{ label: "Other Deductions", amount: Number(s.other_deductions) }] : []),
  ];

  const ytdItems = [
    { label: "Gross YTD",   value: s.gross_ytd },
    { label: "Tax YTD",     value: s.tax_ytd },
    { label: "NI YTD",      value: s.ni_ytd },
  ];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.35)" }}
      onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:14, width:640, maxWidth:"94vw", maxHeight:"90vh", overflow:"auto", boxShadow:"0 12px 40px rgba(0,0,0,0.18)", fontFamily:ff }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"18px 24px", borderBottom:"1px solid #e8e8ec" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#1a1a2e" }}>{name}</div>
          <div style={{ fontSize:12, color:"#6b7280", marginTop:3 }}>
            {run?.period_start && run?.period_end ? `${fmtDate(run.period_start)} – ${fmtDate(run.period_end)}` : "—"}
            {run?.pay_date ? ` · Pay date: ${fmtDate(run.pay_date)}` : ""}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"20px 24px" }}>

          {/* Two columns */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>

            {/* Payments */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Payments</div>
              <div style={{ background:"#f9fafb", borderRadius:8, border:"1px solid #e8e8ec", overflow:"hidden" }}>
                {payments.map(p => (
                  <div key={p.label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 12px", borderBottom:"1px solid #f0f0f4" }}>
                    <span style={{ fontSize:13, color:"#374151" }}>{p.label}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, p.amount)}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 12px", background:"#f0f4f8" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>Total Gross</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, totalGross)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Deductions</div>
              <div style={{ background:"#f9fafb", borderRadius:8, border:"1px solid #e8e8ec", overflow:"hidden" }}>
                {deductions.map(d => (
                  <div key={d.label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 12px", borderBottom:"1px solid #f0f0f4" }}>
                    <span style={{ fontSize:13, color:"#374151" }}>{d.label}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:"#dc2626", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, d.amount)}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 12px", background:"#fef2f2" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#b91c1c" }}>Total Deductions</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#b91c1c", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay hero */}
          <div style={{ textAlign:"center", padding:"20px 0", marginBottom:20, background:"#f0fdf4", borderRadius:10, border:"1px solid #bbf7d0" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Net Pay</div>
            <div style={{ fontSize:32, fontWeight:800, color:"#16A34A", letterSpacing:"-0.5px" }}>{fmt(currSym, s.net_pay || 0)}</div>
          </div>

          {/* Year to Date */}
          {(s.gross_ytd || s.tax_ytd || s.ni_ytd) && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Year to Date</div>
              <div style={{ display:"flex", gap:10 }}>
                {ytdItems.filter(y => y.value != null).map(y => (
                  <div key={y.label} style={{ flex:1, background:"#f9fafb", borderRadius:8, border:"1px solid #e8e8ec", padding:"10px 12px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em" }}>{y.label}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:"#1a1a2e", marginTop:4, fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, y.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:"1px solid #e8e8ec", display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn variant="outline" onClick={() => console.log("Download payslip PDF — coming in prompt 17", s.id)}>Download PDF</Btn>
          <Btn variant="primary" onClick={onClose}>Close</Btn>
        </div>
      </div>
    </div>
  );
}
