import { getBankHolidays } from "./bankHolidays";
import { computeDeadlines } from "./computeDeadlines";
import { buildSetupChecklist } from "./buildSetupChecklist";
import { buildOperationalTasks } from "./buildOperationalTasks";

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 };

function toISO(d) {
  return typeof d === "string" ? d : d.toISOString().slice(0, 10);
}

export async function buildSecretaryTasks(orgSettings, data, today = new Date(), jurisdiction = "england-and-wales") {
  const todayISO = toISO(today);
  const calendar = await getBankHolidays(jurisdiction);

  const setup       = buildSetupChecklist(orgSettings || {});
  const deadlines   = computeDeadlines(orgSettings || {}, todayISO, calendar);
  const operational = buildOperationalTasks(data || {}, todayISO);

  const all = [...setup, ...deadlines, ...operational];

  all.sort((a, b) => {
    const sa = SEVERITY_RANK[a.severity] ?? 3;
    const sb = SEVERITY_RANK[b.severity] ?? 3;
    if (sa !== sb) return sa - sb;
    return (a.days_until ?? 9999) - (b.days_until ?? 9999);
  });

  return all;
}

export function summariseTasks(tasks) {
  return {
    total: tasks.length,
    critical: tasks.filter(t => t.severity === "critical").length,
    warning:  tasks.filter(t => t.severity === "warning").length,
    info:     tasks.filter(t => t.severity === "info").length,
  };
}
