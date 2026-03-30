import { useContext } from "react";
import { CUR_SYM } from "../../constants";
import { AppCtx } from "../../context/AppContext";

// ─── CURRENCY HELPER ─────────────────────────────────────────────────────────
export const useCurrSym = () => {
  const { orgSettings } = useContext(AppCtx);
  return CUR_SYM[orgSettings?.currency || "GBP"] || "£";
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
export const PERIODS = [
  { value: "this_month",   label: "This Month" },
  { value: "last_month",   label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year",    label: "This Year" },
  { value: "custom",       label: "Custom Range" },
];

export const SOURCE_OPTIONS = [
  { value: "all",             label: "All Sources" },
  { value: "invoice",         label: "Invoices" },
  { value: "payment",         label: "Payments" },
  { value: "expense",         label: "Expenses" },
  { value: "manual",          label: "Manual" },
  { value: "opening_balance", label: "Opening Balance" },
  { value: "reversal",        label: "Reversals" },
];

export const ACCT_TYPES  = ["asset", "liability", "equity", "revenue", "expense"];
export const ACCT_LABELS = {
  asset: "Assets", liability: "Liabilities", equity: "Equity",
  revenue: "Revenue", expense: "Expenses",
};
export const TYPE_COLORS = {
  asset: "#0891b2", liability: "#dc2626", equity: "#7c3aed",
  revenue: "#16a34a", expense: "#d97706",
};

// ─── DATE RANGE HELPER ────────────────────────────────────────────────────────
export function getDateRange(period, customStart, customEnd) {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();           // 0-indexed
  const pad   = n => String(n).padStart(2, "0");
  const today = now.toISOString().slice(0, 10);

  switch (period) {
    case "this_month":
      return { start: `${y}-${pad(m + 1)}-01`, end: today };
    case "last_month": {
      const last = new Date(y, m, 0);     // last day of previous month
      return {
        start: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-01`,
        end:   last.toISOString().slice(0, 10),
      };
    }
    case "this_quarter": {
      const qs = Math.floor(m / 3) * 3;
      return { start: `${y}-${pad(qs + 1)}-01`, end: today };
    }
    case "this_year":
      return { start: `${y}-01-01`, end: today };
    case "custom":
      return { start: customStart || `${y}-${pad(m + 1)}-01`, end: customEnd || today };
    default:
      return { start: `${y}-${pad(m + 1)}-01`, end: today };
  }
}

// ─── BALANCE CALCULATOR ───────────────────────────────────────────────────────
export function computeBalances(accounts, allEntries) {
  const map = {};
  for (const entry of allEntries) {
    for (const line of (entry.journal_lines || [])) {
      if (!map[line.account_id]) map[line.account_id] = { debit: 0, credit: 0 };
      map[line.account_id].debit  += line.debit  || 0;
      map[line.account_id].credit += line.credit || 0;
    }
  }
  return accounts.map(a => {
    const b = map[a.id] || { debit: 0, credit: 0 };
    const normalDebit = a.type === "asset" || a.type === "expense";
    const balance = normalDebit ? b.debit - b.credit : b.credit - b.debit;
    return { ...a, totalDebit: b.debit, totalCredit: b.credit, balance };
  });
}
