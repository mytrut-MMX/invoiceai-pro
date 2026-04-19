import { useState, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CUR_SYM } from "../constants";
import { AppCtx } from "../context/AppContext";
import { fmt } from "../utils/helpers";
import { useDashboardModuleData } from "../hooks/useDashboardModuleData";
import { ROUTES } from "../router/routes";
import { Icons } from "../components/icons";
import SmartAlerts from "../components/home/SmartAlerts";
import CashFlowWidget from "../components/home/CashFlowWidget";
import NeedsAttention from "../components/home/NeedsAttention";
import RecentInvoices from "../components/home/RecentInvoices";
import MonthEndChecklist from "../components/home/MonthEndChecklist";
import { DashboardSkeleton } from "../components/ui/Skeleton";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: "this_month",   label: "This month" },
  { value: "last_month",   label: "Last month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "last_quarter", label: "Last quarter" },
  { value: "this_year",    label: "This year" },
];

function startOfMonth(d)      { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)        { return new Date(d.getFullYear(), d.getMonth() + 1, 1); }
function addMonths(d, n)      { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function startOfQuarter(d)    { return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1); }
function addQuarters(d, n)    { return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + n * 3, 1); }

function getPeriodRange(period) {
  const now = new Date();
  switch (period) {
    case "this_month": {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return { start, end, prevStart: addMonths(start, -1), prevEnd: start };
    }
    case "last_month": {
      const start = addMonths(startOfMonth(now), -1);
      const end = startOfMonth(now);
      return { start, end, prevStart: addMonths(start, -1), prevEnd: start };
    }
    case "this_quarter": {
      const start = startOfQuarter(now);
      const end = addQuarters(start, 1);
      return { start, end, prevStart: addQuarters(start, -1), prevEnd: start };
    }
    case "last_quarter": {
      const start = addQuarters(startOfQuarter(now), -1);
      const end = startOfQuarter(now);
      return { start, end, prevStart: addQuarters(start, -1), prevEnd: start };
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      return { start, end, prevStart: new Date(now.getFullYear() - 1, 0, 1), prevEnd: start };
    }
    default: {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return { start, end, prevStart: addMonths(start, -1), prevEnd: start };
    }
  }
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sumInRange(items, dateField, start, end) {
  let total = 0;
  for (const it of items) {
    const d = parseDate(it[dateField]);
    if (!d) continue;
    if (d >= start && d < end) total += Number(it.total ?? it.amount ?? 0);
  }
  return total;
}

function pctDelta(current, prev) {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, delta, onClick }) {
  const clickable = typeof onClick === "function";
  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={[
        "bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[13px] shadow-[var(--shadow-sm)] text-left w-full",
        "transition-colors duration-150",
        clickable
          ? "cursor-pointer hover:border-[var(--border-default)] hover:bg-[var(--surface-sunken)]"
          : "cursor-default",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--text-tertiary)] flex">
          <Icon />
        </span>
        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-[var(--text-primary)] tabular-nums">
        {value}
      </div>
      {delta && (
        <div className="text-xs mt-1 flex items-center gap-1">
          <span className={delta.tone === "positive" ? "text-[var(--success-600)]" : delta.tone === "negative" ? "text-[var(--danger-600)]" : "text-[var(--text-tertiary)]"}>
            {delta.value}
          </span>
          {delta.caption && <span className="text-[var(--text-tertiary)]">{delta.caption}</span>}
        </div>
      )}
    </button>
  );
}

// ─── HomePage ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, invoices, expenses, payments, bills, orgSettings, businessDataHydrated } = useContext(AppCtx);
  const navigate = useNavigate();
  const [period, setPeriod] = useState("this_month");
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const moduleData = useDashboardModuleData(user?.id, orgSettings);

  const kpis = useMemo(() => {
    const { start, end, prevStart, prevEnd } = getPeriodRange(period);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    // ── Cash position (all time) ──
    const allPaidIn = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const allPaidOut = (bills || [])
      .filter(b => b.status === "Paid")
      .reduce((s, b) => s + Number(b.total || 0), 0)
      + (expenses || []).reduce((s, e) => s + Number(e.total || 0), 0);
    const cashPosition = allPaidIn - allPaidOut;

    // Cash position 30 days ago
    const paidIn30 = payments
      .filter(p => { const d = parseDate(p.date); return d && d < thirtyDaysAgo; })
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const paidOut30 = (bills || [])
      .filter(b => { const d = parseDate(b.paid_date); return b.status === "Paid" && d && d < thirtyDaysAgo; })
      .reduce((s, b) => s + Number(b.total || 0), 0)
      + (expenses || [])
        .filter(e => { const d = parseDate(e.date); return d && d < thirtyDaysAgo; })
        .reduce((s, e) => s + Number(e.total || 0), 0);
    const cashPosition30 = paidIn30 - paidOut30;
    const cashDelta = cashPosition - cashPosition30;

    // ── Money in (period) ──
    const moneyIn = sumInRange(payments, "date", start, end);
    const moneyInPrev = sumInRange(payments, "date", prevStart, prevEnd);
    const moneyInPct = pctDelta(moneyIn, moneyInPrev);

    // ── Money out (period) ──
    const paidBillsInPeriod = (bills || [])
      .filter(b => b.status === "Paid")
      .reduce((s, b) => {
        const d = parseDate(b.paid_date);
        if (!d || d < start || d >= end) return s;
        return s + Number(b.total || 0);
      }, 0);
    const paidBillsPrev = (bills || [])
      .filter(b => b.status === "Paid")
      .reduce((s, b) => {
        const d = parseDate(b.paid_date);
        if (!d || d < prevStart || d >= prevEnd) return s;
        return s + Number(b.total || 0);
      }, 0);
    const expensesInPeriod = sumInRange(expenses || [], "date", start, end);
    const expensesPrev = sumInRange(expenses || [], "date", prevStart, prevEnd);
    const moneyOut = paidBillsInPeriod + expensesInPeriod;
    const moneyOutPrev = paidBillsPrev + expensesPrev;
    const moneyOutPct = pctDelta(moneyOut, moneyOutPrev);

    // ── Overdue (current) ──
    const overdueInvoices = invoices.filter(i => i.status === "Overdue");
    const overdueTotal = overdueInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const overdueCount = overdueInvoices.length;

    return {
      cashPosition: {
        value: fmt(currSym, cashPosition),
        delta: {
          tone: cashDelta >= 0 ? "positive" : "negative",
          value: `${cashDelta >= 0 ? "+" : "−"}${fmt(currSym, Math.abs(cashDelta))}`,
          caption: "vs 30 days ago",
        },
      },
      moneyIn: {
        value: fmt(currSym, moneyIn),
        delta: moneyInPct === null
          ? { tone: "neutral", value: "—", caption: "no prior data" }
          : {
              tone: moneyInPct >= 0 ? "positive" : "negative",
              value: `${moneyInPct >= 0 ? "↑" : "↓"} ${Math.abs(moneyInPct)}%`,
              caption: "vs prev period",
            },
      },
      moneyOut: {
        value: fmt(currSym, moneyOut),
        delta: moneyOutPct === null
          ? { tone: "neutral", value: "—", caption: "no prior data" }
          : {
              tone: moneyOutPct >= 0 ? "negative" : "positive",
              value: `${moneyOutPct >= 0 ? "↑" : "↓"} ${Math.abs(moneyOutPct)}%`,
              caption: "vs prev period",
            },
      },
      overdue: {
        value: fmt(currSym, overdueTotal),
        delta: {
          tone: overdueCount > 0 ? "negative" : "neutral",
          value: `${overdueCount} invoice${overdueCount !== 1 ? "s" : ""}`,
        },
      },
    };
  }, [invoices, bills, expenses, payments, period, currSym]);

  if (!businessDataHydrated) {
    return (
      <div className="max-w-[1280px] mx-auto px-[13px] sm:px-[21px] py-[21px]">
        <DashboardSkeleton />
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "there";
  const dateLine = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="p-[13px] sm:p-[21px] lg:p-[34px] max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-[13px] mb-[21px] flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{dateLine}</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="period-select" className="text-xs font-medium text-[var(--text-secondary)]">
            Period
          </label>
          <select
            id="period-select"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]"
          >
            {PERIOD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[13px] mb-[21px]">
        <KPICard icon={Icons.Bank}     label="Cash position" value={kpis.cashPosition.value} delta={kpis.cashPosition.delta} />
        <KPICard icon={Icons.Download} label="Money in"      value={kpis.moneyIn.value}      delta={kpis.moneyIn.delta} />
        <KPICard icon={Icons.Send}     label="Money out"     value={kpis.moneyOut.value}     delta={kpis.moneyOut.delta} />
        <KPICard icon={Icons.Alert}    label="Overdue"       value={kpis.overdue.value}      delta={kpis.overdue.delta}
                 onClick={() => navigate(`${ROUTES.INVOICES}?status=Overdue`)} />
      </div>

      {/* 2/3 + 1/3 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[13px] mb-[13px]">
        <div className="lg:col-span-2 space-y-[13px]">
          <CashFlowWidget />
          <RecentInvoices invoices={invoices} orgSettings={orgSettings} />
        </div>
        <div className="space-y-[13px]">
          <NeedsAttention
            invoices={invoices}
            bills={bills || []}
            orgSettings={orgSettings}
            moduleData={moduleData}
          />
          <MonthEndChecklist />
        </div>
      </div>

      {/* Full-width smart alerts (only renders when there are alerts) */}
      <SmartAlerts
        invoices={invoices}
        payments={payments}
        expenses={expenses}
        orgSettings={orgSettings}
        bills={bills}
        vatPeriods={moduleData.vatPeriods}
        itsaPeriods={moduleData.itsaPeriods}
        payrollRuns={moduleData.payrollRuns}
        employees={moduleData.employees}
      />
    </div>
  );
}
