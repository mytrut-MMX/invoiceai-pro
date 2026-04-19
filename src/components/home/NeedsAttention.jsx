import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import { Icons } from "../icons";

const SEV_ORDER = { critical: 0, warning: 1, info: 2 };

const SEV_STYLES = {
  critical: {
    iconWrap: "bg-[var(--danger-50)] text-[var(--danger-600)]",
    label:    "text-[var(--danger-700)]",
  },
  warning: {
    iconWrap: "bg-[var(--warning-50)] text-[var(--warning-600)]",
    label:    "text-[var(--warning-700)]",
  },
  info: {
    iconWrap: "bg-[var(--info-50)] text-[var(--info-600)]",
    label:    "text-[var(--info-700)]",
  },
};

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr + (dateStr.length <= 10 ? "T00:00:00" : ""));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

export default function NeedsAttention({ invoices = [], bills = [], orgSettings, moduleData = {} }) {
  const navigate = useNavigate();

  const items = useMemo(() => {
    const out = [];

    // Overdue invoices
    const overdueInvoices = invoices.filter(i => i.status === "Overdue");
    if (overdueInvoices.length > 0) {
      out.push({
        id: "overdue_invoices",
        severity: "critical",
        icon: Icons.Alert,
        title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length !== 1 ? "s" : ""}`,
        subtitle: "Follow up to get paid",
        route: `${ROUTES.INVOICES}?status=Overdue`,
        urgency: 0,
      });
    }

    // Draft invoices
    const drafts = invoices.filter(i => i.status === "Draft");
    if (drafts.length > 0) {
      out.push({
        id: "draft_invoices",
        severity: "warning",
        icon: Icons.Edit,
        title: `${drafts.length} draft invoice${drafts.length !== 1 ? "s" : ""} to send`,
        subtitle: "Review and dispatch",
        route: `${ROUTES.INVOICES}?status=Draft`,
        urgency: 10,
      });
    }

    // Bills due within 7 days (unpaid + not void, with due_date)
    const billsDueSoon = bills.filter(b => {
      if (["Paid", "Void"].includes(b.status)) return false;
      if (!b.due_date) return false;
      const d = daysUntil(b.due_date);
      return d <= 7;
    });
    if (billsDueSoon.length > 0) {
      const overdueBills = billsDueSoon.filter(b => daysUntil(b.due_date) < 0);
      const isCritical = overdueBills.length > 0;
      out.push({
        id: "bills_due",
        severity: isCritical ? "critical" : "warning",
        icon: Icons.Receipt,
        title: isCritical
          ? `${overdueBills.length} bill${overdueBills.length !== 1 ? "s" : ""} overdue`
          : `${billsDueSoon.length} bill${billsDueSoon.length !== 1 ? "s" : ""} due this week`,
        subtitle: "Schedule payment",
        route: ROUTES.BILLS,
        urgency: isCritical ? 1 : 20,
      });
    }

    // VAT return
    if (moduleData.isVatRegistered && Array.isArray(moduleData.vatPeriods)) {
      const open = moduleData.vatPeriods.find(p => p.status === "open" || p.status === "draft");
      if (open) {
        const d = daysUntil(open.due_date);
        if (d <= 30) {
          const critical = d < 0;
          const warning = d <= 7;
          out.push({
            id: "vat_return",
            severity: critical ? "critical" : warning ? "warning" : "info",
            icon: Icons.Invoices,
            title: critical
              ? `VAT return overdue by ${Math.abs(d)} days`
              : `VAT return due in ${d} day${d !== 1 ? "s" : ""}`,
            subtitle: "File with HMRC",
            route: ROUTES.VAT_RETURN,
            urgency: critical ? 2 : warning ? 15 : 30,
          });
        }
      }
    }

    // ITSA update
    if (orgSettings?.bType === "Sole Trader / Freelancer" && Array.isArray(moduleData.itsaPeriods)) {
      const open = moduleData.itsaPeriods.find(p =>
        p.status !== "submitted" && new Date(p.period_end) <= new Date()
      );
      if (open) {
        const d = daysUntil(open.submission_deadline);
        if (d <= 30) {
          const critical = d < 0;
          const warning = d <= 7;
          out.push({
            id: "itsa_update",
            severity: critical ? "critical" : warning ? "warning" : "info",
            icon: Icons.Receipt,
            title: critical
              ? `ITSA update overdue by ${Math.abs(d)} days`
              : `ITSA update due in ${d} day${d !== 1 ? "s" : ""}`,
            subtitle: `${open.quarter || "Quarterly"} submission`,
            route: ROUTES.ITSA,
            urgency: critical ? 3 : warning ? 16 : 31,
          });
        }
      }
    }

    // Payroll
    if (moduleData.hasEmployees) {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const hasRun = (moduleData.payrollRuns || []).some(r =>
        r.period_start <= monthEnd && r.period_end >= monthStart
      );
      if (!hasRun) {
        const d = daysUntil(monthEnd);
        if (d <= 7 && d >= 0) {
          out.push({
            id: "payroll_due",
            severity: d <= 3 ? "warning" : "info",
            icon: Icons.Payments,
            title: d === 0 ? "Payroll run due today" : `Payroll run due in ${d} day${d !== 1 ? "s" : ""}`,
            subtitle: `${monthEnd}`,
            route: ROUTES.PAYROLL,
            urgency: d <= 3 ? 17 : 32,
          });
        }
      }
    }

    // Sort by severity, then urgency
    return out.sort((a, b) => {
      const sa = SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
      if (sa !== 0) return sa;
      return (a.urgency || 0) - (b.urgency || 0);
    });
  }, [invoices, bills, orgSettings, moduleData]);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="px-[21px] py-[13px] border-b border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Needs attention</h2>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          {items.length === 0 ? "Nothing urgent right now" : `${items.length} item${items.length !== 1 ? "s" : ""} to review`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="px-[21px] py-[34px] text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--success-50)] text-[var(--success-600)] mb-2">
            <Icons.Check />
          </div>
          <div className="text-sm font-medium text-[var(--text-primary)]">You're all caught up</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">No action items right now.</div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {items.map(item => {
            const s = SEV_STYLES[item.severity];
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.route)}
                  className="w-full flex items-center gap-[13px] px-[21px] py-[13px] bg-transparent border-none cursor-pointer text-left hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                >
                  <span className={`w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 ${s.iconWrap}`}>
                    <Icon />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.title}</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] truncate">{item.subtitle}</div>
                  </div>
                  <span className="text-[var(--text-tertiary)] flex-shrink-0 flex">
                    <Icons.ChevRight />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
