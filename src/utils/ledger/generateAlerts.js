// generateAlerts — pure function, no Supabase needed.
// Runs entirely on localStorage data passed in from context.
import { normalizeCurrencyCode } from "../../constants";

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const daysBetween = (a, b) => Math.round((b - a) / 86400000);

let _uid = 0;
const uid = (prefix) => `${prefix}_${++_uid}`;

export function generateAlerts(invoices = [], payments = [], expenses = [], orgSettings = {}) {
  const alerts = [];
  const today = todayMidnight();
  const currencyCode = normalizeCurrencyCode(orgSettings?.currency, "GBP");

  // ─── 1. OVERDUE TIERS ──────────────────────────────────────────────────────
  for (const inv of invoices) {
    if (inv.status !== "Overdue") continue;
    const due = parseDate(inv.due_date);
    if (!due) continue;
    const daysOverdue = daysBetween(due, today);
    const num = inv.number || inv.id;
    const amt = inv.total || 0;

    if (daysOverdue > 30) {
      alerts.push({
        id: uid("overdue_critical"),
        severity: "critical",
        category: "overdue",
        title: `Invoice ${num} is ${daysOverdue} days overdue`,
        description: `${Number(amt).toLocaleString("en-GB", { style:"currency", currency: currencyCode })} at risk`,
        actionPage: "invoices",
        dismissable: false,
      });
    } else if (daysOverdue >= 8) {
      alerts.push({
        id: uid("overdue_warning"),
        severity: "warning",
        category: "overdue",
        title: `Invoice ${num} due ${daysOverdue} days ago`,
        description: "Follow up to avoid escalation",
        actionPage: "invoices",
        dismissable: true,
      });
    }
  }

  // ─── 1b. DUE SOON (≤ 3 days) ───────────────────────────────────────────────
  for (const inv of invoices) {
    if (!["Sent", "Partial"].includes(inv.status)) continue;
    const due = parseDate(inv.due_date);
    if (!due) continue;
    const daysUntilDue = daysBetween(today, due);
    if (daysUntilDue >= 0 && daysUntilDue <= 3) {
      const num = inv.number || inv.id;
      const label = daysUntilDue === 0 ? "today" : `in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
      alerts.push({
        id: uid("due_soon"),
        severity: "info",
        category: "due_soon",
        title: `Invoice ${num} due ${label}`,
        description: "Send a reminder to your customer",
        actionPage: "invoices",
        dismissable: true,
      });
    }
  }

  // ─── 2. CASH RUNWAY ────────────────────────────────────────────────────────
  const now = Date.now();
  const ms90 = 90 * 86400000;
  const ms30 = 30 * 86400000;

  const recentExpenses = expenses.filter(e => {
    const d = parseDate(e.date);
    return d && now - d.getTime() <= ms90;
  });
  const avgMonthlyExpenses = recentExpenses.reduce((s, e) => s + Number(e.total || 0), 0) / 3;

  const cashReceived = payments
    .filter(p => {
      const d = parseDate(p.date);
      return d && now - d.getTime() <= ms30;
    })
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  if (avgMonthlyExpenses > 0 && cashReceived < avgMonthlyExpenses) {
    alerts.push({
      id: uid("cash_runway"),
      severity: "warning",
      category: "cash_flow",
      title: "Cash inflow below average monthly expenses",
      description: `Received ${Number(cashReceived).toLocaleString("en-GB", { style:"currency", currency: currencyCode })} this month vs avg ${Number(avgMonthlyExpenses).toLocaleString("en-GB", { style:"currency", currency: currencyCode })}/mo`,
      actionPage: "payments",
      dismissable: true,
    });
  }

  // ─── 3. MISSING RECEIPTS ───────────────────────────────────────────────────
  const missingReceipts = expenses.filter(
    e => e.expense_type === "regular" &&
         e.status !== "Reimbursed" &&
         (!e.receipt || e.receipt === "")
  );
  if (missingReceipts.length > 0) {
    alerts.push({
      id: uid("missing_receipts"),
      severity: "info",
      category: "expenses",
      title: `${missingReceipts.length} expense${missingReceipts.length === 1 ? "" : "s"} missing receipts`,
      description: "Attach receipts to keep your records compliant",
      actionPage: "expenses",
      dismissable: true,
    });
  }

  // ─── 4. NO INVOICES THIS MONTH ─────────────────────────────────────────────
  const t = new Date();
  if (t.getDate() > 10) {
    const ym = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthInvoices = invoices.filter(i => (i.issue_date || "").startsWith(ym));
    if (thisMonthInvoices.length === 0) {
      alerts.push({
        id: uid("no_invoices"),
        severity: "info",
        category: "invoices",
        title: "No invoices created this month",
        description: "Is this expected? Create an invoice to get paid.",
        actionPage: "invoices:new",
        dismissable: true,
      });
    }
  }

  // ─── 5. LARGE UNRECONCILED PAYMENT ────────────────────────────────────────
  const largeUnreconciled = payments.filter(
    p => Number(p.amount || 0) > 5000 && p.status === "Pending"
  );
  for (const p of largeUnreconciled) {
    const amt = Number(p.amount).toLocaleString("en-GB", { style:"currency", currency: currencyCode });
    const who = p.customer_name || p.customer || "unknown customer";
    alerts.push({
      id: uid("large_unreconciled"),
      severity: "warning",
      category: "payments",
      title: `Payment of ${amt} is unreconciled`,
      description: `From ${who} — mark as received once confirmed`,
      actionPage: "payments",
      dismissable: true,
    });
  }

  // ─── 6. CIS RETAINED THIS MONTH ─────────────────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7);
  const cisLabourExpensesThisMonth = expenses.filter(e =>
    e.is_cis_expense && (e.date || "").startsWith(currentMonth)
  );
  const totalCISRetained = cisLabourExpensesThisMonth.reduce((s, e) => {
    const rate = e.cis_rate ?? 20;
    return s + (e.cis_deduction_amount ?? (Number(e.amount || 0) * rate / 100));
  }, 0);

  if (totalCISRetained > 0) {
    alerts.push({
      id: uid("cis_retained"),
      severity: "warning",
      category: "tax",
      title: `£${totalCISRetained.toFixed(2)} CIS retained this month`,
      description: `CIS deducted from ${cisLabourExpensesThisMonth.length} subcontractor payment(s). Due to HMRC by 19th of next month.`,
      actionPage: "expenses",
      dismissable: false,
    });
  }

  // Sort: critical → warning → info
  const ORDER = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  return alerts;
}
