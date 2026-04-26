import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import { Icons } from "../icons";
import { buildSecretaryTasks } from "../../utils/secretary/buildSecretaryTasks";

const SEV_STYLES = {
  critical: {
    iconWrap: "bg-[var(--danger-50)] text-[var(--danger-600)]",
    label:    "text-[var(--danger-700)]",
  },
  warning: {
    iconWrap: "bg-[var(--warning-50)] text-[var(--warning-600)]",
    label:    "text-[var(--warning-700)]",
  },
  info: {
    iconWrap: "bg-[var(--info-50)] text-[var(--info-600)]",
    label:    "text-[var(--info-700)]",
  },
};

const CATEGORY_ICONS = {
  setup: Icons.Settings,
  vat:   Icons.Invoices,
  sa:    Icons.Receipt,
  ct:    Icons.Receipt,
  ch:    Icons.Building,
  rti:   Icons.Payments,
  cis:   Icons.Receipt,
  itsa:  Icons.Receipt,
};

function dismissalKey(userId) {
  return `secretary-dismissed-${userId || "anon"}`;
}

function loadDismissals(userId) {
  try { return JSON.parse(localStorage.getItem(dismissalKey(userId)) || "[]"); }
  catch { return []; }
}

function formatDaysUntil(daysUntil) {
  if (daysUntil == null) return null;
  if (daysUntil < 0)   return `${Math.abs(daysUntil)}d overdue`;
  if (daysUntil === 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil}d`;
}

function isExternal(route) {
  return typeof route === "string" && (route.startsWith("http://") || route.startsWith("https://"));
}

export default function SecretaryWidget({ orgSettings, invoices = [], bills = [], expenses = [], user }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [dismissed, setDismissed] = useState(() => loadDismissals(user?.id));

  useEffect(() => {
    let cancelled = false;
    buildSecretaryTasks(
      orgSettings,
      { invoices, bills, expenses, agreements: [] },
      new Date(),
    ).then(result => { if (!cancelled) setTasks(result); });
    return () => { cancelled = true; };
  }, [orgSettings, invoices, bills, expenses]);

  // Cross-tab dismissal sync. The `storage` event fires only in OTHER tabs,
  // which is what we want — same-tab dismissals re-render via state already.
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === `secretary-dismissed-${user?.id || "anon"}`) {
        setDismissed(loadDismissals(user?.id));
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user?.id]);

  // Filter: drop dismissed, drop operational (NeedsAttention's domain), top 3 highest-severity
  const top3 = useMemo(() => {
    return tasks
      .filter(t => !dismissed.includes(t.id))
      .filter(t => t.category !== "operational")
      .slice(0, 3);
  }, [tasks, dismissed]);

  const totalRelevant = useMemo(() =>
    tasks.filter(t => !dismissed.includes(t.id) && t.category !== "operational").length,
    [tasks, dismissed]
  );

  const handleClick = (task) => {
    if (!task.action_route) return;
    if (isExternal(task.action_route)) {
      window.open(task.action_route, "_blank", "noopener,noreferrer");
    } else {
      navigate(task.action_route);
    }
  };

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="px-[21px] py-[13px] border-b border-[var(--border-subtle)] flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Company Secretary</h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {totalRelevant === 0 ? "All caught up" : `${totalRelevant} item${totalRelevant !== 1 ? "s" : ""} pending`}
          </p>
        </div>
        <button
          onClick={() => navigate(ROUTES.SECRETARY)}
          className="text-xs text-[var(--brand-600)] hover:text-[var(--brand-700)] font-medium bg-transparent border-none cursor-pointer flex items-center gap-1"
        >
          View all
          <Icons.ChevRight />
        </button>
      </div>

      {top3.length === 0 ? (
        <div className="px-[21px] py-[34px] text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--success-50)] text-[var(--success-600)] mb-2">
            <Icons.Check />
          </div>
          <div className="text-sm font-medium text-[var(--text-primary)]">Nothing urgent</div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            No pending compliance tasks.
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] m-0 p-0 list-none">
          {top3.map(task => {
            const s = SEV_STYLES[task.severity] || SEV_STYLES.info;
            const Icon = CATEGORY_ICONS[task.category] || Icons.Alert;
            const daysLabel = formatDaysUntil(task.days_until);
            return (
              <li key={task.id}>
                <button
                  onClick={() => handleClick(task)}
                  className="w-full flex items-center gap-[13px] px-[21px] py-[13px] bg-transparent border-none cursor-pointer text-left hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                >
                  <span className={`w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 ${s.iconWrap}`}>
                    <Icon />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-primary)] truncate">{task.title}</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                      {daysLabel ? <span className={s.label}>{daysLabel}</span> : null}
                      {daysLabel && task.description ? " · " : ""}
                      {task.description}
                    </div>
                  </div>
                  <span className="text-[var(--text-tertiary)] flex-shrink-0 flex">
                    <Icons.ChevRight />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
