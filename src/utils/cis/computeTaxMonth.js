/**
 * computeTaxMonth — HMRC CIS tax month helpers.
 *
 * A UK tax month runs from the 6th of one calendar month to the 5th of the next
 * (e.g. 6 Apr → 5 May). Each tax month is labelled by the calendar month that
 * contains its starting 6th (so 6 Apr → 5 May is "Apr").
 */

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toDate(d) {
  if (d instanceof Date) return new Date(d.getTime());
  return new Date(d);
}

/**
 * Return the tax month that contains the given date.
 * @param {Date|string} date
 * @returns {{ period_start: Date, period_end: Date, label: string }}
 */
export function getTaxMonthForDate(date) {
  const d = toDate(date);
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  // If before the 6th, this date belongs to the tax month that started on the 6th
  // of the previous calendar month.
  let startYear = year;
  let startMonth = month;
  if (day < 6) {
    startMonth = month - 1;
    if (startMonth < 0) { startMonth = 11; startYear = year - 1; }
  }

  const period_start = new Date(startYear, startMonth, 6);
  const endYear = startMonth === 11 ? startYear + 1 : startYear;
  const endMonth = (startMonth + 1) % 12;
  const period_end = new Date(endYear, endMonth, 5);

  const label = `${MONTH_SHORT[startMonth]} ${startYear}`;
  return { period_start, period_end, label };
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Return the last N tax months, most recent first.
 * @param {number} monthsBack
 * @returns {Array<{ period_start: Date, period_end: Date, label: string, iso_key: string }>}
 */
export function getTaxMonthOptions(monthsBack = 12) {
  const now = new Date();
  const current = getTaxMonthForDate(now);
  const out = [];
  // Walk backwards from the current tax month.
  for (let i = 0; i < monthsBack; i++) {
    const startMonth = current.period_start.getMonth() - i;
    const anchor = new Date(current.period_start.getFullYear(), startMonth, 6);
    const tm = getTaxMonthForDate(anchor);
    out.push({
      period_start: tm.period_start,
      period_end: tm.period_end,
      label: tm.label,
      iso_key: toIsoDate(tm.period_end),
    });
  }
  return out;
}

/**
 * Format a tax month period for display, e.g. "6 Apr 2026 – 5 May 2026".
 * @param {{ period_start: Date, period_end: Date }} period
 * @returns {string}
 */
export function formatPeriodDisplay({ period_start, period_end }) {
  const opts = { day: "numeric", month: "short", year: "numeric" };
  const s = period_start ? new Date(period_start).toLocaleDateString("en-GB", opts) : "—";
  const e = period_end ? new Date(period_end).toLocaleDateString("en-GB", opts) : "—";
  return `${s} – ${e}`;
}
