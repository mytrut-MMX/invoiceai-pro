import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ff } from "../../constants";
import { generateAlerts } from "../../utils/ledger/generateAlerts";
import { ROUTES } from "../../router/routes";

const ALERT_PAGE_ROUTES = {
  "invoices":     ROUTES.INVOICES,
  "invoices:new": ROUTES.INVOICES_NEW,
  "payments":     ROUTES.PAYMENTS,
  "expenses":     ROUTES.EXPENSES,
  "bills":        ROUTES.BILLS,
};

const LS_DISMISSED_KEY = "invoicesaga_dismissed_alerts";
const getDismissed = () => { try { return JSON.parse(localStorage.getItem(LS_DISMISSED_KEY) || "[]"); } catch { return []; } };
const saveDismissed = (ids) => { try { localStorage.setItem(LS_DISMISSED_KEY, JSON.stringify(ids)); } catch {} };

const SEV = {
  critical: { bg: "#fef2f2", border: "#fecaca", dot: "#dc2626", label: "Critical", labelColor: "#dc2626" },
  warning:  { bg: "#fffbeb", border: "#fde68a", dot: "#d97706", label: "Warning",  labelColor: "#d97706" },
  info:     { bg: "#eff6ff", border: "#bfdbfe", dot: "#2563eb", label: "Info",     labelColor: "#2563eb" },
};

export default function SmartAlerts({ invoices, payments, expenses, orgSettings, bills }) {
  const navigate = useNavigate();
  const [dismissedIds, setDismissedIds] = useState(() => getDismissed());
  const [alertsOpen, setAlertsOpen] = useState(true);

  const allAlerts = useMemo(
    () => generateAlerts(invoices, payments, expenses, orgSettings, bills),
    [invoices, payments, expenses, orgSettings, bills]
  );

  const visibleAlerts = useMemo(
    () => allAlerts.filter(a => !dismissedIds.includes(a.id)),
    [allAlerts, dismissedIds]
  );

  const dismissAlert = (id) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    saveDismissed(next);
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div style={{ marginBottom: 16, border: "1px solid #e8e8ec", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
      <button
        onClick={() => setAlertsOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "#f9fafb", border: "none", cursor: "pointer", fontFamily: ff, borderBottom: alertsOpen ? "1px solid #e8e8ec" : "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔔</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Smart Alerts</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
            background: visibleAlerts.some(a => a.severity === "critical") ? "#fef2f2" : visibleAlerts.some(a => a.severity === "warning") ? "#fffbeb" : "#eff6ff",
            color:      visibleAlerts.some(a => a.severity === "critical") ? "#dc2626" : visibleAlerts.some(a => a.severity === "warning") ? "#d97706" : "#2563eb",
          }}>
            {visibleAlerts.length}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{alertsOpen ? "▲" : "▼"}</span>
      </button>

      {alertsOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {visibleAlerts.map((alert, idx) => {
            const s = SEV[alert.severity];
            return (
              <div key={alert.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, padding: "11px 16px", background: s.bg, borderBottom: idx < visibleAlerts.length - 1 ? `1px solid ${s.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0, marginTop: 4 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{alert.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: s.labelColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                    </div>
                    {alert.description && <div style={{ fontSize: 11, color: "#6b7280" }}>{alert.description}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {alert.actionPage && (
                    <button
                      onClick={() => navigate(ALERT_PAGE_ROUTES[alert.actionPage] || ROUTES.DASHBOARD)}
                      style={{ fontSize: 11, fontWeight: 700, color: s.labelColor, background: "none", border: `1px solid ${s.border}`, borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontFamily: ff, whiteSpace: "nowrap" }}>
                      View →
                    </button>
                  )}
                  {alert.dismissable && (
                    <button onClick={() => dismissAlert(alert.id)} title="Dismiss"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center" }}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
