import { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppCtx } from "../context/AppContext";
import { Btn } from "../components/atoms";
import { buildSecretaryTasks, summariseTasks } from "../utils/secretary/buildSecretaryTasks";

const CATEGORY_LABELS = {
  setup:       "Setup",
  vat:         "VAT",
  sa:          "Self Assessment",
  ct:          "Corporation Tax",
  ch:          "Companies House",
  rti:         "PAYE / RTI",
  cis:         "CIS",
  itsa:        "MTD ITSA",
  operational: "Operational",
};

const SEVERITY_STYLES = {
  critical: { borderL: "border-l-red-400",   text: "text-red-700",    badge: "🔴" },
  warning:  { borderL: "border-l-amber-400", text: "text-amber-700",  badge: "🟠" },
  info:     { borderL: "border-l-blue-400",  text: "text-blue-700",   badge: "🔵" },
};

const SUMMARY_CHIP_STYLES = {
  red:   "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue:  "bg-blue-50 text-blue-700 border-blue-200",
};

const FILTERS = ["all", "setup", "deadlines", "operational"];

function dismissalKey(userId) {
  return `secretary-dismissed-${userId || "anon"}`;
}

function loadDismissals(userId) {
  try { return JSON.parse(localStorage.getItem(dismissalKey(userId)) || "[]"); }
  catch { return []; }
}

function saveDismissals(userId, ids) {
  try { localStorage.setItem(dismissalKey(userId), JSON.stringify(ids)); }
  catch { /* private mode / quota — ignore */ }
}

function formatDaysUntil(daysUntil) {
  if (daysUntil == null) return null;
  if (daysUntil < 0)   return `${Math.abs(daysUntil)} days overdue`;
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  return `Due in ${daysUntil} days`;
}

function isExternal(route) {
  return typeof route === "string" && (route.startsWith("http://") || route.startsWith("https://"));
}

export default function SecretaryPage() {
  const ctx = useContext(AppCtx) || {};
  const { orgSettings, invoices, bills, expenses, user } = ctx;
  const navigate = useNavigate();

  const [tasks, setTasks]         = useState([]);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [dismissed, setDismissed] = useState(() => loadDismissals(user?.id));

  useEffect(() => {
    let cancelled = false;
    // agreements: [] — Prompt 5 will wire SBA fetch.
    buildSecretaryTasks(
      orgSettings,
      { invoices: invoices || [], bills: bills || [], expenses: expenses || [], agreements: [] },
      new Date(),
    ).then(result => { if (!cancelled) setTasks(result); });
    return () => { cancelled = true; };
  }, [orgSettings, invoices, bills, expenses]);

  // Cross-tab dismissal sync.
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === `secretary-dismissed-${user?.id || "anon"}`) {
        setDismissed(loadDismissals(user?.id));
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user?.id]);

  const visible = useMemo(() => {
    let xs = tasks.filter(t => !dismissed.includes(t.id));

    if (filter === "setup")       xs = xs.filter(t => t.category === "setup");
    if (filter === "operational") xs = xs.filter(t => t.category === "operational");
    if (filter === "deadlines")   xs = xs.filter(t => !["setup", "operational"].includes(t.category));

    const q = search.trim().toLowerCase();
    if (q) {
      xs = xs.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        CATEGORY_LABELS[t.category]?.toLowerCase().includes(q)
      );
    }
    return xs;
  }, [tasks, dismissed, filter, search]);

  const summary = useMemo(() => summariseTasks(visible), [visible]);

  const handleDismiss = (taskId) => {
    const next = [...dismissed, taskId];
    setDismissed(next);
    saveDismissals(user?.id, next);
  };

  const handleAction = (task) => {
    if (!task.action_route) return;
    if (isExternal(task.action_route)) {
      window.open(task.action_route, "_blank", "noopener,noreferrer");
    } else {
      navigate(task.action_route);
    }
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Company Secretary</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
            Everything that needs your attention
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <SummaryChip count={summary.critical} label="critical" tone="red" />
          <SummaryChip count={summary.warning}  label="warnings" tone="amber" />
          <SummaryChip count={summary.info}     label="info"     tone="blue" />
          <div className="flex-1 min-w-[200px]" />
          <input
            type="search"
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 px-3 text-sm bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-md)] outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 min-w-[220px]"
          />
        </div>

        <div className="flex gap-2 mb-4">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "h-8 px-3 text-sm rounded-[var(--radius-md)] cursor-pointer transition-colors duration-150",
                filter === f
                  ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-medium border border-[var(--brand-200)]"
                  : "bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]",
              ].join(" ")}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {visible.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onDismiss={task.severity === "info" ? () => handleDismiss(task.id) : null}
                onAction={() => handleAction(task)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryChip({ count, label, tone }) {
  return (
    <div className={`px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium border ${SUMMARY_CHIP_STYLES[tone]}`}>
      {count} {label}
    </div>
  );
}

function TaskCard({ task, onDismiss, onAction }) {
  const sev = SEVERITY_STYLES[task.severity] || SEVERITY_STYLES.info;
  const daysLabel = formatDaysUntil(task.days_until);

  return (
    <div className={`flex items-start gap-3 p-4 bg-[var(--surface-card)] border-l-4 ${sev.borderL} border-y border-r border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)]`}>
      <div className="text-lg leading-none mt-0.5" aria-hidden="true">{sev.badge}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] m-0">{task.title}</h3>
          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            {CATEGORY_LABELS[task.category] || task.category}
          </span>
          {daysLabel && (
            <span className={`text-xs font-medium ${sev.text}`}>{daysLabel}</span>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">{task.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {task.action_label && task.action_route && (
          <Btn variant="outline" size="sm" onClick={onAction}>
            {task.action_label}
          </Btn>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] cursor-pointer transition-colors duration-150 bg-transparent border-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-8 text-center">
      <div className="text-3xl mb-2">🎉</div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] m-0">You're all caught up!</h3>
      <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
        No outstanding tasks. We'll keep watching for new deadlines and changes.
      </p>
    </div>
  );
}
