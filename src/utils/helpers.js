import { CUR_SYM } from '../constants';

export const fmt = (sym, val) => `${sym}${Number(val||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const todayStr = () => new Date().toISOString().split("T")[0];
export const addDays = (d, n) => { const dt=new Date(d); dt.setDate(dt.getDate()+n); return dt.toISOString().split("T")[0]; };
export const fmtDate = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
export const newLine = (order=0) => ({ id:crypto.randomUUID(), description:"", quantity:1, rate:0, tax_rate:20, amount:0, cisApplicable:false, sort_order:order });
export const nextNum = (prefix, existing) => {
  const extractNum = (entry) => {
    let str = "";
    if (typeof entry === "string") str = entry;
    else if (typeof entry === "number") str = String(entry);
    else if (entry && typeof entry === "object")
      str = entry.invoice_number || entry.payment_number || entry.quote_number || entry.docNumber || "";
    const match = str.match(/(\d+)(?=\D*$)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  const nums = (existing || []).map(extractNum).filter(Boolean);
  let candidate = nums.length ? Math.max(...nums) + 1 : 1;
  const existingStrings = new Set(
    (existing || []).map(e =>
      e?.invoice_number || e?.payment_number || e?.quote_number || e?.docNumber || String(e)
    )
  );
  for (let i = 0; i < 100; i++) {
    const s = `${prefix}-${String(candidate).padStart(4, "0")}`;
    if (!existingStrings.has(s)) return s;
    candidate++;
  }
  return `${prefix}-${String(candidate).padStart(4, "0")}`;
};
export const upsert = (arr, item) => {
  const i = arr.findIndex(x=>x.id===item.id);
  if(i>=0){ const u=[...arr]; u[i]=item; return u; }
  return [...arr, item];
};
export const validateVatNumber = (num) => {
  if(!num) return false;
  const clean = num.replace(/\s/g,"").toUpperCase();
  if(/^GB\d{9}$/.test(clean)) return true;
  if(/^[A-Z]{2}[A-Z0-9]{2,12}$/.test(clean)) return true;
  return false;
};

export const validateUkCrn = (value) => {
  if (!value) return true;
  const clean = String(value).trim().toUpperCase();
  return /^\d{8}$/.test(clean) || /^[A-Z]{2}\d{6}$/.test(clean);
};


export const parseCisRate = (value, fallback = 20) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const percentMatch = raw.match(/(\d+(?:\.\d+)?)/);
  if (percentMatch) return Number(percentMatch[1]);

  return fallback;
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  const raw = String(phone).trim();
  if (!raw) return "";
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  // International format: +44 7xxx xxxxxx or +44 20 xxxx xxxx
  if (hasPlus && digits.length >= 10) {
    // Assume +44 for UK
    if (digits.startsWith("44") && digits.length >= 12) {
      const national = digits.slice(2);
      if (national.startsWith("7") && national.length === 10) {
        // UK mobile: +44 7xxx xxxxxx
        return `+44 ${national.slice(0, 4)} ${national.slice(4)}`;
      }
      if (national.startsWith("20") && national.length === 10) {
        // London: +44 20 xxxx xxxx
        return `+44 20 ${national.slice(2, 6)} ${national.slice(6)}`;
      }
      // Generic UK: +44 xxxx xxxxxx
      return `+44 ${national.slice(0, 4)} ${national.slice(4)}`;
    }
    // Generic international: +CC remainder grouped
    const ccLen = Math.min(3, digits.length - 9);
    const cc = digits.slice(0, ccLen > 0 ? ccLen : 2);
    const rest = digits.slice(cc.length);
    return `+${cc} ${rest.slice(0, 4)} ${rest.slice(4)}`.trim();
  }

  // UK mobile: 07xxx xxxxxx
  if (digits.startsWith("07") && digits.length === 11) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // UK London landline: 020 xxxx xxxx
  if (digits.startsWith("020") && digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  // UK other landline: 01xxx xxxxxx or 0xxx xxxx xxxx
  if (digits.startsWith("01") && digits.length === 11) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // Fallback: group in chunks
  if (digits.length <= 4) return hasPlus ? `+${digits}` : digits;
  const prefix = hasPlus ? "+" : "";
  return `${prefix}${digits.slice(0, 5)} ${digits.slice(5)}`.trim();
};

export const stripPhoneForStorage = (phone) => {
  if (!phone) return "";
  const raw = String(phone).trim();
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
};

export const formatSortCode = (value) => {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};

export const stripSortCode = (value) => {
  if (!value) return "";
  return String(value).replace(/\D/g, "").slice(0, 6);
};

export function markDocumentAsSent(invoiceId) {
  const key = "ai_invoice_sent_log";
  const log = JSON.parse(localStorage.getItem(key) || "{}");
  log[invoiceId] = { sentAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(log));
}

export function getDocumentSentStatus(invoiceId) {
  const log = JSON.parse(localStorage.getItem("ai_invoice_sent_log") || "{}");
  return log[invoiceId] || null;
}
