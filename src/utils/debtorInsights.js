/**
 * Debtor intelligence — analyses payment patterns per customer.
 */

/**
 * Calculate average debtor days per customer.
 * Debtor days = average number of days between invoice issue and payment.
 *
 * @param {Array} invoices
 * @param {Array} payments
 * @returns {Array<{ customerId, customerName, avgDays, invoiceCount, totalOutstanding, oldestOverdueDays }>}
 */
export function analyseDebtors(invoices, payments) {
  const customerMap = {};

  for (const inv of invoices) {
    const custId = inv.customer?.id || inv.customer?.name || "unknown";
    const custName = inv.customer?.name || "Unknown";

    if (!customerMap[custId]) {
      customerMap[custId] = {
        customerId: custId,
        customerName: custName,
        paidDays: [],
        outstanding: 0,
        overdueInvoices: [],
      };
    }

    const entry = customerMap[custId];

    if (inv.status === "Paid") {
      const payment = payments.find(
        (p) => p.invoice_number === inv.invoice_number || p.invoice_id === inv.id
      );
      if (payment && inv.issue_date) {
        const issued = new Date(inv.issue_date);
        const paid = new Date(payment.date);
        const days = Math.max(0, Math.floor((paid - issued) / (1000 * 60 * 60 * 24)));
        entry.paidDays.push(days);
      }
    } else if (["Sent", "Partial", "Overdue"].includes(inv.status)) {
      entry.outstanding += Number(inv.total || 0);
      if (inv.status === "Overdue" && inv.due_date) {
        const overdueDays = Math.floor((Date.now() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
        entry.overdueInvoices.push({ number: inv.invoice_number, days: overdueDays, amount: Number(inv.total || 0) });
      }
    }
  }

  return Object.values(customerMap)
    .map((entry) => ({
      customerId: entry.customerId,
      customerName: entry.customerName,
      avgDays: entry.paidDays.length > 0
        ? Math.round(entry.paidDays.reduce((a, b) => a + b, 0) / entry.paidDays.length)
        : null,
      invoiceCount: entry.paidDays.length,
      totalOutstanding: Math.round(entry.outstanding * 100) / 100,
      oldestOverdueDays: entry.overdueInvoices.length > 0
        ? Math.max(...entry.overdueInvoices.map((o) => o.days))
        : 0,
      overdueCount: entry.overdueInvoices.length,
    }))
    .filter((e) => e.invoiceCount > 0 || e.totalOutstanding > 0)
    .sort((a, b) => (b.avgDays || 0) - (a.avgDays || 0));
}

/**
 * Generate actionable insights from debtor analysis.
 * @param {Array} debtorData - output of analyseDebtors
 * @param {number} [avgDaysThreshold=30] - days threshold for "slow payer" warning
 * @returns {Array<{ type: string, message: string, severity: string }>}
 */
export function generateDebtorInsights(debtorData, avgDaysThreshold = 30) {
  const insights = [];

  const allDays = debtorData.filter((d) => d.avgDays !== null).map((d) => d.avgDays);
  if (allDays.length >= 3) {
    const overallAvg = Math.round(allDays.reduce((a, b) => a + b, 0) / allDays.length);
    insights.push({
      type: "average_debtor_days",
      message: `Your average debtor days are ${overallAvg} days. ${overallAvg > avgDaysThreshold ? "Consider tightening payment terms." : "This is within healthy range."}`,
      severity: overallAvg > avgDaysThreshold ? "warning" : "info",
      value: overallAvg,
    });
  }

  const slowPayers = debtorData.filter((d) => d.avgDays && d.avgDays > avgDaysThreshold);
  if (slowPayers.length > 0) {
    insights.push({
      type: "slow_payers",
      message: `${slowPayers.length} customer(s) pay slower than ${avgDaysThreshold} days on average: ${slowPayers.slice(0, 3).map((s) => `${s.customerName} (${s.avgDays}d)`).join(", ")}`,
      severity: "warning",
      customers: slowPayers.slice(0, 5),
    });
  }

  const multipleOverdue = debtorData.filter((d) => d.overdueCount >= 2);
  for (const cust of multipleOverdue.slice(0, 3)) {
    insights.push({
      type: "repeat_offender",
      message: `${cust.customerName} has ${cust.overdueCount} overdue invoices totalling £${cust.totalOutstanding.toLocaleString()}. Consider requiring upfront payment.`,
      severity: "critical",
    });
  }

  return insights;
}
