import { useState, useRef, useEffect, useCallback } from "react";

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
// Înlocuiește cu credențialele tale din https://app.supabase.com → Project Settings → API
const SUPABASE_URL = "https://oecvlkllkpyfpgczqwii.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3Zsa2xsa3B5ZnBnY3pxd2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTU3NDYsImV4cCI6MjA4ODQ5MTc0Nn0.U1xmtE1D5Izd8exA33cldR-9-5YpHwKX6wZVV0HFqIg";

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

// ─── FONTS & CONSTANTS ────────────────────────────────────────────────────────
const ff = "'Instrument Sans', 'DM Sans', 'Helvetica Neue', sans-serif";

const TAX_RATES = [0, 5, 12.5, 20];
const INVOICE_CURRENCIES = { GBP: "£", USD: "$", EUR: "€", AUD: "A$", CAD: "C$", CHF: "Fr", JPY: "¥", INR: "₹" };
const PAYMENT_TERMS = ["Due on Receipt", "Net 7", "Net 14", "Net 30", "Net 60", "Net 90", "Custom"];
const RECURRING_OPTS = ["Weekly", "Monthly", "Quarterly", "Yearly"];
const DEFAULT_TERMS = "Payment is due within the agreed payment terms. Late payments may incur interest charges. Please make payment to the bank details provided above.";

const INDUSTRIES = ["Agency","Agriculture","Art and Design","Automotive","Construction","Consulting","Consumer Packaged Goods","Education","Engineering","Entertainment","Financial Services","Food Services (Restaurant/Fast Food)","Gardening","Gaming","Government","Health Care","Interior Design","Internal","Legal","Logistics","Manufacturing","Marketing","Mining and Logistics","Non Profit","Publishing and Web Media","Real Estate","Retail (E-commerce and Offline)","Services","Technology","Telecommunications","Travel/Hospitality","Web Design","Web Developers","Writers","Others"];
const COUNTRIES = ["United Kingdom","Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Sierra Leone","Singapore","Slovakia","Slovenia","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Uganda","Ukraine","United Arab Emirates","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];
const CURRENCIES_LIST = ["GBP - British Pound Sterling","USD - US Dollar","EUR - Euro","AUD - Australian Dollar","CAD - Canadian Dollar","CHF - Swiss Franc","CNY - Chinese Yuan","JPY - Japanese Yen","INR - Indian Rupee","SGD - Singapore Dollar","HKD - Hong Kong Dollar","SEK - Swedish Krona","NOK - Norwegian Krone","DKK - Danish Krone","NZD - New Zealand Dollar","ZAR - South African Rand","AED - UAE Dirham","BRL - Brazilian Real","MXN - Mexican Peso","KRW - South Korean Won"];
const TIMEZONES = ["(UTC+00:00) London","(UTC+00:00) Dublin","(UTC+00:00) Lisbon","(UTC+01:00) Amsterdam","(UTC+01:00) Berlin","(UTC+01:00) Brussels","(UTC+01:00) Madrid","(UTC+01:00) Paris","(UTC+01:00) Rome","(UTC+02:00) Athens","(UTC+02:00) Cairo","(UTC+02:00) Johannesburg","(UTC+03:00) Istanbul","(UTC+03:00) Moscow","(UTC+03:00) Riyadh","(UTC+04:00) Dubai","(UTC+05:00) Karachi","(UTC+05:30) New Delhi","(UTC+06:00) Dhaka","(UTC+07:00) Bangkok","(UTC+08:00) Beijing","(UTC+08:00) Singapore","(UTC+09:00) Tokyo","(UTC+09:30) Adelaide","(UTC+10:00) Sydney","(UTC+12:00) Auckland","(UTC-05:00) New York","(UTC-06:00) Chicago","(UTC-07:00) Denver","(UTC-08:00) Los Angeles","(UTC-09:00) Anchorage","(UTC-10:00) Honolulu"];
const UK_COUNTIES = ["Avon","Bedfordshire","Berkshire","Bristol","Buckinghamshire","Cambridgeshire","Cheshire","City of London","Cleveland","Cornwall","Cumbria","Derbyshire","Devon","Dorset","Durham","East Riding of Yorkshire","East Sussex","Essex","Gloucestershire","Greater London","Greater Manchester","Hampshire","Herefordshire","Hertfordshire","Isle of Wight","Kent","Lancashire","Leicestershire","Lincolnshire","Merseyside","Middlesex","Norfolk","North Yorkshire","Northamptonshire","Northumberland","Nottinghamshire","Oxfordshire","Rutland","Shropshire","Somerset","South Yorkshire","Staffordshire","Suffolk","Surrey","Tyne and Wear","Warwickshire","West Midlands","West Sussex","West Yorkshire","Wiltshire","Worcestershire"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Miss", "Dr.", "Prof."];

const MOCK_STATS = [
  { label: "Outstanding", value: "£4,320.00", sub: "3 invoices", color: "#E86C4A" },
  { label: "Overdue", value: "£1,200.00", sub: "1 invoice", color: "#C0392B" },
  { label: "Paid (30 days)", value: "£12,800.00", sub: "8 invoices", color: "#1A1A1A" },
  { label: "Draft", value: "£2,500.00", sub: "2 invoices", color: "#888" },
];

const MOCK_INVOICES_HOME = [
  { id: "INV-0001", customer: "Acme Corp", date: "01 Mar 2026", due: "31 Mar 2026", amount: "£1,200.00", status: "Sent" },
  { id: "INV-0002", customer: "Blue Sky Ltd", date: "20 Feb 2026", due: "20 Mar 2026", amount: "£3,120.00", status: "Overdue" },
  { id: "INV-0003", customer: "Green Media", date: "15 Feb 2026", due: "15 Mar 2026", amount: "£840.00", status: "Paid" },
  { id: "INV-0004", customer: "Nova Tech", date: "10 Mar 2026", due: "10 Apr 2026", amount: "£2,500.00", status: "Draft" },
];

const MOCK_CUSTOMERS_LIST = [
  { id: 1, name: "Acme Corp", email: "hello@acme.com", phone: "+44 7700 900000", type: "Business", currency: "GBP" },
  { id: 2, name: "Blue Sky Ltd", email: "info@bluesky.co.uk", phone: "+44 7911 123456", type: "Business", currency: "GBP" },
];

// Customers used in invoice form (with address field)
const MOCK_CUSTOMERS_INVOICE = [
  { id: "c1", name: "Acme Corporation", email: "billing@acme.com", address: "123 High Street, London, EC1A 1BB", currency: "GBP" },
  { id: "c2", name: "Blue Sky Ltd", email: "accounts@bluesky.co.uk", address: "45 Oxford Road, Manchester, M1 2JA", currency: "GBP" },
  { id: "c3", name: "Green Media Group", email: "finance@greenmedia.io", address: "78 Silicon Way, Bristol, BS1 3NT", currency: "GBP" },
  { id: "c4", name: "Nova Tech Solutions", email: "ap@novatech.com", address: "200 Canary Wharf, London, E14 5AB", currency: "GBP" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const statusColors = { Sent: "#2563EB", Overdue: "#C0392B", Paid: "#16A34A", Draft: "#6B7280", Void: "#9CA3AF" };

function fmt(sym, val) {
  return `${sym}${Number(val).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function today() { return new Date().toISOString().split("T")[0]; }
function addDays(d, n) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function nextInvNumber(existing) {
  const nums = existing.map(n => parseInt(n.replace(/\D/g, ""), 10)).filter(Boolean);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `INV-${String(next).padStart(4, "0")}`;
}
const newLine = (order = 0) => ({
  id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, tax_rate: 20, amount: 0, sort_order: order,
});

// ─── MONOCHROME ICONS ─────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, stroke = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const I = ({ d, size = 16, sw = 1.5, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  Home:      () => <Icon d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />,
  Customers: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.85"/></svg>,
  Items:     () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  Quotes:    () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>,
  Invoices:  () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>,
  Payments:  () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="2"/><path d="M1 10h22"/></svg>,
  Settings:  () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  Plus:      () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ChevronDown:  () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevronRight: () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Search:    () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Send:      () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  X:         () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Building:  () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="18" height="20" rx="1"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01"/></svg>,
  Bot:       () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 2v6M8 8V6a4 4 0 018 0v2"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/><path d="M9 18h6"/></svg>,
  GoogleDrive: () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 19h7.5L12 14l2.5 5H22L12 2z"/><path d="M7.5 19L12 11l4.5 8H7.5z"/></svg>,
  Download:  () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  User:      () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a8 8 0 0116 0v1"/></svg>,
  Check:     () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Info:      () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8" strokeWidth={2}/><line x1="12" y1="12" x2="12" y2="16"/></svg>,
};

// Invoice-specific icon set (smaller, 16px)
const Ic = {
  Plus:     () => <I sw={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></I>,
  Trash:    () => <I><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></I>,
  ChevD:    () => <I sw={2}><polyline points="6 9 12 15 18 9"/></I>,
  Eye:      () => <I><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></I>,
  Edit:     () => <I><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></I>,
  Send:     () => <I><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></I>,
  Save:     () => <I><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></I>,
  X:        () => <I sw={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></I>,
  Info:     () => <I><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8" strokeWidth={2.5}/><line x1="12" y1="12" x2="12" y2="16"/></I>,
  Check:    () => <I sw={2.5}><polyline points="20 6 9 17 4 12"/></I>,
  Download: () => <I><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></I>,
};

// ─── SHARED UI ATOMS ──────────────────────────────────────────────────────────
const Field = ({ label, children, required }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 6, letterSpacing: "0.02em", textTransform: "uppercase" }}>
      {label}{required && <span style={{ color: "#E86C4A", marginLeft: 3 }}>*</span>}
    </label>
    {children}
  </div>
);

// Basic input (used in OrgSetup, Customers)
const InputBasic = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E0E0E0", borderRadius: 7, fontSize: 14, color: "#1A1A1A", background: "#FAFAFA", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border 0.2s", ...style }}
    onFocus={e => e.target.style.borderColor = "#1A1A1A"}
    onBlur={e => e.target.style.borderColor = "#E0E0E0"} />
);

// Invoice-style input (smaller, used in invoice form)
const InputInv = ({ value, onChange, placeholder, type = "text", style = {}, align = "left", readOnly }) => (
  <input type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly}
    style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E4E4E4", borderRadius: 7, fontSize: 13, fontFamily: ff, color: "#1A1A1A", background: readOnly ? "#F7F7F7" : "#FAFAFA", outline: "none", boxSizing: "border-box", textAlign: align, transition: "border 0.15s", ...style }}
    onFocus={e => { if (!readOnly) e.target.style.borderColor = "#1A1A1A"; }}
    onBlur={e => e.target.style.borderColor = "#E4E4E4"} />
);

const TextareaInv = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ width: "100%", padding: "9px 11px", border: "1.5px solid #E4E4E4", borderRadius: 7, fontSize: 13, fontFamily: ff, color: "#1A1A1A", background: "#FAFAFA", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6, transition: "border 0.15s" }}
    onFocus={e => e.target.style.borderColor = "#1A1A1A"}
    onBlur={e => e.target.style.borderColor = "#E4E4E4"} />
);

const SelectBasic = ({ value, onChange, options, placeholder, style = {} }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E0E0E0", borderRadius: 7, fontSize: 14, color: value ? "#1A1A1A" : "#999", background: "#FAFAFA", outline: "none", appearance: "none", boxSizing: "border-box", fontFamily: "inherit", cursor: "pointer", ...style }}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o} value={o} style={{ color: "#1A1A1A" }}>{o}</option>)}
  </select>
);

const SelectInv = ({ value, onChange, options, placeholder, style = {} }) => (
  <div style={{ position: "relative" }}>
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "8px 32px 8px 10px", border: "1.5px solid #E4E4E4", borderRadius: 7, fontSize: 13, fontFamily: ff, color: value ? "#1A1A1A" : "#AAA", background: "#FAFAFA", outline: "none", appearance: "none", cursor: "pointer", boxSizing: "border-box", transition: "border 0.15s", ...style }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#AAA" }}><Ic.ChevD /></div>
  </div>
);

const Toggle = ({ value, onChange, options }) => (
  <div style={{ display: "flex", gap: 8 }}>
    {options.map(o => (
      <button key={o} onClick={() => onChange(o)}
        style={{ flex: 1, padding: "9px 0", border: `1.5px solid ${value === o ? "#1A1A1A" : "#E0E0E0"}`, borderRadius: 7, background: value === o ? "#1A1A1A" : "#FAFAFA", color: value === o ? "#fff" : "#666", fontSize: 13, fontWeight: value === o ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s" }}>
        {o}
      </button>
    ))}
  </div>
);

const Checkbox = ({ checked, onChange, label }) => (
  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 10 }}>
    <div onClick={() => onChange(!checked)}
      style={{ width: 18, height: 18, minWidth: 18, border: `2px solid ${checked ? "#1A1A1A" : "#CCC"}`, borderRadius: 4, background: checked ? "#1A1A1A" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", marginTop: 1 }}>
      {checked && <Icons.Check />}
    </div>
    <span style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>{label}</span>
  </label>
);

const Btn = ({ onClick, children, variant = "primary", size = "md", disabled, icon, style: sx = {} }) => {
  const base = { display: "inline-flex", alignItems: "center", gap: 7, border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontFamily: ff, fontWeight: 700, transition: "all 0.15s", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap" };
  const sizes = { sm: { padding: "7px 13px", fontSize: 12 }, md: { padding: "9px 18px", fontSize: 13 }, lg: { padding: "11px 24px", fontSize: 14 } };
  const variants = {
    primary: { background: "#1A1A1A", color: "#fff" },
    accent:  { background: "#E86C4A", color: "#fff" },
    outline: { background: "#fff", color: "#1A1A1A", border: "1.5px solid #E0E0E0" },
    ghost:   { background: "transparent", color: "#666" },
    danger:  { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" },
    success: { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...sx }}>
      {icon && icon}{children}
    </button>
  );
};

const Tag = ({ children, color = "#1A1A1A" }) => (
  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + "18", color }}>{children}</span>
);

const LabelInv = ({ children, required }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
    {children}{required && <span style={{ color: "#E86C4A", marginLeft: 2 }}>*</span>}
  </label>
);

const SectionHead = ({ title, subtitle, action }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.01em" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: "#AAA", marginTop: 2 }}>{subtitle}</div>}
    </div>
    {action}
  </div>
);

// ─── ORG SETUP PAGE ───────────────────────────────────────────────────────────
function OrgSetupPage({ onComplete }) {
  const [businessType, setBusinessType] = useState("");
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [showAddress, setShowAddress] = useState(false);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("(UTC+00:00) London");
  const [vatRegistered, setVatRegistered] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [importExport, setImportExport] = useState(false);
  const [flatRate, setFlatRate] = useState(false);
  const [flatRatePct, setFlatRatePct] = useState("");

  const stateOptions = country === "United Kingdom" ? UK_COUNTIES : country === "United States" ? US_STATES : [];

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7F5", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 620, background: "#fff", borderRadius: 16, boxShadow: "0 4px 40px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ background: "#1A1A1A", padding: "32px 40px 28px", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: "#E86C4A", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Building />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em" }}>AI INVOICE</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Organization Setup</h1>
          <p style={{ fontSize: 14, color: "#AAAAAA", margin: 0, lineHeight: 1.6 }}>
            Welcome aboard, <span style={{ color: "#E86C4A", fontWeight: 600 }}>Alex</span>!<br />
            Enter your organization details to get started with AI Invoice.
          </p>
        </div>

        <div style={{ padding: "32px 40px 36px", overflowY: "auto", maxHeight: "70vh" }}>
          <Field label="Type of Business" required>
            <Toggle value={businessType} onChange={setBusinessType} options={["Sole Trader / Freelancer", "Limited Company"]} />
          </Field>
          <Field label="Organization Name" required>
            <InputBasic value={orgName} onChange={setOrgName} placeholder="e.g. Bright Studio Ltd" />
          </Field>
          <Field label="Industry" required>
            <div style={{ position: "relative" }}>
              <SelectBasic value={industry} onChange={setIndustry} options={INDUSTRIES} placeholder="Select an industry…" />
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#888" }}><Icons.ChevronDown /></div>
            </div>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Organization Location" required>
              <div style={{ position: "relative" }}>
                <SelectBasic value={country} onChange={(v) => { setCountry(v); setState(""); }} options={COUNTRIES} placeholder="Select country…" />
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#888" }}><Icons.ChevronDown /></div>
              </div>
            </Field>
            <Field label="State / Province / County">
              <div style={{ position: "relative" }}>
                {stateOptions.length > 0 ? (
                  <><SelectBasic value={state} onChange={setState} options={stateOptions} placeholder="Select…" />
                  <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#888" }}><Icons.ChevronDown /></div></>
                ) : (
                  <InputBasic value={state} onChange={setState} placeholder="Enter state / province…" />
                )}
              </div>
            </Field>
          </div>
          <Field label="">
            <button onClick={() => setShowAddress(!showAddress)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1.5px dashed #CCC", borderRadius: 7, padding: "9px 14px", cursor: "pointer", color: "#555", fontSize: 13, fontFamily: "inherit", width: "100%", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#1A1A1A"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#CCC"}>
              <span style={{ color: showAddress ? "#1A1A1A" : "#888" }}>{showAddress ? <Icons.ChevronDown /> : <Icons.ChevronRight />}</span>
              <span style={{ fontWeight: 500 }}>Add Organization Address</span>
            </button>
          </Field>
          {showAddress && (
            <div style={{ background: "#F9F9F9", borderRadius: 10, padding: "16px 16px 8px", marginBottom: 18, border: "1px solid #EBEBEB" }}>
              <Field label="Street Name"><InputBasic value={street} onChange={setStreet} placeholder="123 High Street" /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="City"><InputBasic value={city} onChange={setCity} placeholder="London" /></Field>
                <Field label="ZIP / Postal Code"><InputBasic value={zip} onChange={setZip} placeholder="EC1A 1BB" /></Field>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Currency" required>
              <div style={{ position: "relative" }}>
                <SelectBasic value={currency} onChange={setCurrency} options={CURRENCIES_LIST} placeholder="Select currency…" />
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#888" }}><Icons.ChevronDown /></div>
              </div>
            </Field>
            <Field label="Time Zone">
              <div style={{ position: "relative" }}>
                <SelectBasic value={timezone} onChange={setTimezone} options={TIMEZONES} />
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#888" }}><Icons.ChevronDown /></div>
              </div>
            </Field>
          </div>
          <Field label="Is this business registered for VAT?" required>
            <Toggle value={vatRegistered} onChange={setVatRegistered} options={["Yes", "No"]} />
          </Field>
          {vatRegistered === "Yes" && (
            <div style={{ background: "#F9F9F9", borderRadius: 10, padding: "16px 16px 6px", marginBottom: 18, border: "1px solid #EBEBEB" }}>
              <Field label="VAT Registration Number" required>
                <InputBasic value={vatNumber} onChange={setVatNumber} placeholder="GB123456789" />
              </Field>
              <Checkbox checked={importExport} onChange={setImportExport} label="I import/export goods and services from other countries" />
              <Checkbox checked={flatRate} onChange={setFlatRate} label="I've joined the VAT Flat Rate scheme. If you use flat rate, the VAT payable will be calculated as a percentage of total VAT-inclusive turnover." />
              {flatRate && (
                <Field label="Flat Rate VAT %"><InputBasic value={flatRatePct} onChange={setFlatRatePct} placeholder="e.g. 12.5" type="number" /></Field>
              )}
            </div>
          )}
          <button onClick={onComplete}
            style={{ width: "100%", padding: "13px 0", background: "#1A1A1A", color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.01em", transition: "background 0.2s", marginTop: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = "#E86C4A"}
            onMouseLeave={e => e.currentTarget.style.background = "#1A1A1A"}>
            Complete Setup →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NEW CUSTOMER MODAL ───────────────────────────────────────────────────────
function NewCustomerModal({ onClose, onSave }) {
  const [custType, setCustType] = useState("Business");
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("GBP - British Pound Sterling");
  const [email, setEmail] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [openSection, setOpenSection] = useState(null);
  const sections = ["Other Details", "Address", "Contact Persons", "Custom Fields", "Remarks"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px 18px", borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>New Customer</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#888" }}>Fill in the details below to create a new customer profile</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4 }}><Icons.X /></button>
        </div>
        <div style={{ overflowY: "auto", padding: "24px 28px", flex: 1 }}>
          <Field label="Customer Type" required>
            <Toggle value={custType} onChange={setCustType} options={["Business", "Individual"]} />
          </Field>
          <div style={{ background: "#F9F9F9", borderRadius: 10, padding: "16px 16px 4px", marginBottom: 18, border: "1px solid #EBEBEB" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Primary Contact</p>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 12 }}>
              <Field label="Salutation">
                <SelectBasic value={salutation} onChange={setSalutation} options={SALUTATIONS} placeholder="—" />
              </Field>
              <Field label="First Name" required>
                <InputBasic value={firstName} onChange={(v) => { setFirstName(v); if (!displayName) setDisplayName(v + " " + lastName); }} placeholder="Jane" />
              </Field>
              <Field label="Last Name" required>
                <InputBasic value={lastName} onChange={(v) => { setLastName(v); if (!displayName) setDisplayName(firstName + " " + v); }} placeholder="Smith" />
              </Field>
            </div>
          </div>
          {custType === "Business" && (
            <Field label="Company Name"><InputBasic value={companyName} onChange={setCompanyName} placeholder="e.g. Acme Corporation Ltd" /></Field>
          )}
          <Field label="Display Name" required>
            <InputBasic value={displayName} onChange={setDisplayName} placeholder="Name shown on invoices" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Currency">
              <div style={{ position: "relative" }}>
                <SelectBasic value={currency} onChange={setCurrency} options={CURRENCIES_LIST} />
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#888" }}><Icons.ChevronDown /></div>
              </div>
            </Field>
            <Field label="Email Address" required>
              <InputBasic value={email} onChange={setEmail} placeholder="jane@example.com" type="email" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Work Phone"><InputBasic value={workPhone} onChange={setWorkPhone} placeholder="+44 20 7946 0000" /></Field>
            <Field label="Mobile Phone"><InputBasic value={mobilePhone} onChange={setMobilePhone} placeholder="+44 7700 900000" /></Field>
          </div>
          <div style={{ borderTop: "1px solid #F0F0F0", marginTop: 8 }}>
            {sections.map(s => (
              <div key={s}>
                <button onClick={() => setOpenSection(openSection === s ? null : s)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: openSection === s ? "#1A1A1A" : "#555", borderBottom: "1px solid #F5F5F5" }}>
                  {s}
                  <span style={{ color: "#999", transition: "transform 0.2s", transform: openSection === s ? "rotate(180deg)" : "none" }}><Icons.ChevronDown /></span>
                </button>
                {openSection === s && (
                  <div style={{ padding: "16px 0 8px", borderBottom: "1px solid #F0F0F0" }}>
                    <p style={{ fontSize: 13, color: "#AAA", margin: 0 }}>No {s.toLowerCase()} added yet.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 28px 20px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", border: "1.5px solid #E0E0E0", borderRadius: 8, background: "#fff", color: "#555", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => { onSave({ id: Date.now(), name: displayName || firstName, email, phone: workPhone, type: custType, currency: currency.split(" - ")[0] }); onClose(); }}
            style={{ padding: "9px 22px", border: "none", borderRadius: 8, background: "#1A1A1A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Save Customer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home",      label: "Home",              Icon: Icons.Home },
  { id: "customers", label: "Customers",          Icon: Icons.Customers },
  { id: "items",     label: "Items",              Icon: Icons.Items },
  { id: "quotes",    label: "Quotes",             Icon: Icons.Quotes },
  { id: "invoices",  label: "Invoices",           Icon: Icons.Invoices },
  { id: "payments",  label: "Payments Received",  Icon: Icons.Payments },
  { id: "settings",  label: "Settings",           Icon: Icons.Settings },
];

function Sidebar({ active, setActive }) {
  return (
    <div style={{ width: 220, minHeight: "100vh", background: "#1A1A1A", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, background: "#E86C4A", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Invoices />
          </div>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 800, letterSpacing: "0.06em" }}>AI INVOICE</span>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "14px 10px" }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => setActive(id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 8, border: "none", background: isActive ? "rgba(232,108,74,0.15)" : "none", color: isActive ? "#E86C4A" : "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 400, fontFamily: "inherit", marginBottom: 2, textAlign: "left", transition: "all 0.15s" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "none"; }}>
              <Icon />{label}
              {isActive && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#E86C4A" }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "14px 18px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#E86C4A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>A</div>
        <div>
          <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Alex Morgan</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Admin</div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage() {
  const [aiInput, setAiInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi Alex 👋 I'm your AI Invoice assistant. Ask me anything — from finding invoices to generating financial summaries." }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!aiInput.trim() || loading) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are an AI assistant for an invoice management platform called AI Invoice. Help users with invoice creation, customer management, VAT queries, payment tracking, and financial reporting. Be concise, professional, and helpful.",
          messages: [{ role: "user", content: userMsg }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("") || "Sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: "assistant", text }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "I'm having trouble connecting right now. Please try again shortly." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1A1A1A", margin: "0 0 4px", letterSpacing: "-0.02em" }}>Good morning, Alex 👋</h1>
        <p style={{ color: "#888", fontSize: 14, margin: 0 }}>Saturday, 7 March 2026 · Here's your financial overview</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {MOCK_STATS.map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #EBEBEB", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#AAA", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      {/* AI Assistant */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #EBEBEB", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 22px", borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
          <div style={{ width: 30, height: 30, background: "#1A1A1A", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icons.Bot /></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>AI Assistant</div>
            <div style={{ fontSize: 11, color: "#AAA" }}>Powered by Claude · Ask about invoices, customers, VAT, and more</div>
          </div>
          <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#16A34A" }} />
        </div>
        <div style={{ height: 240, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "assistant" && (
                <div style={{ width: 26, height: 26, background: "#1A1A1A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginRight: 9, marginTop: 2, flexShrink: 0 }}><Icons.Bot /></div>
              )}
              <div style={{ maxWidth: "72%", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "#1A1A1A" : "#F4F4F4", color: m.role === "user" ? "#fff" : "#1A1A1A", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 6, padding: "10px 14px", background: "#F4F4F4", borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#CCC", animation: `pulse 1.2s ${i * 0.2}s infinite` }} />)}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 10, alignItems: "center" }}>
          <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Ask anything… 'Show overdue invoices' or 'How much VAT do I owe this quarter?'"
            style={{ flex: 1, padding: "11px 16px", border: "1.5px solid #E8E8E8", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", color: "#1A1A1A", background: "#FAFAFA" }} />
          <button onClick={sendMessage} disabled={loading}
            style={{ width: 40, height: 40, background: loading ? "#CCC" : "#1A1A1A", border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", transition: "background 0.15s", flexShrink: 0 }}>
            <Icons.Send />
          </button>
        </div>
      </div>
      {/* Recent Invoices */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #EBEBEB", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid #F0F0F0" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A" }}>Recent Invoices</span>
          <button style={{ fontSize: 12, color: "#E86C4A", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>View all →</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#FAFAFA" }}>
              {["Invoice #", "Customer", "Date", "Due", "Amount", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 22px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F0F0F0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES_HOME.map(inv => (
              <tr key={inv.id} style={{ borderBottom: "1px solid #F7F7F7", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ padding: "13px 22px", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{inv.id}</td>
                <td style={{ padding: "13px 22px", fontSize: 13, color: "#444" }}>{inv.customer}</td>
                <td style={{ padding: "13px 22px", fontSize: 13, color: "#888" }}>{inv.date}</td>
                <td style={{ padding: "13px 22px", fontSize: 13, color: "#888" }}>{inv.due}</td>
                <td style={{ padding: "13px 22px", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{inv.amount}</td>
                <td style={{ padding: "13px 22px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusColors[inv.status] + "18", color: statusColors[inv.status] }}>{inv.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CUSTOMERS PAGE ───────────────────────────────────────────────────────────
function CustomersPage() {
  const [customers, setCustomers] = useState(MOCK_CUSTOMERS_LIST);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 4px", letterSpacing: "-0.02em" }}>Customers</h1>
          <p style={{ color: "#AAA", fontSize: 13, margin: 0 }}>{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "#1A1A1A", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <Icons.Plus /> New Customer
        </button>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #EBEBEB", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: 10 }}>
          <Icons.Search />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#1A1A1A", background: "transparent", fontFamily: "inherit" }} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#FAFAFA" }}>
              {["Name", "Type", "Email", "Phone", "Currency"].map(h => (
                <th key={h} style={{ padding: "10px 22px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F0F0F0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid #F7F7F7", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ padding: "14px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "#555" }}>{c.name[0]}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 22px" }}><span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.type === "Business" ? "#EEF2FF" : "#FFF7ED", color: c.type === "Business" ? "#4F46E5" : "#EA580C" }}>{c.type}</span></td>
                <td style={{ padding: "14px 22px", fontSize: 13, color: "#555" }}>{c.email}</td>
                <td style={{ padding: "14px 22px", fontSize: 13, color: "#888" }}>{c.phone}</td>
                <td style={{ padding: "14px 22px", fontSize: 13, color: "#888" }}>{c.currency}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "40px 22px", textAlign: "center", color: "#CCC", fontSize: 14 }}>No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {showModal && <NewCustomerModal onClose={() => setShowModal(false)} onSave={(c) => setCustomers(prev => [...prev, c])} />}
    </div>
  );
}

// ─── INVOICE: LINE ITEMS TABLE ────────────────────────────────────────────────
function LineItemsTable({ items, onChange, currSymbol }) {
  const update = (id, field, val) => {
    onChange(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      updated.amount = Number(updated.quantity) * Number(updated.rate);
      return updated;
    }));
  };
  const addRow = () => onChange([...items, newLine(items.length)]);
  const remove = (id) => onChange(items.filter(i => i.id !== id));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 90px 80px 36px", gap: 6, padding: "0 0 8px", borderBottom: "1.5px solid #EBEBEB", marginBottom: 8 }}>
        {[["Description","auto","left"],["Qty",80,"center"],["Rate",90,"right"],["VAT %",90,"center"],["Amount",80,"right"],["",36,"left"]].map(([l, w, a]) => (
          <div key={l} style={{ fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: a }}>{l}</div>
        ))}
      </div>
      {items.map((item, idx) => (
        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 90px 80px 36px", gap: 6, marginBottom: 7, alignItems: "center" }}>
          <InputInv value={item.description} onChange={v => update(item.id, "description", v)} placeholder={`Item ${idx + 1} description…`} />
          <InputInv value={item.quantity} onChange={v => update(item.id, "quantity", v)} type="number" align="center" />
          <InputInv value={item.rate} onChange={v => update(item.id, "rate", v)} type="number" align="right" />
          <select value={item.tax_rate} onChange={e => update(item.id, "tax_rate", Number(e.target.value))}
            style={{ width: "100%", padding: "8px 6px", border: "1.5px solid #E4E4E4", borderRadius: 7, fontSize: 13, fontFamily: ff, background: "#FAFAFA", outline: "none", appearance: "none", textAlign: "center", cursor: "pointer" }}>
            {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
          </select>
          <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "#1A1A1A", padding: "0 2px" }}>{fmt(currSymbol, item.amount)}</div>
          <button onClick={() => remove(item.id)} disabled={items.length === 1}
            style={{ width: 32, height: 32, border: "none", background: "none", cursor: items.length === 1 ? "not-allowed" : "pointer", color: "#CCC", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
            onMouseEnter={e => { if (items.length > 1) e.currentTarget.style.color = "#DC2626"; }}
            onMouseLeave={e => e.currentTarget.style.color = "#CCC"}>
            <Ic.Trash />
          </button>
        </div>
      ))}
      <Btn onClick={addRow} variant="ghost" size="sm" icon={<Ic.Plus />} style={{ marginTop: 4, color: "#E86C4A", fontWeight: 700 }}>
        Add Line Item
      </Btn>
    </div>
  );
}

// ─── INVOICE: TOTALS BLOCK ────────────────────────────────────────────────────
function TotalsBlock({ subtotal, discountType, discountValue, setDiscountType, setDiscountValue, shipping, setShipping, taxBreakdown, total, currSymbol }) {
  const discountAmount = discountType === "percent" ? subtotal * (Number(discountValue) / 100) : Math.min(Number(discountValue), subtotal);
  const row = (label, value, bold, color) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
      <span style={{ fontSize: 13, color: color || "#666", fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 13, color: color || (bold ? "#1A1A1A" : "#444"), fontWeight: bold ? 800 : 500 }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background: "#FAFAFA", borderRadius: 10, border: "1px solid #EBEBEB", padding: "16px 18px", minWidth: 280 }}>
      {row("Subtotal", fmt(currSymbol, subtotal))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
        <span style={{ fontSize: 13, color: "#666" }}>Discount</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ display: "flex", border: "1.5px solid #E4E4E4", borderRadius: 7, overflow: "hidden" }}>
            {[["percent", "%"], ["fixed", currSymbol]].map(([t, l]) => (
              <button key={t} onClick={() => setDiscountType(t)}
                style={{ padding: "4px 10px", border: "none", background: discountType === t ? "#1A1A1A" : "transparent", color: discountType === t ? "#fff" : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>
          <input value={discountValue} onChange={e => setDiscountValue(e.target.value)} type="number" min="0"
            style={{ width: 72, padding: "5px 8px", border: "1.5px solid #E4E4E4", borderRadius: 7, fontSize: 13, textAlign: "right", fontFamily: ff, background: "#fff", outline: "none" }} />
        </div>
      </div>
      {discountAmount > 0 && row("", `− ${fmt(currSymbol, discountAmount)}`, false, "#E86C4A")}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
        <span style={{ fontSize: 13, color: "#666" }}>Shipping</span>
        <input value={shipping} onChange={e => setShipping(e.target.value)} type="number" min="0"
          style={{ width: 90, padding: "5px 8px", border: "1.5px solid #E4E4E4", borderRadius: 7, fontSize: 13, textAlign: "right", fontFamily: ff, background: "#fff", outline: "none" }} placeholder="0.00" />
      </div>
      {taxBreakdown.map(tb => row(`VAT ${tb.rate}%`, fmt(currSymbol, tb.amount)))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 4px", borderTop: "2px solid #1A1A1A", marginTop: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#1A1A1A" }}>Total</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>{fmt(currSymbol, total)}</span>
      </div>
    </div>
  );
}

// ─── INVOICE: PREVIEW PANEL ───────────────────────────────────────────────────
function InvoicePreview({ data, currSymbol }) {
  const { invoiceNumber, customer, issueDate, dueDate, items, subtotal, discountAmount, shipping, taxBreakdown, total, notes, terms, currency, status } = data;
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #EBEBEB", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", fontFamily: ff }}>
      <div style={{ background: "#1A1A1A", padding: "24px 28px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>AI Invoice</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>INVOICE</div>
            <div style={{ fontSize: 13, color: "#E86C4A", fontWeight: 700, marginTop: 2 }}>{invoiceNumber || "INV-0001"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Tag color={statusColors[status] || "#6B7280"}>{status || "Draft"}</Tag>
            <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Issued: <span style={{ color: "#fff" }}>{fmtDate(issueDate)}</span></div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Due: <span style={{ color: dueDate && new Date(dueDate) < new Date() ? "#E86C4A" : "#fff" }}>{fmtDate(dueDate)}</span></div>
          </div>
        </div>
      </div>
      <div style={{ padding: "22px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Bill To</div>
            {customer ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{customer.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 3, lineHeight: 1.7 }}>{customer.email}<br />{customer.address}</div>
              </>
            ) : <div style={{ fontSize: 13, color: "#CCC", fontStyle: "italic" }}>Select a customer…</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Currency</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{currency || "GBP"} ({currSymbol})</div>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid #EBEBEB" }}>
              {["Description", "Qty", "Rate", "VAT", "Amount"].map((h, i) => (
                <th key={h} style={{ padding: "6px 0 8px", textAlign: i > 0 ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.filter(i => i.description || i.amount > 0).map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #F7F7F7" }}>
                <td style={{ padding: "9px 0", fontSize: 12, color: "#1A1A1A" }}>{item.description || <span style={{ color: "#CCC" }}>Item {idx + 1}</span>}</td>
                <td style={{ padding: "9px 0", fontSize: 12, color: "#555", textAlign: "right" }}>{item.quantity}</td>
                <td style={{ padding: "9px 0", fontSize: 12, color: "#555", textAlign: "right" }}>{fmt(currSymbol, item.rate)}</td>
                <td style={{ padding: "9px 0", fontSize: 12, color: "#555", textAlign: "right" }}>{item.tax_rate}%</td>
                <td style={{ padding: "9px 0", fontSize: 12, fontWeight: 700, color: "#1A1A1A", textAlign: "right" }}>{fmt(currSymbol, item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ minWidth: 220 }}>
            {[
              ["Subtotal", fmt(currSymbol, subtotal)],
              ...(discountAmount > 0 ? [["Discount", `− ${fmt(currSymbol, discountAmount)}`, "#E86C4A"]] : []),
              ...(Number(shipping) > 0 ? [["Shipping", fmt(currSymbol, shipping)]] : []),
              ...taxBreakdown.map(tb => [`VAT ${tb.rate}%`, fmt(currSymbol, tb.amount)]),
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 32, padding: "4px 0" }}>
                <span style={{ fontSize: 12, color: "#888" }}>{l}</span>
                <span style={{ fontSize: 12, color: c || "#555", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 32, padding: "10px 0 2px", borderTop: "2px solid #1A1A1A", marginTop: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#1A1A1A" }}>Total Due</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A" }}>{fmt(currSymbol, total)}</span>
            </div>
          </div>
        </div>
        {(notes || terms) && (
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #F0F0F0" }}>
            {notes && <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Customer Notes</div>
              <p style={{ fontSize: 12, color: "#666", margin: 0, lineHeight: 1.7 }}>{notes}</p>
            </div>}
            {terms && <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Terms & Conditions</div>
              <p style={{ fontSize: 12, color: "#666", margin: 0, lineHeight: 1.7 }}>{terms}</p>
            </div>}
          </div>
        )}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #F0F0F0", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "#CCC", fontStyle: "italic" }}>Generated by AI Invoice</span>
          <span style={{ fontSize: 10, color: "#CCC" }}>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}

// ─── INVOICE: LIST VIEW ───────────────────────────────────────────────────────
function InvoiceList({ invoices, onNew, onEdit }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const FILTERS = ["All", "Draft", "Sent", "Paid", "Overdue"];
  const filtered = invoices.filter(inv =>
    (inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) || inv.customer_name?.toLowerCase().includes(search.toLowerCase())) &&
    (filter === "All" || inv.status === filter)
  );
  const totals = {
    outstanding: invoices.filter(i => i.status === "Sent").reduce((a, b) => a + b.total, 0),
    overdue: invoices.filter(i => i.status === "Overdue").reduce((a, b) => a + b.total, 0),
    paid: invoices.filter(i => i.status === "Paid").reduce((a, b) => a + b.total, 0),
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[{ l: "Outstanding", v: totals.outstanding, c: "#2563EB" }, { l: "Overdue", v: totals.overdue, c: "#DC2626" }, { l: "Paid (all time)", v: totals.paid, c: "#16A34A" }].map(s => (
          <div key={s.l} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", border: "1px solid #EBEBEB" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>£{s.v.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#AAA" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices…"
            style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1.5px solid #E4E4E4", borderRadius: 8, fontSize: 13, fontFamily: ff, outline: "none", background: "#fff", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F0F0F0", padding: 4, borderRadius: 8 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: filter === f ? "#1A1A1A" : "transparent", color: filter === f ? "#fff" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, transition: "all 0.15s" }}>
              {f}
            </button>
          ))}
        </div>
        <Btn onClick={onNew} variant="accent" icon={<Ic.Plus />}>New Invoice</Btn>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #F0F0F0" }}>
              {["Invoice #", "Customer", "Issue Date", "Due Date", "Amount", "Status", ""].map(h => (
                <th key={h} style={{ padding: "10px 18px", textAlign: h === "Amount" ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} style={{ borderBottom: "1px solid #F7F7F7", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ padding: "13px 18px", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{inv.invoice_number}</td>
                <td style={{ padding: "13px 18px", fontSize: 13, color: "#444" }}>{inv.customer_name}</td>
                <td style={{ padding: "13px 18px", fontSize: 13, color: "#888" }}>{fmtDate(inv.issue_date)}</td>
                <td style={{ padding: "13px 18px", fontSize: 13, color: new Date(inv.due_date) < new Date() && inv.status !== "Paid" ? "#DC2626" : "#888" }}>{fmtDate(inv.due_date)}</td>
                <td style={{ padding: "13px 18px", fontSize: 13, fontWeight: 700, color: "#1A1A1A", textAlign: "right" }}>{fmt("£", inv.total)}</td>
                <td style={{ padding: "13px 18px" }}><Tag color={statusColors[inv.status]}>{inv.status}</Tag></td>
                <td style={{ padding: "13px 18px" }}><Btn onClick={() => onEdit(inv)} variant="ghost" size="sm" icon={<Ic.Edit />}>Edit</Btn></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "48px 18px", textAlign: "center", color: "#CCC", fontSize: 13 }}>
                {invoices.length === 0 ? "No invoices yet. Click 'New Invoice' to get started." : "No invoices match your search."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── INVOICE: FORM PAGE ───────────────────────────────────────────────────────
function InvoiceFormPage({ existing, invoices, onSave, onCancel }) {
  const isEdit = !!existing;
  const [invoiceNumber, setInvoiceNumber] = useState(existing?.invoice_number || nextInvNumber(invoices.map(i => i.invoice_number)));
  const [customer, setCustomer] = useState(existing ? MOCK_CUSTOMERS_INVOICE.find(c => c.id === existing.customer_id) || null : null);
  const [issueDate, setIssueDate] = useState(existing?.issue_date || today());
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [dueDate, setDueDate] = useState(existing?.due_date || addDays(today(), 30));
  const [currency, setCurrency] = useState(existing?.currency || "GBP");
  const [status, setStatus] = useState(existing?.status || "Draft");
  const [items, setItems] = useState(existing?.line_items?.length ? existing.line_items : [newLine(0)]);
  const [discountType, setDiscountType] = useState(existing?.discount_type || "percent");
  const [discountValue, setDiscountValue] = useState(existing?.discount_value || 0);
  const [shipping, setShipping] = useState(existing?.shipping || 0);
  const [notes, setNotes] = useState(existing?.notes || "");
  const [terms, setTerms] = useState(existing?.terms || DEFAULT_TERMS);
  const [isRecurring, setIsRecurring] = useState(existing?.is_recurring || false);
  const [recurringFreq, setRecurringFreq] = useState(existing?.recurring_frequency || "Monthly");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState("form");

  useEffect(() => {
    const termDays = { "Due on Receipt": 0, "Net 7": 7, "Net 14": 14, "Net 30": 30, "Net 60": 60, "Net 90": 90 };
    if (paymentTerms in termDays) setDueDate(addDays(issueDate, termDays[paymentTerms]));
  }, [paymentTerms, issueDate]);

  const currSymbol = INVOICE_CURRENCIES[currency] || "£";
  const subtotal = items.reduce((s, i) => s + Number(i.amount), 0);
  const discountAmount = discountType === "percent" ? subtotal * (Number(discountValue) / 100) : Math.min(Number(discountValue), subtotal);
  const afterDiscount = subtotal - discountAmount;
  const taxBreakdown = TAX_RATES.filter(r => r > 0).map(rate => ({
    rate, amount: items.filter(i => Number(i.tax_rate) === rate).reduce((s, i) => s + i.amount * (rate / 100), 0)
  })).filter(tb => tb.amount > 0);
  const taxTotal = taxBreakdown.reduce((s, tb) => s + tb.amount, 0);
  const total = afterDiscount + Number(shipping) + taxTotal;

  const previewData = { invoiceNumber, customer, issueDate, dueDate, currency, status, items, subtotal, discountAmount, shipping, taxBreakdown, total, notes, terms };

  const handleSave = useCallback(async (newStatus = status) => {
    setSaving(true);
    const payload = {
      invoice_number: invoiceNumber, customer_id: customer?.id || null, customer_name: customer?.name || "",
      customer_email: customer?.email || "", customer_address: customer?.address || "",
      issue_date: issueDate, due_date: dueDate, status: newStatus, currency,
      subtotal, discount_type: discountType, discount_value: Number(discountValue), discount_amount: discountAmount,
      shipping: Number(shipping), tax_total: taxTotal, total, notes, terms,
      is_recurring: isRecurring, recurring_frequency: isRecurring ? recurringFreq : null,
      updated_at: new Date().toISOString(),
    };
    try {
      let savedInvoice;
      if (isEdit && existing.id) {
        await supabase("PATCH", `invoices?id=eq.${existing.id}`, payload);
        await supabase("DELETE", `invoice_line_items?invoice_id=eq.${existing.id}`);
        savedInvoice = { ...existing, ...payload };
      } else {
        const [inv] = await supabase("POST", "invoices", payload);
        savedInvoice = inv;
      }
      if (savedInvoice?.id) {
        await supabase("POST", "invoice_line_items", items.map((item, idx) => ({
          invoice_id: savedInvoice.id, description: item.description, quantity: Number(item.quantity),
          rate: Number(item.rate), tax_rate: Number(item.tax_rate), amount: Number(item.amount), sort_order: idx,
        })));
      }
      setStatus(newStatus);
      setSaveMsg(newStatus === "Sent" ? "Invoice sent!" : "Saved!");
      onSave({ ...payload, id: savedInvoice?.id, line_items: items, status: newStatus });
    } catch (err) {
      console.warn("Supabase not configured, saving locally:", err.message);
      setSaveMsg(newStatus === "Sent" ? "Saved locally!" : "Saved locally!");
      onSave({ ...payload, id: existing?.id || crypto.randomUUID(), line_items: items, status: newStatus });
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  }, [invoiceNumber, customer, issueDate, dueDate, currency, status, items, discountType, discountValue, discountAmount, shipping, taxTotal, total, notes, terms, isRecurring, recurringFreq, isEdit, existing, onSave]);

  return (
    <div style={{ fontFamily: ff }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A", margin: "0 0 3px", letterSpacing: "-0.02em" }}>{isEdit ? `Edit ${invoiceNumber}` : "New Invoice"}</h1>
          <p style={{ color: "#AAA", fontSize: 13, margin: 0 }}>{isEdit ? `Last updated ${fmtDate(existing?.updated_at)}` : "Fill in the details below"}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saveMsg && <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><Ic.Check />{saveMsg}</span>}
          <Btn onClick={onCancel} variant="outline">Cancel</Btn>
          <Btn onClick={() => handleSave("Draft")} variant="outline" disabled={saving} icon={<Ic.Save />}>Save Draft</Btn>
          <Btn onClick={() => handleSave("Sent")} variant="accent" disabled={saving} icon={<Ic.Send />}>{saving ? "Saving…" : "Save & Send"}</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#F0F0F0", padding: 4, borderRadius: 9, marginBottom: 18, width: "fit-content" }}>
        {[["form", <Ic.Edit />, "Edit"], ["preview", <Ic.Eye />, "Preview"]].map(([t, icon, label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 16px", borderRadius: 7, border: "none", background: activeTab === t ? "#1A1A1A" : "transparent", color: activeTab === t ? "#fff" : "#888", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff, transition: "all 0.15s" }}>
            {icon}{label}
          </button>
        ))}
      </div>

      {activeTab === "form" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Invoice Details */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: "22px 24px" }}>
              <SectionHead title="Invoice Details" subtitle="Basic information about this invoice" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div><LabelInv required>Invoice Number</LabelInv><InputInv value={invoiceNumber} onChange={setInvoiceNumber} placeholder="INV-0001" /></div>
                <div><LabelInv required>Issue Date</LabelInv><InputInv value={issueDate} onChange={setIssueDate} type="date" /></div>
                <div><LabelInv>Status</LabelInv><SelectInv value={status} onChange={setStatus} options={["Draft", "Sent", "Paid", "Void"]} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 14 }}>
                <div><LabelInv>Payment Terms</LabelInv><SelectInv value={paymentTerms} onChange={setPaymentTerms} options={PAYMENT_TERMS} /></div>
                <div><LabelInv required>Due Date</LabelInv><InputInv value={dueDate} onChange={setDueDate} type="date" /></div>
                <div><LabelInv>Currency</LabelInv><SelectInv value={currency} onChange={setCurrency} options={Object.keys(INVOICE_CURRENCIES).map(k => ({ value: k, label: `${k} (${INVOICE_CURRENCIES[k]})` }))} /></div>
              </div>
            </div>
            {/* Bill To */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: "22px 24px" }}>
              <SectionHead title="Bill To" subtitle="Select or search an existing customer" />
              <SelectInv value={customer?.id || ""} onChange={id => setCustomer(MOCK_CUSTOMERS_INVOICE.find(c => c.id === id) || null)} options={MOCK_CUSTOMERS_INVOICE.map(c => ({ value: c.id, label: c.name }))} placeholder="Select a customer…" />
              {customer && (
                <div style={{ marginTop: 12, padding: "12px 14px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #EBEBEB" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{customer.name}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{customer.email} · {customer.address}</div>
                </div>
              )}
            </div>
            {/* Line Items */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: "22px 24px" }}>
              <SectionHead title="Line Items" subtitle="Products or services being invoiced" />
              <LineItemsTable items={items} onChange={setItems} currSymbol={currSymbol} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <TotalsBlock subtotal={subtotal} discountType={discountType} discountValue={discountValue} setDiscountType={setDiscountType} setDiscountValue={setDiscountValue} shipping={shipping} setShipping={setShipping} taxBreakdown={taxBreakdown} total={total} currSymbol={currSymbol} />
              </div>
            </div>
            {/* Notes & Terms */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: "22px 24px" }}>
              <SectionHead title="Notes & Terms" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <LabelInv>Customer Notes</LabelInv>
                  <TextareaInv value={notes} onChange={setNotes} placeholder="Thank you for your business!" rows={4} />
                  <div style={{ fontSize: 11, color: "#BBB", marginTop: 4 }}>Visible to your customer on the invoice</div>
                </div>
                <div>
                  <LabelInv>Terms & Conditions</LabelInv>
                  <TextareaInv value={terms} onChange={setTerms} placeholder="Payment terms, late fees, etc." rows={4} />
                  <div style={{ fontSize: 11, color: "#BBB", marginTop: 4 }}>Printed at the bottom of the invoice</div>
                </div>
              </div>
            </div>
            {/* Recurring */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <SectionHead title="Recurring Invoice" subtitle="Schedule this invoice to repeat automatically" />
                <button onClick={() => setIsRecurring(!isRecurring)}
                  style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: isRecurring ? "#1A1A1A" : "#E0E0E0", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: isRecurring ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </button>
              </div>
              {isRecurring && (
                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><LabelInv>Frequency</LabelInv><SelectInv value={recurringFreq} onChange={setRecurringFreq} options={RECURRING_OPTS} /></div>
                  <div><LabelInv>Next Invoice Date</LabelInv><InputInv value={dueDate} readOnly /></div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", background: "#FFFBEB", borderRadius: 8, border: "1px solid #FDE68A" }}>
                    <div style={{ color: "#D97706", marginTop: 1 }}><Ic.Info /></div>
                    <p style={{ margin: 0, fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>A reminder will be created on the next invoice date. You review and send it manually.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Live Preview */}
          <div style={{ position: "sticky", top: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Live Preview</div>
            <InvoicePreview data={previewData} currSymbol={currSymbol} />
          </div>
        </div>
      )}

      {activeTab === "preview" && (
        <div style={{ maxWidth: 700, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 14 }}>
            <Btn variant="outline" size="sm" icon={<Ic.Download />}>Download PDF</Btn>
            <Btn variant="primary" size="sm" icon={<Ic.Send />} onClick={() => handleSave("Sent")}>Send Invoice</Btn>
          </div>
          <InvoicePreview data={previewData} currSymbol={currSymbol} />
        </div>
      )}
    </div>
  );
}

// ─── INVOICES PAGE ────────────────────────────────────────────────────────────
function InvoicesPage() {
  const [invoices, setInvoices] = useState([
    { id: "i1", invoice_number: "INV-0001", customer_id: "c1", customer_name: "Acme Corporation", issue_date: "2026-02-01", due_date: "2026-03-03", status: "Overdue", currency: "GBP", total: 3200, line_items: [] },
    { id: "i2", invoice_number: "INV-0002", customer_id: "c2", customer_name: "Blue Sky Ltd", issue_date: "2026-03-01", due_date: "2026-03-31", status: "Sent", currency: "GBP", total: 1120, line_items: [] },
    { id: "i3", invoice_number: "INV-0003", customer_id: "c3", customer_name: "Green Media Group", issue_date: "2026-01-15", due_date: "2026-02-14", status: "Paid", currency: "GBP", total: 8400, line_items: [] },
    { id: "i4", invoice_number: "INV-0004", customer_id: "c4", customer_name: "Nova Tech Solutions", issue_date: "2026-03-05", due_date: "2026-04-04", status: "Draft", currency: "GBP", total: 560, line_items: [] },
  ]);
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);

  const handleSave = (inv) => {
    setInvoices(prev => {
      const idx = prev.findIndex(i => i.id === inv.id);
      if (idx >= 0) { const updated = [...prev]; updated[idx] = inv; return updated; }
      return [inv, ...prev];
    });
    setView("list");
    setEditing(null);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, fontFamily: ff }}>
      {view === "list" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 4px", letterSpacing: "-0.02em" }}>Invoices</h1>
            <p style={{ color: "#AAA", fontSize: 13, margin: 0 }}>Create, manage, and track your invoices</p>
          </div>
          <InvoiceList invoices={invoices} onNew={() => setView("new")} onEdit={(inv) => { setEditing(inv); setView("edit"); }} />
        </>
      )}
      {(view === "new" || view === "edit") && (
        <InvoiceFormPage existing={view === "edit" ? editing : null} invoices={invoices} onSave={handleSave} onCancel={() => { setView("list"); setEditing(null); }} />
      )}
    </div>
  );
}

// ─── PLACEHOLDER PAGE ─────────────────────────────────────────────────────────
function PlaceholderPage({ title, icon: PageIcon, action }) {
  return (
    <div style={{ padding: "32px 36px", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 4px", letterSpacing: "-0.02em" }}>{title}</h1>
          <p style={{ color: "#AAA", fontSize: 13, margin: 0 }}>Manage your {title.toLowerCase()} here</p>
        </div>
        {action && (
          <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "#1A1A1A", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            <Icons.Plus /> {action}
          </button>
        )}
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: "1.5px dashed #E8E8E8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, color: "#CCC", gap: 12 }}>
        <PageIcon />
        <p style={{ fontSize: 14, color: "#BBB", margin: 0 }}>No {title.toLowerCase()} yet. {action && `Click "${action}" to get started.`}</p>
      </div>
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage({ onOrgSetup }) {
  return (
    <div style={{ padding: "32px 36px", maxWidth: 700, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", marginBottom: 24, letterSpacing: "-0.02em" }}>Settings</h1>
      {[
        { label: "Organization Setup", desc: "Edit your organization details, VAT, and preferences", action: "Edit", onClick: onOrgSetup },
        { label: "Google Drive Integration", desc: "Connect Google Drive to export and store invoices as PDFs", action: "Connect", icon: <Icons.GoogleDrive /> },
        { label: "PDF Export Settings", desc: "Customize invoice PDF layout, logo, and footer", action: "Configure", icon: <Icons.Download /> },
        { label: "Users & Permissions", desc: "Manage team members and their access levels", action: "Manage", icon: <Icons.User /> },
      ].map(item => (
        <div key={item.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: "18px 22px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, background: "#F4F4F4", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
              {item.icon || <Icons.Settings />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{item.label}</div>
              <div style={{ fontSize: 12, color: "#AAA", marginTop: 2 }}>{item.desc}</div>
            </div>
          </div>
          <button onClick={item.onClick} style={{ padding: "8px 16px", border: "1.5px solid #E0E0E0", borderRadius: 8, background: "#fff", color: "#1A1A1A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            {item.action}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("setup");
  const [activePage, setActivePage] = useState("home");

  if (screen === "setup") {
    return <OrgSetupPage onComplete={() => setScreen("app")} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case "home":      return <HomePage />;
      case "customers": return <CustomersPage />;
      case "items":     return <PlaceholderPage title="Items" icon={Icons.Items} action="New Item" />;
      case "quotes":    return <PlaceholderPage title="Quotes" icon={Icons.Quotes} action="New Quote" />;
      case "invoices":  return <InvoicesPage />;   // ← FULLY INTEGRATED
      case "payments":  return <PlaceholderPage title="Payments Received" icon={Icons.Payments} action="Record Payment" />;
      case "settings":  return <SettingsPage onOrgSetup={() => setScreen("setup")} />;
      default:          return <HomePage />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F7F7F5" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800&family=Instrument+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#DDD;border-radius:10px}
      `}</style>
      <Sidebar active={activePage} setActive={setActivePage} />
      <main style={{ marginLeft: 220, flex: 1, overflowY: "auto" }}>
        {renderPage()}
      </main>
    </div>
  );
}
