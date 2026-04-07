import { useState, useMemo, useContext } from "react";
import { useDashboardCache } from "../hooks/useDashboardCache";
import { useDashboardModuleData } from "../hooks/useDashboardModuleData";
import { useNavigate } from "react-router-dom";
import { ff, CUR_SYM } from "../constants";
import { AppCtx } from "../context/AppContext";
import { fmt, parseCisRate } from "../utils/helpers";
import { ROUTES } from "../router/routes";
import { calculateVATReturn } from "../utils/vat/vatReturnCalculator";
import SmartAlerts from "../components/home/SmartAlerts";
import AIChatPanel from "../components/home/AIChatPanel";
import ReportsCenter from "../components/home/ReportsCenter";
import CashFlowForecast from "../components/home/CashFlowForecast";
import CashFlowWidget from "../components/home/CashFlowWidget";
import DebtorInsightsWidget from "../components/home/DebtorInsightsWidget";
import QuickActionsBar from "../components/home/QuickActionsBar";
import MonthEndChecklist from "../components/home/MonthEndChecklist";

const STAT_FILTERS = { "Outstanding": "Sent,Partial", "Overdue": "Overdue", "Paid": "Paid", "Draft": "Draft" };
const STAT_ROUTES = {
  "Bills Due": ROUTES.BILLS,
  "VAT Tracked": ROUTES.LEDGER_PL,
  "CIS Tracked": ROUTES.EXPENSES + "?filter=subcontractor",
  "Subcontractors": ROUTES.EXPENSES + "?filter=subcontractor",
  "Next VAT Return": ROUTES.VAT_RETURN,
  "ITSA Quarter": ROUTES.ITSA,
  "Next Payroll": ROUTES.PAYROLL,
  "PAYE Due": ROUTES.PAYROLL,
};

/** Estimate next pay date from frequency + pay day setting (monthly only for now). */
function calculateNextPayDate(lastPayDate, frequency, payDay) {
  // TODO: handle weekly/fortnightly — currently falls back to monthly
  const today = new Date();
  let next = new Date(today.getFullYear(), today.getMonth() + 1, 0); // last day of current month
  if (payDay === "last-working" || payDay === "last-working-day") {
    while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() - 1);
  } else if (payDay === "last-friday") {
    while (next.getDay() !== 5) next.setDate(next.getDate() - 1);
  } else if (payDay === "25th") {
    next = new Date(today.getFullYear(), today.getMonth(), 25);
  }
  // If already passed this month, move to next month
  if (next < today) {
    const nm = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    if (payDay === "last-working" || payDay === "last-working-day") {
      while (nm.getDay() === 0 || nm.getDay() === 6) nm.setDate(nm.getDate() - 1);
    } else if (payDay === "last-friday") {
      while (nm.getDay() !== 5) nm.setDate(nm.getDate() - 1);
    } else if (payDay === "25th") {
      nm.setDate(25);
    }
    return nm;
  }
  return next;
}

export default function HomePage() {
  const { user, invoices, expenses, payments, orgSettings, bills } = useContext(AppCtx);
  const navigate = useNavigate();
  const [hoveredStat, setHoveredStat] = useState(null);
  const currencySymbol = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const moduleData = useDashboardModuleData(user?.id, orgSettings);

  const stats = useDashboardCache(() => {
    const now = new Date();
    const startOfCurr = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const getAccountingDate = (inv) => { const dateStr = inv.tax_point || inv.issue_date; return dateStr ? new Date(dateStr) : null; };
    const inCurr = inv => { const d = getAccountingDate(inv); return !!d && d >= startOfCurr && d < startOfNext; };
    const inPrev = inv => { const d = getAccountingDate(inv); return !!d && d >= startOfPrev && d < startOfCurr; };
    const sumAmt = (arr, pred) => arr.filter(pred).reduce((s, i) => s + Number(i.total || 0), 0);

    const calcTrend = (curr, prev, positiveUp) => {
      if (prev === 0) return null;
      const pct = Math.round((curr - prev) / prev * 100);
      if (pct === 0) return null;
      const up = pct > 0;
      const isGood = positiveUp ? up : !up;
      return { text: `${up ? "↑" : "↓"} ${Math.abs(pct)}% vs last month`, color: isGood ? "#059669" : "#dc2626" };
    };

    const outstanding = invoices.filter(i => ["Sent", "Partial"].includes(i.status)).reduce((sum, i) => sum + Number(i.total || 0), 0);
    const overdue     = invoices.filter(i => i.status === "Overdue").reduce((sum, i) => sum + Number(i.total || 0), 0);
    const paid        = invoices.filter(i => i.status === "Paid").reduce((sum, i) => sum + Number(i.total || 0), 0);
    const draft       = invoices.filter(i => i.status === "Draft").reduce((sum, i) => sum + Number(i.total || 0), 0);
    const vatDue      = orgSettings?.vatReg === "Yes"
      ? invoices.reduce((sum, inv) => sum + (inv.taxBreakdown || []).reduce((t, tx) => t + Number(tx.amount || 0), 0), 0)
      : 0;
    const cisRate    = parseCisRate(orgSettings?.cisRate, 20) / 100;
    const cisTracked = orgSettings?.cisReg === "Yes"
      ? invoices.reduce((sum, inv) => sum + Number(inv.cisDeduction || (Number(inv.subtotal || 0) * cisRate)), 0)
      : 0;

    // Subcontractor costs from expenses
    const subLabourTotal = orgSettings?.cisReg === "Yes"
      ? expenses.filter(e => e.category === "Subcontractor Labour").reduce((s, e) => s + Number(e.total || 0), 0)
      : 0;
    const subMaterialsTotal = orgSettings?.cisReg === "Yes"
      ? expenses.filter(e => e.category === "Subcontractor Materials").reduce((s, e) => s + Number(e.total || 0), 0)
      : 0;
    const subContractorTotal = subLabourTotal + subMaterialsTotal;
    const cisRetainedFromExpenses = orgSettings?.cisReg === "Yes"
      ? expenses.filter(e => e.is_cis_expense).reduce((s, e) => {
          const rate = e.cis_rate ?? 20;
          return s + (e.cis_deduction_amount ?? (Number(e.amount || 0) * rate / 100));
        }, 0)
      : 0;

    const currInv = invoices.filter(inCurr);
    const prevInv = invoices.filter(inPrev);

    // ─── Next VAT Return KPI ────────────────────────────────────────────────
    let vatStat = null;
    if (moduleData.isVatRegistered && moduleData.vatPeriods) {
      const nextVatPeriod = moduleData.vatPeriods.find(p => p.status === "open" || p.status === "draft");
      if (nextVatPeriod) {
        let vatValue = "—";
        try {
          const vatCalc = calculateVATReturn(
            invoices, bills, expenses,
            { periodStart: nextVatPeriod.period_start, periodEnd: nextVatPeriod.period_end },
            nextVatPeriod.scheme || "Standard"
          );
          vatValue = fmt(currencySymbol, Math.abs(vatCalc.box5));
        } catch { /* calculator may fail with incomplete data */ }
        const daysUntilDue = Math.ceil((new Date(nextVatPeriod.due_date) - new Date()) / 86400000);
        const isOverdue = daysUntilDue < 0;
        const isUrgent = daysUntilDue <= 14 && daysUntilDue >= 0;
        vatStat = {
          label: "Next VAT Return",
          value: vatValue,
          sub: isOverdue ? `Overdue by ${Math.abs(daysUntilDue)} days` : `Due in ${daysUntilDue} days`,
          color: isOverdue ? "#dc2626" : isUrgent ? "#d97706" : "#2563eb",
        };
      }
    }

    // ─── ITSA Quarter KPI ───────────────────────────────────────────────────
    let itsaStat = null;
    if (moduleData.isSoleTrader && moduleData.itsaPeriods) {
      const today = new Date();
      const currentItsaPeriod = moduleData.itsaPeriods.find(p =>
        new Date(p.period_start) <= today && new Date(p.period_end) >= today
      );
      if (currentItsaPeriod) {
        const daysUntilDeadline = Math.ceil((new Date(currentItsaPeriod.submission_deadline) - today) / 86400000);
        itsaStat = {
          label: "ITSA Quarter",
          value: currentItsaPeriod.quarter || "—",
          sub: currentItsaPeriod.status === "submitted" ? "Submitted ✓" : `Due in ${daysUntilDeadline} days`,
          color: currentItsaPeriod.status === "submitted" ? "#059669" : daysUntilDeadline < 14 ? "#d97706" : "#7c3aed",
        };
      }
    }

    // ─── Next Payroll KPI ───────────────────────────────────────────────────
    let nextPayrollStat = null;
    if (moduleData.hasEmployees) {
      const lastRun = moduleData.payrollRuns?.[0];
      const nextPayDate = calculateNextPayDate(
        lastRun?.pay_date,
        orgSettings?.defaultPayFrequency || "monthly",
        orgSettings?.defaultPayDay || "last-friday"
      );
      const daysUntilPayDate = Math.ceil((nextPayDate - new Date()) / 86400000);
      const estimatedNet = lastRun?.total_net || 0;
      nextPayrollStat = {
        label: "Next Payroll",
        value: estimatedNet > 0 ? fmt(currencySymbol, estimatedNet) : "Pending",
        sub: daysUntilPayDate <= 0 ? "Due now" : `In ${daysUntilPayDate} days`,
        color: daysUntilPayDate <= 3 ? "#d97706" : "#7c3aed",
      };
    }

    // ─── PAYE Due KPI ───────────────────────────────────────────────────────
    let payeDueStat = null;
    if (moduleData.hmrcBills.length > 0) {
      const totalPayeDue = moduleData.hmrcBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
      const earliestDue = moduleData.hmrcBills[0];
      const daysUntilDue = Math.ceil((new Date(earliestDue.due_date) - new Date()) / 86400000);
      const isOverdue = daysUntilDue < 0;
      payeDueStat = {
        label: "PAYE Due",
        value: fmt(currencySymbol, totalPayeDue),
        sub: isOverdue ? `Overdue by ${Math.abs(daysUntilDue)} days` : `Due in ${daysUntilDue} days`,
        color: isOverdue ? "#dc2626" : daysUntilDue <= 7 ? "#d97706" : "#0891b2",
      };
    }

    return [
      { label: "Outstanding", value: fmt(currencySymbol, outstanding), sub: `${invoices.filter(i => ["Sent", "Partial"].includes(i.status)).length} invoices`, color: "#1e6be0",
        trend: calcTrend(sumAmt(currInv, i => ["Sent", "Partial"].includes(i.status)), sumAmt(prevInv, i => ["Sent", "Partial"].includes(i.status)), false) },
      { label: "Overdue",     value: fmt(currencySymbol, overdue),      sub: `${invoices.filter(i => i.status === "Overdue").length} invoices`, color: "#dc2626",
        trend: calcTrend(sumAmt(currInv, i => i.status === "Overdue"), sumAmt(prevInv, i => i.status === "Overdue"), false) },
      { label: "Paid",        value: fmt(currencySymbol, paid),         sub: "Received", color: "#059669",
        trend: calcTrend(sumAmt(currInv, i => i.status === "Paid"), sumAmt(prevInv, i => i.status === "Paid"), true) },
      { label: "Draft",       value: fmt(currencySymbol, draft),        sub: "Needs action", color: "#6b7280",
        trend: calcTrend(sumAmt(currInv, i => i.status === "Draft"), sumAmt(prevInv, i => i.status === "Draft"), false) },
      { label: "Bills Due",  value: fmt(currencySymbol, bills.filter(b => !["Paid","Void"].includes(b.status)).reduce((s,b) => s + Number(b.total||0), 0)),
        sub: `${bills.filter(b => b.status === "Overdue").length} overdue`, color: "#dc2626" },
      { label: "VAT Tracked", value: orgSettings?.vatReg === "Yes" ? fmt(currencySymbol, vatDue) : "Disabled", sub: orgSettings?.vatReg === "Yes" ? "Output VAT" : "Enable VAT in Settings", color: "#2563EB" },
      { label: "CIS Tracked", value: orgSettings?.cisReg === "Yes" ? fmt(currencySymbol, cisTracked) : "Disabled", sub: orgSettings?.cisReg === "Yes" ? "CIS deductions" : "Enable CIS in Settings", color: "#7C3AED" },
      ...(orgSettings?.cisReg === "Yes" ? [{
        label: "Subcontractors",
        value: fmt(currencySymbol, subContractorTotal),
        sub: cisRetainedFromExpenses > 0 ? `CIS retained: ${fmt(currencySymbol, cisRetainedFromExpenses)}` : "Subcontractor costs",
        color: "#D97706",
      }] : []),
      ...(vatStat ? [vatStat] : []),
      ...(itsaStat ? [itsaStat] : []),
      ...(nextPayrollStat ? [nextPayrollStat] : []),
      ...(payeDueStat ? [payeDueStat] : []),
    ];
  }, [invoices, expenses, bills, orgSettings, currencySymbol, moduleData.vatPeriods, moduleData.itsaPeriods, moduleData.isVatRegistered, moduleData.isSoleTrader, moduleData.hasEmployees, moduleData.payrollRuns, moduleData.hmrcBills, orgSettings?.defaultPayFrequency, orgSettings?.defaultPayDay]);

  const overdueInvoices = useMemo(() => invoices.filter(i => i.status === "Overdue"), [invoices]);

  return (
    <div style={{ padding: "clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth: 1100, fontFamily: ff, background: "#f4f5f7", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", margin: "0 0 3px" }}>
          Good morning, {user?.name?.split(" ")[0] || "there"} 👋
        </h1>
        <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Financial overview</p>
      </div>

      <QuickActionsBar />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
        {stats.map(s => {
          const filter = STAT_FILTERS[s.label];
          const route = STAT_ROUTES[s.label];
          const isDisabled = s.value === "Disabled";
          const isClickable = !isDisabled && (!!filter || !!route);
          const isHovered = hoveredStat === s.label;
          return (
            <div key={s.label}
              onClick={isClickable ? () => navigate(route || `${ROUTES.INVOICES}?status=${filter}`) : undefined}
              onMouseEnter={isClickable ? () => setHoveredStat(s.label) : undefined}
              onMouseLeave={isClickable ? () => setHoveredStat(null) : undefined}
              style={{ position: "relative", background: isHovered ? "#f8faff" : "#fff", borderRadius: 12, padding: "16px 18px", border: `1px solid ${isHovered ? "#c5d8f0" : "#e8e8ec"}`, boxShadow: isHovered ? "0 2px 8px rgba(30,107,224,0.08)" : "0 1px 3px rgba(0,0,0,0.04)", cursor: isClickable ? "pointer" : "default", transition: "all 0.15s" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#AAA", marginTop: 2 }}>{s.sub}</div>
              {s.trend && <div style={{ fontSize: 10, fontWeight: 600, color: s.trend.color, marginTop: 4 }}>{s.trend.text}</div>}
              {isClickable && <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: isHovered ? "#1e6be0" : "#d0d0d0", transition: "color 0.15s" }}>→</span>}
            </div>
          );
        })}
      </div>

      {/* Overdue alert */}
      {overdueInvoices.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#DC2626" }}>
            ⚠ You have {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? "s" : ""} totalling {fmt(currencySymbol, overdueInvoices.reduce((s, i) => s + Number(i.total || 0), 0))}.
          </span>
          <button onClick={() => navigate(ROUTES.INVOICES)}
            style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            Take action →
          </button>
        </div>
      )}

      <MonthEndChecklist />
      <SmartAlerts invoices={invoices} payments={payments} expenses={expenses} orgSettings={orgSettings} bills={bills} />
      <CashFlowWidget />
      <DebtorInsightsWidget />
      <AIChatPanel user={user} />
      <ReportsCenter invoices={invoices} expenses={expenses} payments={payments} orgSettings={orgSettings} currencySymbol={currencySymbol} />
      <CashFlowForecast invoices={invoices} payments={payments} currencySymbol={currencySymbol} />
    </div>
  );
}
