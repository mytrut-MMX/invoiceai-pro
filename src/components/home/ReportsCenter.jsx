import { useState, useMemo } from "react";
import { ff } from "../../constants";
import { fmt } from "../../utils/helpers";

export default function ReportsCenter({ invoices, expenses, payments, orgSettings, currencySymbol }) {
  const [reportPeriod, setReportPeriod] = useState("this_month");

  const periodInvoices = useMemo(() => {
    const now = new Date();
    const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfQuarter   = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear      = new Date(now.getFullYear(), 0, 1);

    const inRange = (invoiceDate) => {
      const d = invoiceDate ? new Date(invoiceDate) : null;
      if (!d || Number.isNaN(d.getTime())) return reportPeriod === "all_time";
      if (reportPeriod === "this_month")   return d >= startOfMonth && d < startOfNextMonth;
      if (reportPeriod === "last_month")   return d >= startOfLastMonth && d < startOfMonth;
      if (reportPeriod === "this_quarter") return d >= startOfQuarter && d < startOfNextMonth;
      if (reportPeriod === "this_year")    return d >= startOfYear;
      return true;
    };

    return invoices.filter(inv => inRange(inv.issue_date));
  }, [invoices, reportPeriod]);

  const reportSummary = useMemo(() => {
    const now = new Date();
    const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfQuarter   = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear      = new Date(now.getFullYear(), 0, 1);

    const inRange = (dateStr) => {
      const d = dateStr ? new Date(dateStr) : null;
      if (!d || Number.isNaN(d.getTime())) return reportPeriod === "all_time";
      if (reportPeriod === "this_month")   return d >= startOfMonth && d < startOfNextMonth;
      if (reportPeriod === "last_month")   return d >= startOfLastMonth && d < startOfMonth;
      if (reportPeriod === "this_quarter") return d >= startOfQuarter && d < startOfNextMonth;
      if (reportPeriod === "this_year")    return d >= startOfYear;
      return true;
    };

    const revenue = periodInvoices
      .filter(inv => ["Paid", "Sent", "Partial"].includes(inv.status))
      .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const collected = (payments || [])
      .filter(p => {
        const d = p.date ? new Date(p.date) : null;
        if (!d || isNaN(d)) return false;
        if (reportPeriod === "this_month")   return d >= startOfMonth && d < startOfNextMonth;
        if (reportPeriod === "last_month")   return d >= startOfLastMonth && d < startOfMonth;
        if (reportPeriod === "this_quarter") return d >= startOfQuarter && d < startOfNextMonth;
        if (reportPeriod === "this_year")    return d >= startOfYear;
        return true;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const vat = periodInvoices
      .filter(inv => ["Paid", "Partial"].includes(inv.status))
      .reduce((sum, inv) => sum + (inv.taxBreakdown || []).reduce((t, tx) => t + Number(tx.amount || 0), 0), 0);
    const cis = periodInvoices.reduce((sum, inv) => sum + Number(inv.cisDeduction || 0), 0);
    const reportByStatus = periodInvoices.reduce((acc, inv) => {
      const key = inv.status || "Draft";
      if (!acc[key]) acc[key] = { count: 0, amount: 0 };
      acc[key].count += 1;
      acc[key].amount += Number(inv.total || 0);
      return acc;
    }, {});
    const totalExpenses = (expenses || [])
      .filter(e => inRange(e.date))
      .reduce((sum, e) => sum + Number(e.total || 0), 0);
    const netProfit = collected - totalExpenses;
    const inputVAT  = (expenses || [])
      .filter(e => inRange(e.date) && Number(e.tax_amount || 0) > 0)
      .reduce((sum, e) => sum + Number(e.tax_amount || 0), 0);
    const netVAT = vat - inputVAT;

    return { revenue, collected, vat, cis, reportByStatus, totalExpenses, netProfit, inputVAT, netVAT };
  }, [periodInvoices, expenses, payments, reportPeriod]);

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e8ec", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#059669" }}>Reports Center</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Overview based on selected period</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>Period</span>
          <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #e8e8ec", borderRadius: 7, fontSize: 12, fontFamily: ff, background: "#f9fafb", outline: "none", cursor: "pointer" }}>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="this_quarter">This quarter</option>
            <option value="this_year">This year</option>
            <option value="all_time">All time</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Invoices",    value: periodInvoices.length,                  color: "#059669" },
          { label: "Invoiced",    value: fmt(currencySymbol, reportSummary.revenue),    color: "#16A34A", title: "Total invoiced (Paid/Sent/Partial). Includes amounts not yet collected." },
          { label: "Collected",   value: fmt(currencySymbol, reportSummary.collected),  color: "#059669", title: "Cash actually received: sum of payments recorded in this period." },
          { label: "VAT",         value: fmt(currencySymbol, reportSummary.vat),        color: "#2563EB" },
          { label: "CIS",         value: fmt(currencySymbol, reportSummary.cis),        color: "#7C3AED" },
          { label: "Expenses",    value: fmt(currencySymbol, reportSummary.totalExpenses), color: "#DC2626" },
          { label: "Est. Profit", value: fmt(currencySymbol, reportSummary.netProfit),  color: reportSummary.netProfit >= 0 ? "#16A34A" : "#DC2626", title: "Collected payments minus expenses for this period." },
        ].map(card => (
          <div key={card.label} title={card.title || undefined} style={{ border: "1px solid #EFEFEF", borderRadius: 10, padding: "10px 12px", background: "#FCFCFC", cursor: card.title ? "help" : undefined }}>
            <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>{card.label}</div>
            <div style={{ fontSize: 16, color: card.color, fontWeight: 800, marginTop: 5 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid #e8e8ec", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", padding: "9px 12px", background: "#f9fafb", borderBottom: "1px solid #F0F0F0", fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
          <span>Status</span><span style={{ textAlign: "center" }}>Count</span><span style={{ textAlign: "right" }}>Amount</span>
        </div>
        {Object.keys(reportSummary.reportByStatus).length === 0 ? (
          <div style={{ padding: "12px", fontSize: 12, color: "#AAA", textAlign: "center" }}>No invoices in selected period.</div>
        ) : Object.entries(reportSummary.reportByStatus).map(([status, row]) => (
          <div key={status} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", padding: "9px 12px", borderBottom: "1px solid #F7F7F7", fontSize: 12, color: "#333" }}>
            <span>{status}</span>
            <span style={{ textAlign: "center" }}>{row.count}</span>
            <span style={{ textAlign: "right", fontWeight: 700 }}>{fmt(currencySymbol, row.amount)}</span>
          </div>
        ))}
      </div>

      {orgSettings?.vatReg === "Yes" && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>VAT Return Estimate</div>
            <div style={{ fontSize: 11, color: "#9A9A9A", fontStyle: "italic" }}>Verify with your accountant before filing.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
            {[
              { label: "Output VAT",  value: reportSummary.vat,      color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
              { label: "Input VAT",   value: reportSummary.inputVAT,  color: "#059669", bg: "#F0FDF4", border: "#BBF7D0" },
              { label: "Net VAT Due", value: reportSummary.netVAT,    color: reportSummary.netVAT >= 0 ? "#DC2626" : "#059669", bg: reportSummary.netVAT >= 0 ? "#FEF2F2" : "#F0FDF4", border: reportSummary.netVAT >= 0 ? "#FECACA" : "#BBF7D0" },
            ].map(card => (
              <div key={card.label} style={{ border: `1px solid ${card.border}`, borderRadius: 10, padding: "10px 12px", background: card.bg }}>
                <div style={{ fontSize: 11, color: card.color, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>{card.label}</div>
                <div style={{ fontSize: 16, color: card.color, fontWeight: 800, marginTop: 5 }}>{fmt(currencySymbol, card.value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
