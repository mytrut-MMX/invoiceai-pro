import { useState, useEffect, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ff } from "../../constants";
import { generateAlerts } from "../../utils/ledger/generateAlerts";
import { ROUTES } from "../../router/routes";
import { AppCtx } from "../../context/AppContext";
import { supabase, supabaseReady } from "../../lib/supabase";

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
const getDismissed = () => { try { return JSON.parse(localStorage.getItem(LS_DISMISSED_KEY) || "[]"); } catch { return []; } };
const saveDismissed = (ids) => { try { localStorage.setItem(LS_DISMISSED_KEY, JSON.stringify(ids)); } catch {} };

const SEV = {
  critical: { bg: "#fef2f2", border: "#fecaca", dot: "#dc2626", label: "Critical", labelColor: "#dc2626" },
  warning:  { bg: "#fffbeb", border: "#fde68a", dot: "#d97706", label: "Warning",  labelColor: "#d97706" },
  info:     { bg: "#eff6ff", border: "#bfdbfe", dot: "#2563eb", label: "Info",     labelColor: "#2563eb" },
};

// ─── Payroll alert helpers ────────────────────────────────────────────────────

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

  // ── Alert A: Payroll run due ────────────────────────────────────────────
  // Check if any employee's next pay date is within 3 days and no run exists
  // For monthly employees, the next pay date is roughly the end of the current month
  // We approximate by checking if there's a run covering the current month
  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const currentMonthEnd = lastDay.toISOString().slice(0, 10);

  const hasRunThisMonth = (payrollRuns || []).some(r =>
    r.period_start <= currentMonthEnd && r.period_end >= currentMonthStart
  );

  if (!hasRunThisMonth && activeCount > 0) {
    // Assume pay date is last working day — check if month end is within 3 days
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

  // ── Alert B: PAYE payment due to HMRC ──────────────────────────────────
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

  // ── Alert C: FPS submission overdue ────────────────────────────────────
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function SmartAlerts({
  invoices, payments, expenses, orgSettings, bills,
  vatPeriods, itsaPeriods, payrollRuns: propsPayrollRuns,
  employees: propsEmployees, hmrcBills, hasEmployees,
}) {
  const navigate = useNavigate();
  const { user } = useContext(AppCtx);
  const [dismissedIds, setDismissedIds] = useState(() => getDismissed());
  const [alertsOpen, setAlertsOpen] = useState(true);

  // ── Load payroll data locally as fallback (if not passed via props) ─────
  const [localEmployees, setLocalEmployees] = useState(null);
  const [localPayrollRuns, setLocalPayrollRuns] = useState(null);

  const employees = propsEmployees ?? localEmployees;
  const payrollRuns = propsPayrollRuns ?? localPayrollRuns;

  useEffect(() => {
    // Skip local loading if data was passed via props
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
        supabase
          .from("employees")
          .select("id, status, pay_frequency, leave_date")
          .eq("user_id", user.id)
          .eq("status", "active"),
        supabase
          .from("payroll_runs")
          .select("id, status, period_start, period_end, pay_date, tax_year, tax_month")
          .eq("user_id", user.id)
          .order("pay_date", { ascending: false })
          .limit(20),
      ]);

      if (!cancelled) {
        setLocalEmployees(empRes.data || []);
        setLocalPayrollRuns(runRes.data || []);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, propsEmployees]);

  // ── Merge existing + payroll alerts ────────────────────────────────────
  const baseAlerts = useMemo(
    () => generateAlerts(invoices, payments, expenses, orgSettings, bills),
    [invoices, payments, expenses, orgSettings, bills]
  );

  const allAlerts = useMemo(() => {
    const extra = [];

    // Payroll alerts (existing)
    if (employees && employees.length > 0) {
      extra.push(...generatePayrollAlerts(employees, payrollRuns, bills));
    }

    // ── VAT Return Due ──────────────────────────────────────────────────
    if (vatPeriods?.length > 0 && orgSettings?.vatReg === "Yes") {
      const openPeriod = vatPeriods.find(p => p.status === "open" || p.status === "draft");
      if (openPeriod) {
        const days = daysUntil(openPeriod.due_date);
        if (days <= 30) {
          extra.push({
            id: `vat_due_${openPeriod.id}`,
            severity: days < 0 ? "critical" : days <= 7 ? "warning" : "info",
            category: "vat",
            title: days < 0
              ? `VAT Return overdue by ${Math.abs(days)} days`
              : `VAT Return due in ${days} days`,
            description: `Period ${fmtDateShort(openPeriod.period_start)} to ${fmtDateShort(openPeriod.period_end)}`,
            actionPage: "vat",
            dismissable: days > 7,
          });
        }
      }
    }

    // ── ITSA Quarterly Update Due ───────────────────────────────────────
    if (itsaPeriods?.length > 0 && orgSettings?.bType === "Sole Trader / Freelancer") {
      const openItsaPeriod = itsaPeriods.find(
        p => p.status !== "submitted" && new Date(p.period_end) <= new Date()
      );
      if (openItsaPeriod) {
        const days = daysUntil(openItsaPeriod.submission_deadline);
        if (days <= 30) {
          extra.push({
            id: `itsa_due_${openItsaPeriod.id}`,
            severity: days < 0 ? "critical" : days <= 7 ? "warning" : "info",
            category: "itsa",
            title: days < 0
              ? `ITSA submission overdue by ${Math.abs(days)} days`
              : `ITSA quarterly update due in ${days} days`,
            description: `${openItsaPeriod.quarter} ${openItsaPeriod.tax_year}`,
            actionPage: "itsa",
            dismissable: days > 7,
          });
        }
      }
    }

    // ── Missing supply date (VAT compliance) ─────────────────────────────
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

  const visibleAlerts = useMemo(
    () => allAlerts.filter(a => !dismissedIds.includes(a.id)),
    [allAlerts, dismissedIds]
  );

  const dismissAlert = (id) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    saveDismissed(next);
  };

  if (visibleAlerts.length === 0) return (
    <div style={{ marginBottom: 16, padding: "14px 18px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 18 }}>✅</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>All clear</div>
        <div style={{ fontSize: 12, color: "#15803d" }}>No outstanding alerts. Your finances look healthy.</div>
      </div>
    </div>
  );

  return (
    <div style={{ marginBottom: 16, border: "1px solid #e8e8ec", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
      <button
        onClick={() => setAlertsOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "#f9fafb", border: "none", cursor: "pointer", fontFamily: ff, borderBottom: alertsOpen ? "1px solid #e8e8ec" : "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔔</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Smart Alerts</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
            background: visibleAlerts.some(a => a.severity === "critical") ? "#fef2f2" : visibleAlerts.some(a => a.severity === "warning") ? "#fffbeb" : "#eff6ff",
            color:      visibleAlerts.some(a => a.severity === "critical") ? "#dc2626" : visibleAlerts.some(a => a.severity === "warning") ? "#d97706" : "#2563eb",
          }}>
            {visibleAlerts.length}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{alertsOpen ? "▲" : "▼"}</span>
      </button>

      {alertsOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {visibleAlerts.map((alert, idx) => {
            const s = SEV[alert.severity];
            return (
              <div key={alert.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, padding: "11px 16px", background: s.bg, borderBottom: idx < visibleAlerts.length - 1 ? `1px solid ${s.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0, marginTop: 4 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{alert.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: s.labelColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                    </div>
                    {alert.description && <div style={{ fontSize: 11, color: "#6b7280" }}>{alert.description}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {alert.actionPage && (
                    <button
                      onClick={() => navigate(ALERT_PAGE_ROUTES[alert.actionPage] || ROUTES.DASHBOARD)}
                      style={{ fontSize: 11, fontWeight: 700, color: s.labelColor, background: "none", border: `1px solid ${s.border}`, borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontFamily: ff, whiteSpace: "nowrap" }}>
                      View →
                    </button>
                  )}
                  {alert.dismissable && (
                    <button onClick={() => dismissAlert(alert.id)} title="Dismiss"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center" }}>
                      ×
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
