import { useMemo, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppCtx } from "../../context/AppContext";
import { ROUTES } from "../../router/routes";
import { Icons } from "../icons";

export default function MonthEndChecklist() {
  const { invoices, payments, expenses, orgSettings } = useContext(AppCtx);
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const today = new Date();
  const isLastWeek = today.getDate() >= 24;

  const checks = useMemo(() => {
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const monthInvoices = invoices.filter(i => (i.issue_date || "").startsWith(month));
    const monthExpenses = expenses.filter(e => (e.date || "").startsWith(month));
    const pendingPayments = payments.filter(p => p.status === "Pending");
    const draftInvoices = invoices.filter(i => i.status === "Draft");
    const missingReceipts = expenses.filter(e => !e.receipt && !e.receipt_url && e.status !== "Reimbursed");

    return [
      { id: "invoices_sent",       label: `${monthInvoices.length} invoice(s) created this month`, done: monthInvoices.length > 0,    action: ROUTES.INVOICES },
      { id: "no_drafts",           label: `${draftInvoices.length} draft invoice(s) pending`,       done: draftInvoices.length === 0,  action: ROUTES.INVOICES + "?status=Draft" },
      { id: "payments_reconciled", label: `${pendingPayments.length} payment(s) unreconciled`,      done: pendingPayments.length === 0,action: ROUTES.PAYMENTS },
      { id: "expenses_logged",     label: `${monthExpenses.length} expense(s) this month`,          done: monthExpenses.length > 0,    action: ROUTES.EXPENSES },
      { id: "receipts_attached",   label: `${missingReceipts.length} expense(s) missing receipts`,  done: missingReceipts.length === 0,action: ROUTES.EXPENSES },
      ...(orgSettings?.vatReg === "Yes" ? [
        { id: "vat_reviewed", label: "Review VAT for this period", done: false, action: ROUTES.LEDGER_PL },
      ] : []),
    ];
  }, [invoices, payments, expenses, orgSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const completedCount = checks.filter(c => c.done).length;
  const progress = Math.round((completedCount / checks.length) * 100);

  if (!isLastWeek) return null;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-[21px] py-[13px] bg-transparent border-none cursor-pointer text-left hover:bg-[var(--surface-sunken)] transition-colors duration-150"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[var(--text-secondary)] flex flex-shrink-0">
            <Icons.Check />
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">Month-end checklist</span>
          <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
            {completedCount}/{checks.length}
          </span>
        </div>
        <div className="flex items-center gap-[13px] flex-shrink-0">
          <div className="w-14 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
            <div
              className={[
                "h-full rounded-full transition-all duration-300",
                progress === 100 ? "bg-[var(--success-600)]" : "bg-[var(--brand-600)]",
              ].join(" ")}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span
            className={[
              "text-[var(--text-tertiary)] flex transition-transform duration-200",
              open ? "" : "rotate-180",
            ].join(" ")}
          >
            <Icons.ChevDown />
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border-subtle)] px-[21px] py-[8px]">
          {checks.map((check, idx) => (
            <div
              key={check.id}
              onClick={() => !check.done && navigate(check.action)}
              className={[
                "flex items-center gap-2.5 py-2 text-xs",
                idx < checks.length - 1 ? "border-b border-[var(--border-subtle)]" : "",
                check.done ? "" : "cursor-pointer hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              {check.done ? (
                <span className="w-4 h-4 rounded-full bg-[var(--success-600)] flex items-center justify-center text-white flex-shrink-0">
                  <Icons.Check />
                </span>
              ) : (
                <span className="w-4 h-4 rounded-full border-2 border-[var(--border-default)] flex-shrink-0" />
              )}
              <span
                className={[
                  check.done
                    ? "line-through text-[var(--text-tertiary)]"
                    : "text-[var(--text-secondary)]",
                ].join(" ")}
              >
                {check.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
