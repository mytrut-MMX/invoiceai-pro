import { useMemo, useContext } from "react";
import { AppCtx } from "../../context/AppContext";
import { projectCashFlow } from "../../utils/cashFlow";
import { ff, CUR_SYM } from "../../constants";

export default function CashFlowWidget() {
  const { invoices, bills = [], payments, orgSettings } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const projection = useMemo(
    () => projectCashFlow({ invoices, bills, payments, days: 90 }),
    [invoices, bills, payments]
  );

  const maxVal = Math.max(
    ...projection.weeks.map(w => Math.max(Math.abs(w.inflow), Math.abs(w.outflow))),
    1
  );

  const { summary } = projection;

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e8ec", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Cash Flow Forecast</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Next 90 days projection</div>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          Net: <span style={{ fontWeight: 700, color: summary.netCashFlow >= 0 ? "#059669" : "#dc2626" }}>
            {currSym}{Math.abs(summary.netCashFlow).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ padding: "8px 10px", background: "#f0fdf4", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#059669", fontWeight: 700 }}>EXPECTED IN</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#059669" }}>{currSym}{summary.totalInflow.toLocaleString()}</div>
        </div>
        <div style={{ padding: "8px 10px", background: "#fef2f2", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700 }}>EXPECTED OUT</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#dc2626" }}>{currSym}{summary.totalOutflow.toLocaleString()}</div>
        </div>
        <div style={{ padding: "8px 10px", background: summary.lowestPoint < 0 ? "#fef2f2" : "#f9fafb", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700 }}>LOWEST POINT</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: summary.lowestPoint < 0 ? "#dc2626" : "#374151" }}>
            {currSym}{Math.abs(summary.lowestPoint).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80 }}>
        {projection.weeks.slice(0, 13).map((w, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 1, height: 60, justifyContent: "flex-end" }}>
              {w.inflow > 0 && (
                <div style={{ height: Math.max(2, (w.inflow / maxVal) * 50), background: "#34d399", borderRadius: 2 }} title={`In: ${currSym}${w.inflow}`} />
              )}
              {w.outflow > 0 && (
                <div style={{ height: Math.max(2, (w.outflow / maxVal) * 50), background: "#f87171", borderRadius: 2 }} title={`Out: ${currSym}${w.outflow}`} />
              )}
            </div>
            <div style={{ fontSize: 8, color: "#9ca3af", whiteSpace: "nowrap" }}>{w.weekLabel}</div>
          </div>
        ))}
      </div>

      {projection.weeks.length === 0 && (
        <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
          No upcoming invoices or bills to project. Create invoices to see your cash flow forecast.
        </div>
      )}
    </div>
  );
}
