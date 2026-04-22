// Dashboard widget — lists self-billing agreements expiring in the next 60
// days with a "Renew" shortcut. Uses computeSbaAlerts for severity chips
// (info/warning/critical/expired) so alert copy stays consistent between
// the widget and the Smart Alerts stream.

import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppCtx } from "../../context/AppContext";
import { listActiveSbas } from "../../lib/selfBilling/sbaService";
import { computeSbaAlerts } from "../../utils/selfBilling/sbaAlerts";

const SEVERITY_STYLES = {
  info:     { chip: "bg-[var(--info-50)] border-[var(--info-100)] text-[var(--info-700)]",           dot: "bg-[var(--info-600)]" },
  warning:  { chip: "bg-[var(--warning-50)] border-[var(--warning-100)] text-[var(--warning-700)]",  dot: "bg-[var(--warning-600)]" },
  critical: { chip: "bg-[var(--danger-50)] border-[var(--danger-100)] text-[var(--danger-700)]",     dot: "bg-[var(--danger-600)]" },
};

function chipLabel(alert) {
  if (alert.daysToExpiry <= 0) return "Expired";
  return `${alert.daysToExpiry} day${alert.daysToExpiry === 1 ? "" : "s"} left`;
}

function directionBadge(direction) {
  const tone = direction === "received"
    ? "bg-[var(--info-50)] border-[var(--info-100)] text-[var(--info-700)]"
    : "bg-[var(--brand-50)] border-[var(--brand-100)] text-[var(--brand-700)]";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${tone}`}>
      {direction === "received" ? "RECEIVED" : "ISSUED"}
    </span>
  );
}

export default function SbaRenewalsWidget() {
  const { user, suppliers = [], customers = [] } = useContext(AppCtx);
  const navigate = useNavigate();

  // Gate: hide widget entirely when the user has no self-billing activity.
  // Defence-in-depth — widgetRegistry carries a `visible(ctx)` predicate too,
  // but HomePage doesn't currently consume it so we check here.
  const hasSbActivity = suppliers.some((s) => s?.self_billing?.enabled)
    || customers.some((c) => c?.self_billed_by_customer);

  const [rows, setRows] = useState(null); // null = loading, [] = empty
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !hasSbActivity) { setRows([]); return; }
    (async () => {
      try {
        const active = await listActiveSbas({ userId: user.id });
        const alerts = computeSbaAlerts({ activeSbas: active });
        if (cancelled) return;
        // Spec filter: only next 60 days. computeSbaAlerts already caps at
        // 30-day warnings, so this is the forward-looking extension for the
        // "coming-up" section beyond the alert threshold.
        const within60 = (active || [])
          .map((sba) => {
            const alert = alerts.find((a) => a.sbaId === sba.id);
            if (alert) return { sba, alert };
            // Unalerted but still worth surfacing if within 60 days.
            const end = new Date(sba.end_date);
            const days = Math.round((end - new Date()) / 86400000);
            if (days > 60 || days < 0) return null;
            return {
              sba,
              alert: {
                id: `sba_soon_${sba.id}`, severity: "info",
                title: "Renewal coming up", daysToExpiry: days,
                counterparty: sba.supplier?.name || sba.customer?.name || "counterparty",
                direction: sba.direction, endDate: sba.end_date,
                actionHref: sba.direction === "received"
                  ? `/customers/${sba.customer_id}?tab=self-billing`
                  : `/suppliers/${sba.supplier_id}?tab=self-billing`,
              },
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.alert.daysToExpiry - b.alert.daysToExpiry);
        setRows(within60);
      } catch (err) {
        if (!cancelled) { setError(err?.message || "Could not load agreements"); setRows([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, hasSbActivity]);

  if (!hasSbActivity) return null;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-[21px]">
      <div className="flex items-center justify-between mb-[13px]">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">Self-Billing renewals</div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Agreements expiring in the next 60 days</div>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] text-xs text-[var(--danger-700)]">
          {error}
        </div>
      )}

      {rows === null ? (
        <div className="py-6 text-center text-xs text-[var(--text-tertiary)]">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-6 text-center">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-1">No agreements needing renewal</div>
          <div className="text-xs text-[var(--text-tertiary)]">Active agreements are valid beyond the next 60 days.</div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {rows.map(({ sba, alert }) => {
            const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
            return (
              <li key={sba.id} className="py-[13px] flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{alert.counterparty}</span>
                    {directionBadge(alert.direction)}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${style.chip}`}>
                      {chipLabel(alert)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                    Ends {alert.endDate}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(alert.actionHref)}
                  className="h-8 px-3 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white hover:border-[var(--brand-600)] hover:text-[var(--brand-600)] text-[var(--text-secondary)] cursor-pointer transition-colors duration-150 flex-shrink-0"
                >
                  {alert.daysToExpiry <= 0 ? "Review" : "Renew"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
