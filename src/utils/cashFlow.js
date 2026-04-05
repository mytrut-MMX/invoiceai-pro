/**
 * Cash flow projection engine.
 * Projects inflows (from unpaid invoices) and outflows (from unpaid bills + recurring expenses)
 * over the next N days.
 */

/**
 * @param {object} params
 * @param {Array} params.invoices - all invoices
 * @param {Array} params.bills - all bills (purchases)
 * @param {Array} params.payments - all recorded payments
 * @param {number} [params.days=90] - projection window
 * @returns {{ weeks: Array<{ weekStart: string, inflow: number, outflow: number, net: number, runningBalance: number }>, summary: { totalInflow: number, totalOutflow: number, netCashFlow: number, lowestPoint: number, lowestPointWeek: string } }}
 */
export function projectCashFlow({ invoices = [], bills = [], payments = [], days = 90 }) {
  const today = new Date();
  const endDate = new Date(today.getTime() + days * 86400000);

  // Expected inflows: unpaid invoices due within the window
  const expectedInflows = invoices
    .filter(inv => ["Sent", "Partial", "Overdue"].includes(inv.status) && inv.due_date)
    .map(inv => ({
      date: new Date(inv.due_date),
      amount: Number(inv.total || 0),
      label: `Invoice ${inv.invoice_number}`,
      type: "inflow",
    }))
    .filter(item => item.date >= today && item.date <= endDate);

  // Expected outflows: unpaid bills due within the window
  const expectedOutflows = (bills || [])
    .filter(b => !["Paid", "Void"].includes(b.status) && b.due_date)
    .map(b => ({
      date: new Date(b.due_date),
      amount: Number(b.total || 0),
      label: `Bill ${b.bill_number || b.supplier_name}`,
      type: "outflow",
    }))
    .filter(item => item.date >= today && item.date <= endDate);

  // Group by week
  const weeks = [];
  let cursor = new Date(today);
  cursor.setDate(cursor.getDate() - cursor.getDay() + 1); // Start of this week (Monday)

  while (cursor <= endDate) {
    const weekEnd = new Date(cursor.getTime() + 6 * 86400000);

    const weekInflow = expectedInflows
      .filter(item => item.date >= cursor && item.date <= weekEnd)
      .reduce((sum, item) => sum + item.amount, 0);

    const weekOutflow = expectedOutflows
      .filter(item => item.date >= cursor && item.date <= weekEnd)
      .reduce((sum, item) => sum + item.amount, 0);

    weeks.push({
      weekStart: cursor.toISOString().split("T")[0],
      weekLabel: `${cursor.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      inflow: Math.round(weekInflow * 100) / 100,
      outflow: Math.round(weekOutflow * 100) / 100,
      net: Math.round((weekInflow - weekOutflow) * 100) / 100,
    });

    cursor = new Date(cursor.getTime() + 7 * 86400000);
  }

  // Calculate running balance
  let running = 0;
  let lowestPoint = Infinity;
  let lowestWeek = "";
  for (const week of weeks) {
    running += week.net;
    week.runningBalance = Math.round(running * 100) / 100;
    if (running < lowestPoint) {
      lowestPoint = running;
      lowestWeek = week.weekStart;
    }
  }

  const totalInflow = weeks.reduce((s, w) => s + w.inflow, 0);
  const totalOutflow = weeks.reduce((s, w) => s + w.outflow, 0);

  return {
    weeks,
    summary: {
      totalInflow: Math.round(totalInflow * 100) / 100,
      totalOutflow: Math.round(totalOutflow * 100) / 100,
      netCashFlow: Math.round((totalInflow - totalOutflow) * 100) / 100,
      lowestPoint: lowestPoint === Infinity ? 0 : Math.round(lowestPoint * 100) / 100,
      lowestPointWeek: lowestWeek,
    },
  };
}
