import { useState, useEffect, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { generateAlerts } from "../../utils/ledger/generateAlerts";
import { ROUTES } from "../../router/routes";
import { AppCtx } from "../../context/AppContext";
import { supabase, supabaseReady } from "../../lib/supabase";
import { Icons } from "../icons";

const ALERT_PAGE_ROUTES = {
  "invoices":     ROUTES.INVOICES,
  "invoices:new": ROUTES.INVOICES_NEW,
  "payments":     ROUTES.PAYMENTS,
  "expenses":     ROUTES.EXPENSES,
  "bills":        ROUTES.BILLS,
  "payroll":      ROUTES.PAYROLL || "/payroll",
  "payroll:new":  ROUTES.PAYROLL_NEW || "/payroll/new",
  "vat":          ROUTES.VAT_RETURN,
  "itsa":         ROUTES.ITSA,
};

const LS_DISMISSED_KEY = "invoicesaga_dismissed_alerts";
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const getDismissed = () => {
  try {
    const raw = localStorage.getItem(LS_DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.keys)) {
      return parsed.dismissedDate === todayISO() ? parsed.keys : [];
    }
    return [];
  } catch { return []; }
};
const saveDismissed = (ids) => {
  try { localStorage.setItem(LS_DISMISSED_KEY, JSON.stringify({ dismissedDate: todayISO(), keys: ids })); } catch {}
};

const SEV = {
  critical: {
    row:        "bg-[var(--danger-50)]",
    divider:    "border-[var(--danger-100)]",
    dot:        "bg-[var(--danger-600)]",
    label:      "Critical",
    labelColor: "text-[var(--danger-700)]",
    border:     "border-[var(--danger-100)]",
    badgeBg:    "bg-[var(--danger-50)]",
    badgeText:  "text-[var(--danger-700)]",
  },
  warning: {
    row:        "bg-[var(--warning-50)]",
    divider:    "border-[var(--warning-100)]",
    dot:        "bg-[var(--warning-600)]",
    label:      "Warning",
    labelColor: "text-[var(--warning-700)]",
    border:     "border-[var(--warning-100)]",
    badgeBg:    "bg-[var(--warning-50)]",
    badgeText:  "text-[var(--warning-700)]",
  },
  info: {
    row:        "bg-[var(--info-50)]",
    divider:    "border-[var(--info-100)]",
    dot:        "bg-[var(--info-600)]",
    label:      "Info",
    labelColor: "text-[var(--info-700)]",
    border:     "border-[var(--info-100)]",
    badgeBg:    "bg-[var(--info-50)]",
    badgeText:  "text-[var(--info-700)]",
  },
};

const todayStr = () => new Date().toISOString().slice(0, 10);
function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}
function fmtGBP(n) {
  return Number(n).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}
function fmtDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function generatePayrollAlerts(employees, payrollRuns, bills) {
  const alerts = [];
  if (!employees || employees.length === 0) return alerts;

  const today = todayStr();
  const activeCount = employees.filter(e => e.status === "active").length;
  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const currentMonthEnd = lastDay.toISOString().slice(0, 10);

  const hasRunThisMonth = (payrollRuns || []).some(r =>
    r.period_start <= currentMonthEnd && r.period_end >= currentMonthStart
  );

  if (!hasRunThisMonth && activeCount > 0) {
    const daysToMonthEnd = daysUntil(currentMonthEnd);
    if (daysToMonthEnd >= 0 && daysToMonthEnd <= 3) {
      const label = daysToMonthEnd === 0 ? "today" : `in ${daysToMonthEnd} day${daysToMonthEnd !== 1 ? "s" : ""}`;
      alerts.push({
        id: `payroll_due_${currentMonthStart}`,
        severity: "warning",
        category: "payroll",
        title: `Payroll run due ${label}`,
        description: `Your next payroll for ${activeCount} employee${activeCount !== 1 ? "s" : ""} is due ${fmtDateShort(currentMonthEnd)}.`,
        actionPage: "payroll:new",
        dismissable: true,
      });
    }
  }

  const hmrcBills = (bills || []).filter(b =>
    b.supplier_name === "HMRC"
    && b.category === "Tax & Government"
    && b.status !== "Paid"
    && b.status !== "Void"
    && b.due_date
  );

  for (const bill of hmrcBills) {
    const days = daysUntil(bill.due_date);
    if (days > 7) continue;
    const isOverdue = days < 0;
    const amt = fmtGBP(bill.total || bill.amount || 0);
    alerts.push({
      id: `paye_due_${bill.id}`,
      severity: isOverdue ? "critical" : "warning",
      category: "payroll",
      title: `PAYE payment of ${amt} due to HMRC`,
      description: isOverdue
        ? `Was due by ${fmtDateShort(bill.due_date)}. Late payment incurs HMRC penalties.`
        : `Due by ${fmtDateShort(bill.due_date)}. Late payment incurs HMRC penalties.`,
      actionPage: "bills",
      dismissable: false,
    });
  }

  const overdueRuns = (payrollRuns || []).filter(r =>
    r.status === "approved" && r.pay_date && r.pay_date <= today
  );
  for (const run of overdueRuns) {
    alerts.push({
      id: `fps_overdue_${run.id}`,
      severity: "critical",
      category: "payroll",
      title: `FPS submission overdue for payroll ${fmtDateShort(run.pay_date)}`,
      description: "HMRC requires Real Time Information on or before pay day.",
      actionPage: "payroll",
      dismissable: false,
    });
  }

  return alerts;
}

export default function SmartAlerts({
  invoices, payments, expenses, orgSettings, bills,
  vatPeriods, itsaPeriods, payrollRuns: propsPayrollRuns,
  employees: propsEmployees,
}) {
  const navigate = useNavigate();
  const { user } = useContext(AppCtx);
  const [dismissedIds, setDismissedIds] = useState(() => getDismissed());
  const [alertsOpen, setAlertsOpen] = useState(true);

  const [localEmployees, setLocalEmployees] = useState(null);
  const [localPayrollRuns, setLocalPayrollRuns] = useState(null);

  const employees = propsEmployees ?? localEmployees;
  const payrollRuns = propsPayrollRuns ?? localPayrollRuns;

  useEffect(() => {
    if (propsEmployees !== undefined) return;
    if (!supabaseReady || !user?.id) return;
    let cancelled = false;

    (async () => {
      const { count, error: cErr } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");

      if (cancelled || cErr || count === 0) {
        if (!cancelled) { setLocalEmployees([]); setLocalPayrollRuns([]); }
        return;
      }

      const [empRes, runRes] = await Promise.all([
        supabase.from("employees").select("id, status, pay_frequency, leave_date").eq("user_id", user.id).eq("status", "active"),
        supabase.from("payroll_runs").select("id, status, period_start, period_end, pay_date, tax_year, tax_month").eq("user_id", user.id).order("pay_date", { ascending: false }).limit(20),
      ]);

      if (!cancelled) {
        setLocalEmployees(empRes.data || []);
        setLocalPayrollRuns(runRes.data || []);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, propsEmployees]);

  const baseAlerts = useMemo(
    () => generateAlerts(invoices, payments, expenses, orgSettings, bills),
    [invoices, payments, expenses, orgSettings, bills]
  );

  const allAlerts = useMemo(() => {
    const extra = [];

    if (employees && employees.length > 0) {
      extra.push(...generatePayrollAlerts(employees, payrollRuns, bills));
    }

    if (vatPeriods?.length > 0 && orgSettings?.vatReg === "Yes") {
      const openPeriod = vatPeriods.find(p => p.status === "open" || p.status === "draft");
      if (openPeriod) {
        const days = daysUntil(openPeriod.due_date);
        if (days <= 30) {
          extra.push({
            id: `vat_due_${openPeriod.id}`,
            severity: days < 0 ? "critical" : days <= 7 ? "warning" : "info",
            category: "vat",
            title: days < 0 ? `VAT Return overdue by ${Math.abs(days)} days` : `VAT Return due in ${days} days`,
            description: `Period ${fmtDateShort(openPeriod.period_start)} to ${fmtDateShort(openPeriod.period_end)}`,
            actionPage: "vat",
            dismissable: days > 7,
          });
        }
      }
    }

    if (itsaPeriods?.length > 0 && orgSettings?.bType === "Sole Trader / Freelancer") {
      const openItsaPeriod = itsaPeriods.find(p => p.status !== "submitted" && new Date(p.period_end) <= new Date());
      if (openItsaPeriod) {
        const days = daysUntil(openItsaPeriod.submission_deadline);
        if (days <= 30) {
          extra.push({
            id: `itsa_due_${openItsaPeriod.id}`,
            severity: days < 0 ? "critical" : days <= 7 ? "warning" : "info",
            category: "itsa",
            title: days < 0 ? `ITSA submission overdue by ${Math.abs(days)} days` : `ITSA quarterly update due in ${days} days`,
            description: `${openItsaPeriod.quarter} ${openItsaPeriod.tax_year}`,
            actionPage: "itsa",
            dismissable: days > 7,
          });
        }
      }
    }

    if (orgSettings?.vatReg === "Yes" && invoices?.length > 0) {
      const missingSupplyDate = invoices.filter(inv => {
        if (inv.supply_date) return false;
        const hasVat = (inv.taxBreakdown || []).some(t => Number(t.amount) > 0);
        return hasVat && inv.status !== "Draft" && inv.status !== "Void";
      });
      if (missingSupplyDate.length > 0) {
        extra.push({
          id: "vat_missing_supply_date",
          severity: "warning",
          category: "vat",
          title: `${missingSupplyDate.length} invoice${missingSupplyDate.length === 1 ? "" : "s"} missing supply date`,
          description: "HMRC requires supply date on all VAT invoices for accurate tax point reporting",
          actionPage: "invoices",
          dismissable: true,
        });
      }
    }

    if (extra.length === 0) return baseAlerts;
    const merged = [...baseAlerts, ...extra];
    const ORDER = { critical: 0, warning: 1, info: 2 };
    merged.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
    return merged;
  }, [baseAlerts, employees, payrollRuns, bills, vatPeriods, itsaPeriods, orgSettings, invoices]);

  const visibleAlerts = useMemo(() => {
    const source = Array.isArray(allAlerts) ? allAlerts : [];
    const dismissed = Array.isArray(dismissedIds) ? dismissedIds : [];
    return source.filter(a => !dismissed.includes(a.id));
  }, [allAlerts, dismissedIds]);

  const dismissAlert = (id) => {
    const base = Array.isArray(dismissedIds) ? dismissedIds : [];
    const next = [...base, id];
    setDismissedIds(next);
    saveDismissed(next);
  };

  if (visibleAlerts.length === 0) return null;

  const topSev = visibleAlerts.some(a => a.severity === "critical")
    ? "critical"
    : visibleAlerts.some(a => a.severity === "warning")
    ? "warning"
    : "info";
  const badge = SEV[topSev];

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
      <button
        onClick={() => setAlertsOpen(o => !o)}
        className="w-full flex items-center justify-between px-[21px] py-[13px] bg-transparent border-none cursor-pointer text-left hover:bg-[var(--surface-sunken)] transition-colors duration-150"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[var(--text-secondary)] flex">
            <Icons.Alert />
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Smart alerts</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.badgeBg} ${badge.badgeText}`}>
            {visibleAlerts.length}
          </span>
        </div>
        <span
          className={[
            "text-[var(--text-tertiary)] flex transition-transform duration-200",
            alertsOpen ? "" : "rotate-180",
          ].join(" ")}
        >
          <Icons.ChevDown />
        </span>
      </button>

      {alertsOpen && (
        <div className="border-t border-[var(--border-subtle)]">
          {visibleAlerts.map((alert, idx) => {
            const s = SEV[alert.severity] || SEV.info;
            return (
              <div
                key={alert.id}
                className={[
                  "flex items-start justify-between gap-[13px] px-[21px] py-[13px]",
                  s.row,
                  idx < visibleAlerts.length - 1 ? `border-b ${s.divider}` : "",
                ].join(" ")}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${s.dot}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{alert.title}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${s.labelColor}`}>
                        {s.label}
                      </span>
                    </div>
                    {alert.description && (
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">{alert.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {alert.actionPage && (
                    <button
                      onClick={() => navigate(ALERT_PAGE_ROUTES[alert.actionPage] || ROUTES.DASHBOARD)}
                      className={[
                        "text-xs font-semibold bg-white border rounded-[var(--radius-sm)] px-2 py-1 cursor-pointer whitespace-nowrap transition-colors duration-150 hover:bg-[var(--surface-sunken)]",
                        s.border,
                        s.labelColor,
                      ].join(" ")}
                    >
                      View →
                    </button>
                  )}
                  {alert.dismissable && (
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      title="Dismiss"
                      className="bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] w-6 h-6 rounded flex items-center justify-center transition-colors duration-150"
                    >
                      <Icons.X />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
