import { useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppCtx } from "../../context/AppContext";
import { projectCashFlow } from "../../utils/cashFlow";
import { CUR_SYM } from "../../constants";
import { ROUTES } from "../../router/routes";
import { Icons } from "../icons";
import EmptyState from "../ui/EmptyState";

/**
 * Aggregates weekly projection data into calendar months.
 * Returns at most 12 months from the first week's month.
 */
function aggregateMonthly(weeks) {
  const byMonth = new Map();
  for (const w of weeks) {
    const d = new Date(w.weekStart);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = byMonth.get(key) || {
      key,
      label: d.toLocaleDateString("en-GB", { month: "short" }),
      inflow: 0,
      outflow: 0,
    };
    existing.inflow += w.inflow;
    existing.outflow += w.outflow;
    byMonth.set(key, existing);
  }
  return Array.from(byMonth.values()).slice(0, 12);
}

function fmtShort(sym, n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${sym}${Math.round(n / 1_000)}k`;
  return `${sym}${Math.round(n)}`;
}

export default function CashFlowWidget() {
  const { invoices, bills = [], payments, orgSettings } = useContext(AppCtx);
  const navigate = useNavigate();
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const { months, summary } = useMemo(() => {
    const projection = projectCashFlow({ invoices, bills, payments, days: 365 });
    return { months: aggregateMonthly(projection.weeks), summary: projection.summary };
  }, [invoices, bills, payments]);

  const maxVal = Math.max(
    ...months.map(m => Math.max(m.inflow, m.outflow)),
    1
  );

  const isEmpty = months.length === 0 || (summary.totalInflow === 0 && summary.totalOutflow === 0);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Cash flow</h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Next 12 months projection</p>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Icons.Invoices}
          title="No cash flow data yet"
          description="Projections appear when you have invoices with due dates or bills to pay."
          action={{ label: "Create invoice", onClick: () => navigate(ROUTES.INVOICES_NEW), icon: <Icons.Plus /> }}
        />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--success-50)]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--success-700)]">Expected in</div>
              <div className="text-lg font-semibold text-[var(--success-700)] tabular-nums mt-1">
                {fmtShort(currSym, summary.totalInflow)}
              </div>
            </div>
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--danger-50)]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--danger-700)]">Expected out</div>
              <div className="text-lg font-semibold text-[var(--danger-700)] tabular-nums mt-1">
                {fmtShort(currSym, summary.totalOutflow)}
              </div>
            </div>
            <div
              className={[
                "p-3 rounded-[var(--radius-md)]",
                summary.netCashFlow >= 0 ? "bg-[var(--brand-50)]" : "bg-[var(--warning-50)]",
              ].join(" ")}
            >
              <div
                className={[
                  "text-[10px] font-semibold uppercase tracking-wider",
                  summary.netCashFlow >= 0 ? "text-[var(--brand-700)]" : "text-[var(--warning-700)]",
                ].join(" ")}
              >
                Net
              </div>
              <div
                className={[
                  "text-lg font-semibold tabular-nums mt-1",
                  summary.netCashFlow >= 0 ? "text-[var(--brand-700)]" : "text-[var(--warning-700)]",
                ].join(" ")}
              >
                {summary.netCashFlow >= 0 ? "+" : "−"}{fmtShort(currSym, Math.abs(summary.netCashFlow))}
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-[140px] pt-2">
            {months.map(m => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex flex-col justify-end gap-px h-[110px]">
                  {m.inflow > 0 && (
                    <div
                      className="w-full bg-[var(--success-600)] rounded-t-sm"
                      style={{ height: `${Math.max(2, (m.inflow / maxVal) * 70)}px` }}
                      title={`In: ${currSym}${m.inflow.toLocaleString()}`}
                    />
                  )}
                  {m.outflow > 0 && (
                    <div
                      className="w-full bg-[var(--danger-600)] rounded-b-sm"
                      style={{ height: `${Math.max(2, (m.outflow / maxVal) * 70)}px` }}
                      title={`Out: ${currSym}${m.outflow.toLocaleString()}`}
                    />
                  )}
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)] truncate w-full text-center">
                  {m.label}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[var(--success-600)]" />
              <span className="text-xs text-[var(--text-secondary)]">Money in</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[var(--danger-600)]" />
              <span className="text-xs text-[var(--text-secondary)]">Money out</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
