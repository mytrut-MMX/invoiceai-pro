import { CUR_SYM } from '../constants';

export const fmt = (sym, val) => `${sym}${Number(val||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const todayStr = () => new Date().toISOString().split("T")[0];
export const addDays = (d, n) => { const dt=new Date(d); dt.setDate(dt.getDate()+n); return dt.toISOString().split("T")[0]; };
export const fmtDate = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
export const newLine = (order=0) => ({ id:crypto.randomUUID(), description:"", quantity:1, rate:0, tax_rate:20, amount:0, cisApplicable:false, sort_order:order });
export const nextNum = (prefix, existing) => {
  const nums = (existing||[])
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (typeof entry === "number") return String(entry);
      if (entry && typeof entry === "object") {
        return entry.invoice_number || entry.payment_number || entry.quote_number || entry.docNumber || "";
      }
      return "";
    })
    .map((value) => parseInt(String(value).replace(/\D/g, ""), 10))
    .filter(Boolean);
  return `${prefix}-${String(nums.length?Math.max(...nums)+1:1).padStart(4,"0")}`;
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
  const normalized = raw.replace(/\s+/g, " ");
  const hasPlus = normalized.startsWith("+");
  const digits = normalized.replace(/\D/g, "");
  if (!digits) return normalized;

  let countryCode = "";
  let remainder = digits;

  if (hasPlus) {
    const ccLen = digits.length > 10 ? Math.min(3, digits.length - 10) : 2;
    countryCode = `+${digits.slice(0, ccLen)}`;
    remainder = digits.slice(ccLen);
  }

  if (remainder.length <= 4) {
    return [countryCode, remainder].filter(Boolean).join(" ").trim();
  }

  const mobileCodeLen = remainder.length > 10 ? 4 : 3;
  const mobileCode = remainder.slice(0, mobileCodeLen);
  const local = remainder.slice(mobileCodeLen);
  const localGrouped = local.replace(/(\d{3})(?=\d)/g, "$1 ");

  return [countryCode, mobileCode, localGrouped].filter(Boolean).join(" ").trim();
};

// Supabase fetch helper
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
export async function sbFetch(method, path, body) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: { "Content-Type":"application/json", "apikey":SUPABASE_ANON_KEY, "Authorization":`Bearer ${SUPABASE_ANON_KEY}`, "Prefer":method==="POST"?"return=representation":"" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if(!res.ok) throw new Error(await res.text());
    return res.status===204 ? null : res.json();
  } catch(e) { throw e; }
}
