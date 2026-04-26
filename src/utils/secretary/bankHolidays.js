// UK bank holidays — fetched from gov.uk with localStorage cache + hardcoded fallback
// Source: https://www.gov.uk/bank-holidays.json

const STORAGE_KEY = "uk_bank_holidays_v1";
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Hardcoded fallback so the engine works offline / in tests.
// Re-verify annually against https://www.gov.uk/bank-holidays.json
const FALLBACK = {
  "england-and-wales": [
    "2025-01-01", "2025-04-18", "2025-04-21", "2025-05-05", "2025-05-26",
    "2025-08-25", "2025-12-25", "2025-12-26",
    "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25",
    "2026-08-31", "2026-12-25", "2026-12-28",
    "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31",
    "2027-08-30", "2027-12-27", "2027-12-28",
  ],
  "scotland": [
    "2025-01-01", "2025-01-02", "2025-04-18", "2025-05-05", "2025-05-26",
    "2025-08-04", "2025-11-30", "2025-12-25", "2025-12-26",
    "2026-01-01", "2026-01-02", "2026-04-03", "2026-05-04", "2026-05-25",
    "2026-08-03", "2026-11-30", "2026-12-25", "2026-12-28",
  ],
  "northern-ireland": [
    "2025-01-01", "2025-03-17", "2025-04-18", "2025-04-21", "2025-05-05",
    "2025-05-26", "2025-07-14", "2025-08-25", "2025-12-25", "2025-12-26",
    "2026-01-01", "2026-03-17", "2026-04-03", "2026-04-06", "2026-05-04",
    "2026-05-25", "2026-07-13", "2026-08-31", "2026-12-25", "2026-12-28",
  ],
};

export async function getBankHolidays(jurisdiction = "england-and-wales") {
  if (typeof localStorage !== "undefined") {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (cached?.timestamp && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
        return cached.data[jurisdiction] || FALLBACK[jurisdiction] || [];
      }
    } catch { /* fall through to fetch */ }
  }

  try {
    const res = await fetch("https://www.gov.uk/bank-holidays.json");
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    const parsed = {
      "england-and-wales": data["england-and-wales"]?.events?.map(e => e.date) || FALLBACK["england-and-wales"],
      "scotland":          data["scotland"]?.events?.map(e => e.date)          || FALLBACK["scotland"],
      "northern-ireland":  data["northern-ireland"]?.events?.map(e => e.date)  || FALLBACK["northern-ireland"],
    };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now(), data: parsed }));
    }
    return parsed[jurisdiction] || [];
  } catch {
    return FALLBACK[jurisdiction] || [];
  }
}

export function isBankHoliday(dateISO, calendar) {
  return Array.isArray(calendar) && calendar.includes(dateISO);
}

export function isWorkingDay(dateISO, calendar) {
  const d = new Date(dateISO + "T00:00:00Z");
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !isBankHoliday(dateISO, calendar);
}

export function nextWorkingDay(dateISO, calendar) {
  let d = new Date(dateISO + "T00:00:00Z");
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (!isWorkingDay(d.toISOString().slice(0, 10), calendar));
  return d.toISOString().slice(0, 10);
}

export function previousWorkingDay(dateISO, calendar) {
  let d = new Date(dateISO + "T00:00:00Z");
  do {
    d.setUTCDate(d.getUTCDate() - 1);
  } while (!isWorkingDay(d.toISOString().slice(0, 10), calendar));
  return d.toISOString().slice(0, 10);
}

export const FALLBACK_CALENDARS = FALLBACK;
