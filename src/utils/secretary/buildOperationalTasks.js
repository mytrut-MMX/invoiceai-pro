// Operational tasks — aggregates the user's pending day-to-day work.
// Pure function: (data, today) → operationalItem[].
// Each task is one aggregated card, never one-per-record.

function daysBetween(fromISO, toISO) {
  const from = new Date(fromISO + "T00:00:00Z");
  const to   = new Date(toISO   + "T00:00:00Z");
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

function fmtCurrency(n) {
  const v = Math.round(Number(n) || 0);
  return `£${v.toLocaleString("en-GB")}`;
}

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : (pluralForm || singular + "s");
}

// SBA stored status: lowercase string 'pending_countersign'
// (constant in src/constants/selfBilling.js — verified directly).
const SBA_PENDING = "pending_countersign";

export function buildOperationalTasks(data, todayISO) {
  const invoices   = data?.invoices   || [];
  const bills      = data?.bills      || [];
  const expenses   = data?.expenses   || [];
  const agreements = data?.agreements || [];
  const out = [];

  // 1. Overdue invoices
  const overdueInvoices = invoices.filter(i =>
    ["Sent", "Partial", "Overdue"].includes(i.status) &&
    i.due_date && i.due_date < todayISO
  );
  if (overdueInvoices.length > 0) {
    const total = overdueInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const oldestDays = Math.max(
      ...overdueInvoices.map(i => Math.abs(daysBetween(i.due_date, todayISO)))
    );
    out.push({
      id: "ops-overdue-invoices",
      category: "operational",
      obligation: "overdue_invoices",
      severity: oldestDays > 30 ? "critical" : "warning",
      title: `${overdueInvoices.length} overdue ${plural(overdueInvoices.length, "invoice")}`,
      description: `${fmtCurrency(total)} outstanding, oldest ${oldestDays} days overdue.`,
      count: overdueInvoices.length,
      total,
      action_label: "Chase customers",
      action_route: "/invoices?filter=overdue",
    });
  }

  // 2. Bills due in next 7 days
  const billsDueSoon = bills.filter(b =>
    b.status !== "Paid" && b.due_date &&
    b.due_date >= todayISO &&
    daysBetween(todayISO, b.due_date) <= 7
  );
  if (billsDueSoon.length > 0) {
    const total = billsDueSoon.reduce((s, b) => s + (Number(b.total) || 0), 0);
    out.push({
      id: "ops-bills-due-soon",
      category: "operational",
      obligation: "bills_due_soon",
      severity: "warning",
      title: `${billsDueSoon.length} ${plural(billsDueSoon.length, "bill")} due in 7 days`,
      description: `${fmtCurrency(total)} payable to suppliers within the next week.`,
      count: billsDueSoon.length,
      total,
      action_label: "Open Bills",
      action_route: "/bills",
    });
  }

  // 3. Bills overdue
  const overdueBills = bills.filter(b =>
    b.status !== "Paid" && b.due_date && b.due_date < todayISO
  );
  if (overdueBills.length > 0) {
    const total = overdueBills.reduce((s, b) => s + (Number(b.total) || 0), 0);
    const oldestDays = Math.max(
      ...overdueBills.map(b => Math.abs(daysBetween(b.due_date, todayISO)))
    );
    out.push({
      id: "ops-overdue-bills",
      category: "operational",
      obligation: "overdue_bills",
      severity: "critical",
      title: `${overdueBills.length} overdue ${plural(overdueBills.length, "bill")}`,
      description: `${fmtCurrency(total)} payable, oldest ${oldestDays} days overdue.`,
      count: overdueBills.length,
      total,
      action_label: "Open Bills",
      action_route: "/bills",
    });
  }

  // 4. Expenses without receipt
  const noReceipt = expenses.filter(e => !e.receipt || !String(e.receipt).trim());
  if (noReceipt.length > 0) {
    out.push({
      id: "ops-expenses-no-receipt",
      category: "operational",
      obligation: "expenses_missing_receipt",
      severity: "info",
      title: `${noReceipt.length} ${plural(noReceipt.length, "expense")} missing receipts`,
      description: "HMRC requires receipt evidence for tax-deductible expenses.",
      count: noReceipt.length,
      action_label: "Open Expenses",
      action_route: "/expenses",
    });
  }

  // 5. Expenses without category
  const uncategorised = expenses.filter(e => !e.category || !String(e.category).trim());
  if (uncategorised.length > 0) {
    out.push({
      id: "ops-expenses-no-category",
      category: "operational",
      obligation: "expenses_missing_category",
      severity: "info",
      title: `${uncategorised.length} uncategorised ${plural(uncategorised.length, "expense")}`,
      description: "Categorise expenses so they appear on the correct line of your tax return.",
      count: uncategorised.length,
      action_label: "Open Expenses",
      action_route: "/expenses",
    });
  }

  // 6. Pending self-billing signatures
  const pendingSbas = agreements.filter(a => a.status === SBA_PENDING);
  if (pendingSbas.length > 0) {
    out.push({
      id: "ops-pending-sbas",
      category: "operational",
      obligation: "sba_pending_signature",
      severity: "info",
      title: `${pendingSbas.length} self-billing ${plural(pendingSbas.length, "agreement")} awaiting signature`,
      description: "Customers haven't yet countersigned. Self-billing only takes effect once signed.",
      count: pendingSbas.length,
      action_label: "Open Self-Billing",
      action_route: "/dashboard",
    });
  }

  return out;
}
