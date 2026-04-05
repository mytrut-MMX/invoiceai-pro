import { useMemo, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppCtx } from "../../context/AppContext";
import { ROUTES } from "../../router/routes";
import { ff } from "../../constants";

export default function MonthEndChecklist() {
  const { invoices, payments, expenses, orgSettings } = useContext(AppCtx);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const today = new Date();
  const isLastWeek = today.getDate() >= 24;

  const checks = useMemo(() => {
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const monthInvoices = invoices.filter(i => (i.issue_date || "").startsWith(month));
    const monthPayments = payments.filter(p => (p.date || "").startsWith(month));
    const monthExpenses = expenses.filter(e => (e.date || "").startsWith(month));
    const pendingPayments = payments.filter(p => p.status === "Pending");
    const draftInvoices = invoices.filter(i => i.status === "Draft");
    const missingReceipts = expenses.filter(e => !e.receipt && !e.receipt_url && e.status !== "Reimbursed");

    return [
      { id: "invoices_sent", label: `${monthInvoices.length} invoice(s) created this month`, done: monthInvoices.length > 0, action: ROUTES.INVOICES },
      { id: "no_drafts", label: `${draftInvoices.length} draft invoice(s) pending`, done: draftInvoices.length === 0, action: ROUTES.INVOICES + "?status=Draft" },
      { id: "payments_reconciled", label: `${pendingPayments.length} payment(s) unreconciled`, done: pendingPayments.length === 0, action: ROUTES.PAYMENTS },
      { id: "expenses_logged", label: `${monthExpenses.length} expense(s) this month`, done: monthExpenses.length > 0, action: ROUTES.EXPENSES },
      { id: "receipts_attached", label: `${missingReceipts.length} expense(s) missing receipts`, done: missingReceipts.length === 0, action: ROUTES.EXPENSES },
      ...(orgSettings?.vatReg === "Yes" ? [
        { id: "vat_reviewed", label: "Review VAT for this period", done: false, action: ROUTES.LEDGER_PL },
      ] : []),
    ];
  }, [invoices, payments, expenses, orgSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const completedCount = checks.filter(c => c.done).length;
  const progress = Math.round((completedCount / checks.length) * 100);

  if (!isLastWeek) return null;

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e8ec", overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", background: "#f9fafb", border: "none", cursor: "pointer", fontFamily: ff,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>📋</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Month-End Checklist</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{completedCount}/{checks.length}</span>
        </div>
        <div style={{ width: 60, height: 6, background: "#e8e8ec", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#059669" : "#1e6be0", borderRadius: 3, transition: "width 0.3s" }} />
        </div>
      </button>

      {open && (
        <div style={{ padding: "8px 16px 14px" }}>
          {checks.map(check => (
            <div key={check.id}
              onClick={() => !check.done && navigate(check.action)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #f3f4f6", cursor: check.done ? "default" : "pointer", fontSize: 12 }}>
              <span style={{ fontSize: 14 }}>{check.done ? "✅" : "⬜"}</span>
              <span style={{ color: check.done ? "#059669" : "#374151", textDecoration: check.done ? "line-through" : "none" }}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
