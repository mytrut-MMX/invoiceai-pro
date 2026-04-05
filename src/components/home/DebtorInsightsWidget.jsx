import { useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppCtx } from "../../context/AppContext";
import { analyseDebtors, generateDebtorInsights } from "../../utils/debtorInsights";
import { ROUTES } from "../../router/routes";
import { CUR_SYM } from "../../constants";

const SEV_STYLE = {
  critical: { bg: "#fef2f2", border: "#fecaca", dot: "#dc2626" },
  warning:  { bg: "#fffbeb", border: "#fde68a", dot: "#d97706" },
  info:     { bg: "#eff6ff", border: "#bfdbfe", dot: "#2563eb" },
};

export default function DebtorInsightsWidget() {
  const { invoices, payments, orgSettings } = useContext(AppCtx);
  const navigate = useNavigate();
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const debtorData = useMemo(
    () => analyseDebtors(invoices, payments),
    [invoices, payments]
  );

  const insights = useMemo(
    () => generateDebtorInsights(debtorData),
    [debtorData]
  );

  const topSlow = debtorData.filter(d => d.avgDays !== null).slice(0, 3);

  if (insights.length === 0 && topSlow.length === 0) return null;

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e8ec", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e", marginBottom: 12 }}>
        Payment Intelligence
      </div>

      {insights.slice(0, 4).map((insight, i) => {
        const s = SEV_STYLE[insight.severity] || SEV_STYLE.info;
        return (
          <div key={i} style={{ padding: "8px 12px", marginBottom: 6, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, fontSize: 12, color: "#374151", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, marginTop: 5, flexShrink: 0 }} />
            <span>{insight.message}</span>
          </div>
        );
      })}

      {topSlow.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Avg. Days to Pay
          </div>
          {topSlow.map((d, i) => (
            <div key={i}
              onClick={() => navigate(`${ROUTES.CUSTOMERS}?search=${encodeURIComponent(d.customerName)}`)}
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", fontSize: 12 }}>
              <span style={{ color: "#374151", fontWeight: 500 }}>{d.customerName}</span>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: d.avgDays > 30 ? "#dc2626" : "#059669", fontWeight: 700 }}>
                  {d.avgDays ?? "—"}d
                </span>
                {d.totalOutstanding > 0 && (
                  <span style={{ color: "#6b7280" }}>{currSym}{d.totalOutstanding.toLocaleString()} due</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
