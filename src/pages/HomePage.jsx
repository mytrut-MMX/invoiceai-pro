import { useState, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ff, CUR_SYM } from "../constants";
import { AppCtx } from "../context/AppContext";
import { fmt, parseCisRate } from "../utils/helpers";
import { ROUTES } from "../router/routes";
import SmartAlerts from "../components/home/SmartAlerts";
import AIChatPanel from "../components/home/AIChatPanel";
import ReportsCenter from "../components/home/ReportsCenter";
import CashFlowForecast from "../components/home/CashFlowForecast";
import CashFlowWidget from "../components/home/CashFlowWidget";

const STAT_FILTERS = { "Outstanding": "Sent", "Overdue": "Overdue", "Paid": "Paid", "Draft": "Draft" };
const STAT_ROUTES = { "Subcontractors": ROUTES.EXPENSES };

export default function HomePage() {
  const { user, invoices, expenses, payments, orgSettings, bills } = useContext(AppCtx);
  const navigate = useNavigate();
  const [hoveredStat, setHoveredStat] = useState(null);
  const currencySymbol = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const stats = useMemo(() => {
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
    ];
  }, [invoices, expenses, bills, orgSettings, currencySymbol]);

  const overdueInvoices = invoices.filter(i => i.status === "Overdue");

  return (
    <div style={{ padding: "clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth: 1100, fontFamily: ff, background: "#f4f5f7", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", margin: "0 0 3px" }}>
          Good morning, {user?.name?.split(" ")[0] || "there"} 👋
        </h1>
        <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Financial overview</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
        {stats.map(s => {
          const filter = STAT_FILTERS[s.label];
          const route = STAT_ROUTES[s.label];
          const isClickable = !!filter || !!route;
          return (
            <div key={s.label}
              onClick={isClickable ? () => navigate(route || `${ROUTES.INVOICES}?status=${filter}`) : undefined}
              onMouseEnter={isClickable ? () => setHoveredStat(s.label) : undefined}
              onMouseLeave={isClickable ? () => setHoveredStat(null) : undefined}
              style={{ background: hoveredStat === s.label ? "#f8faff" : "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #e8e8ec", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: isClickable ? "pointer" : "default", transition: "background 0.15s" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#AAA", marginTop: 2 }}>{s.sub}</div>
              {s.trend && <div style={{ fontSize: 10, fontWeight: 600, color: s.trend.color, marginTop: 4 }}>{s.trend.text}</div>}
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

      <SmartAlerts invoices={invoices} payments={payments} expenses={expenses} orgSettings={orgSettings} bills={bills} />
      <CashFlowWidget />
      <AIChatPanel user={user} />
      <ReportsCenter invoices={invoices} expenses={expenses} payments={payments} orgSettings={orgSettings} currencySymbol={currencySymbol} />
      <CashFlowForecast invoices={invoices} payments={payments} currencySymbol={currencySymbol} />
    </div>
  );
}
