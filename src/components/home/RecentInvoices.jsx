import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import { CUR_SYM } from "../../constants";
import { fmt } from "../../utils/helpers";
import { StatusBadge } from "../atoms";
import { Icons } from "../icons";

export default function RecentInvoices({ invoices = [], orgSettings }) {
  const navigate = useNavigate();
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const recent = useMemo(() => {
    return [...invoices]
      .sort((a, b) => {
        const da = a.issue_date || a.created_at || "";
        const db = b.issue_date || b.created_at || "";
        return db.localeCompare(da);
      })
      .slice(0, 5);
  }, [invoices]);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent invoices</h2>
      </div>

      {recent.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-1">No invoices yet</div>
          <div className="text-xs text-[var(--text-tertiary)] mb-4">Create your first invoice to get started.</div>
          <button
            onClick={() => navigate(ROUTES.INVOICES_NEW)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white text-xs font-semibold cursor-pointer transition-colors duration-150 border-none"
          >
            <Icons.Plus />
            New invoice
          </button>
        </div>
      ) : (
        <>
          <div className="hidden sm:grid grid-cols-[1fr_1.5fr_auto_auto] gap-3 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)]">
            <span>Invoice #</span>
            <span>Customer</span>
            <span>Status</span>
            <span className="text-right">Amount</span>
          </div>
          <ul className="divide-y divide-[var(--border-subtle)]">
            {recent.map(inv => (
              <li key={inv.id}>
                <button
                  onClick={() => navigate(ROUTES.INVOICE(inv.id))}
                  className="w-full grid grid-cols-[1fr_1.5fr_auto_auto] gap-3 px-5 py-3 items-center bg-transparent border-none cursor-pointer text-left hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                >
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {inv.invoice_number || "—"}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] truncate">
                    {inv.customer?.name || "—"}
                  </span>
                  <span className="flex-shrink-0">
                    <StatusBadge status={inv.status || "Draft"} />
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums text-right">
                    {fmt(currSym, inv.total || 0)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => navigate(ROUTES.INVOICES)}
              className="text-xs font-semibold text-[var(--brand-600)] hover:text-[var(--brand-700)] bg-transparent border-none cursor-pointer transition-colors duration-150"
            >
              View all invoices →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
