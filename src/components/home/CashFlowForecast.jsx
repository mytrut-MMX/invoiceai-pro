import { useMemo } from "react";
import { fmt } from "../../utils/helpers";

export default function CashFlowForecast({ invoices, payments, currencySymbol }) {
  const cashFlow = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d30   = new Date(today); d30.setDate(today.getDate() + 30);
    const d60   = new Date(today); d60.setDate(today.getDate() + 60);
    const d90   = new Date(today); d90.setDate(today.getDate() + 90);

    const buckets = { overdue: 0, next30: 0, next60: 0, next90: 0 };

    invoices
      .filter(inv => (inv.status === "Sent" || inv.status === "Partial" || inv.status === "Overdue") && inv.due_date)
      .forEach(inv => {
        const due  = new Date(inv.due_date); due.setHours(0, 0, 0, 0);
        const paid = (payments || [])
          .filter(p => p.invoice_id === inv.id)
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        const outstanding = Math.max(0, Number(inv.total || 0) - paid);
        if (outstanding === 0) return;
        if (due < today)      buckets.overdue += outstanding;
        else if (due <= d30)  buckets.next30  += outstanding;
        else if (due <= d60)  buckets.next60  += outstanding;
        else if (due <= d90)  buckets.next90  += outstanding;
      });

    const total = buckets.overdue + buckets.next30 + buckets.next60 + buckets.next90;
    return { ...buckets, total };
  }, [invoices, payments]);

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e8ec", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "14px 16px", marginTop: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1A1A" }}>Cash Flow Forecast</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Outstanding invoices by due date · net of payments received</div>
      </div>

      {cashFlow.total === 0 ? (
        <div style={{ fontSize: 13, color: "#AAA", textAlign: "center", padding: "20px 0" }}>No outstanding invoices.</div>
      ) : (<>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Overdue",      value: cashFlow.overdue, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
            { label: "Next 30 days", value: cashFlow.next30,  color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
            { label: "31–60 days",   value: cashFlow.next60,  color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
            { label: "61–90 days",   value: cashFlow.next90,  color: "#475569", bg: "#F8FAFC", border: "#E2E8F0" },
          ].map(b => (
            <div key={b.label} style={{ border: `1px solid ${b.border}`, borderRadius: 10, padding: "12px 14px", background: b.bg }}>
              <div style={{ fontSize: 11, color: b.color, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6 }}>{b.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: b.color }}>{fmt(currencySymbol, b.value)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "Overdue",      value: cashFlow.overdue, color: "#DC2626" },
            { label: "Next 30 days", value: cashFlow.next30,  color: "#D97706" },
            { label: "31–60 days",   value: cashFlow.next60,  color: "#2563EB" },
            { label: "61–90 days",   value: cashFlow.next90,  color: "#475569" },
          ].filter(b => b.value > 0).map(b => (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 90, fontSize: 11, color: "#6b7280", fontWeight: 600, flexShrink: 0, textAlign: "right" }}>{b.label}</div>
              <div style={{ flex: 1, background: "#F1F5F9", borderRadius: 4, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((b.value / cashFlow.total) * 100)}%`, height: "100%", background: b.color, borderRadius: 4, transition: "width 0.4s ease" }} />
              </div>
              <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: b.color, textAlign: "right", flexShrink: 0 }}>{fmt(currencySymbol, b.value)}</div>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}
