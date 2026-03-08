import { useState, useRef, useEffect, useCallback } from "react";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "Prefer": method === "POST" ? "return=representation" : "" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

// ─── FONTS ────────────────────────────────────────────────────────────────────
const ff = "'Instrument Sans', 'DM Sans', 'Helvetica Neue', sans-serif";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TAX_RATES = [0, 5, 12.5, 20];
const INVOICE_CURRENCIES = { GBP: "£", USD: "$", EUR: "€", AUD: "A$", CAD: "C$", CHF: "Fr", JPY: "¥", INR: "₹" };
const PAYMENT_TERMS = ["Due on Receipt", "Net 7", "Net 14", "Net 30", "Net 60", "Net 90", "Custom"];
const RECURRING_OPTS = ["Weekly", "Monthly", "Quarterly", "Yearly"];
const DEFAULT_INVOICE_TERMS = "Payment is due within the agreed payment terms. Late payments may incur interest charges. Please make payment to the bank details provided above.";
const INDUSTRIES = ["Agency","Agriculture","Art and Design","Automotive","Construction","Consulting","Consumer Packaged Goods","Education","Engineering","Entertainment","Financial Services","Food Services (Restaurant/Fast Food)","Gardening","Gaming","Government","Health Care","Interior Design","Internal","Legal","Logistics","Manufacturing","Marketing","Mining and Logistics","Non Profit","Publishing and Web Media","Real Estate","Retail (E-commerce and Offline)","Services","Technology","Telecommunications","Travel/Hospitality","Web Design","Web Developers","Writers","Others"];
const COUNTRIES = ["United Kingdom","Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Sierra Leone","Singapore","Slovakia","Slovenia","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Uganda","Ukraine","United Arab Emirates","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];
const CURRENCIES_LIST = ["GBP - British Pound Sterling","USD - US Dollar","EUR - Euro","AUD - Australian Dollar","CAD - Canadian Dollar","CHF - Swiss Franc","CNY - Chinese Yuan","JPY - Japanese Yen","INR - Indian Rupee","SGD - Singapore Dollar","HKD - Hong Kong Dollar","SEK - Swedish Krona","NOK - Norwegian Krone","DKK - Danish Krone","NZD - New Zealand Dollar","ZAR - South African Rand","AED - UAE Dirham","BRL - Brazilian Real","MXN - Mexican Peso","KRW - South Korean Won"];
const TIMEZONES = ["(UTC+00:00) London","(UTC+00:00) Dublin","(UTC+00:00) Lisbon","(UTC+01:00) Amsterdam","(UTC+01:00) Berlin","(UTC+01:00) Brussels","(UTC+01:00) Madrid","(UTC+01:00) Paris","(UTC+01:00) Rome","(UTC+02:00) Athens","(UTC+02:00) Cairo","(UTC+02:00) Johannesburg","(UTC+03:00) Istanbul","(UTC+03:00) Moscow","(UTC+03:00) Riyadh","(UTC+04:00) Dubai","(UTC+05:00) Karachi","(UTC+05:30) New Delhi","(UTC+06:00) Dhaka","(UTC+07:00) Bangkok","(UTC+08:00) Beijing","(UTC+08:00) Singapore","(UTC+09:00) Tokyo","(UTC+09:30) Adelaide","(UTC+10:00) Sydney","(UTC+12:00) Auckland","(UTC-05:00) New York","(UTC-06:00) Chicago","(UTC-07:00) Denver","(UTC-08:00) Los Angeles","(UTC-09:00) Anchorage","(UTC-10:00) Honolulu"];
const UK_COUNTIES = ["Avon","Bedfordshire","Berkshire","Bristol","Buckinghamshire","Cambridgeshire","Cheshire","City of London","Cleveland","Cornwall","Cumbria","Derbyshire","Devon","Dorset","Durham","East Riding of Yorkshire","East Sussex","Essex","Gloucestershire","Greater London","Greater Manchester","Hampshire","Herefordshire","Hertfordshire","Isle of Wight","Kent","Lancashire","Leicestershire","Lincolnshire","Merseyside","Middlesex","Norfolk","North Yorkshire","Northamptonshire","Northumberland","Nottinghamshire","Oxfordshire","Rutland","Shropshire","Somerset","South Yorkshire","Staffordshire","Suffolk","Surrey","Tyne and Wear","Warwickshire","West Midlands","West Sussex","West Yorkshire","Wiltshire","Worcestershire"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Miss", "Dr.", "Prof."];
const ITEM_UNITS = ["hrs", "days", "qty", "kg", "m", "m²", "m³", "l", "pcs", "flat rate"];
const CIS_RATES = ["20%", "30%", "0% (gross payment)"];

const statusColors = { Sent: "#2563EB", Overdue: "#C0392B", Paid: "#16A34A", Draft: "#6B7280", Void: "#9CA3AF", Accepted: "#16A34A", Declined: "#DC2626", Expired: "#9CA3AF" };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (sym, val) => `${sym}${Number(val).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayStr = () => new Date().toISOString().split("T")[0];
const addDaysStr = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split("T")[0]; };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const newLine = (order = 0) => ({ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, tax_rate: 20, amount: 0, sort_order: order });
const nextNum = (prefix, existing) => {
  const nums = existing.map(n => parseInt((n || "").replace(/\D/g, ""), 10)).filter(Boolean);
  return `${prefix}-${String(nums.length ? Math.max(...nums) + 1 : 1).padStart(4, "0")}`;
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const INITIAL_CUSTOMERS = [
  { id: "c1", name: "Acme Corporation", email: "billing@acme.com", phone: "+44 20 7946 0001", type: "Business", currency: "GBP", billingAddress: { street: "123 High Street", city: "London", county: "Greater London", postcode: "EC1A 1BB", country: "United Kingdom" }, shippingAddress: null, contactPersons: [], otherDetails: {}, remarks: "" },
  { id: "c2", name: "Blue Sky Ltd", email: "accounts@bluesky.co.uk", phone: "+44 161 496 0002", type: "Business", currency: "GBP", billingAddress: { street: "45 Oxford Road", city: "Manchester", county: "Greater Manchester", postcode: "M1 2JA", country: "United Kingdom" }, shippingAddress: null, contactPersons: [], otherDetails: {}, remarks: "" },
];

const INITIAL_ITEMS = [
  { id: "i1", name: "Web Design", description: "Professional website design and development", rate: 850, unit: "flat rate", taxRate: 20, active: true },
  { id: "i2", name: "Consulting", description: "Business consulting per hour", rate: 120, unit: "hrs", taxRate: 20, active: true },
];

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

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Svg = ({ children, size = 18, sw = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const Icons = {
  Home:      () => <Svg><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/></Svg>,
  Customers: () => <Svg><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.85"/></Svg>,
  Items:     () => <Svg><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></Svg>,
  Quotes:    () => <Svg><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></Svg>,
  Invoices:  () => <Svg><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></Svg>,
  Payments:  () => <Svg><rect x="1" y="5" width="22" height="14" rx="2"/><path d="M1 10h22"/></Svg>,
  Settings:  () => <Svg><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></Svg>,
  Plus:      () => <Svg size={16} sw={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>,
  ChevDown:  () => <Svg size={14} sw={2}><polyline points="6 9 12 15 18 9"/></Svg>,
  ChevRight: () => <Svg size={14} sw={2}><polyline points="9 18 15 12 9 6"/></Svg>,
  Search:    () => <Svg size={16} sw={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>,
  Send:      () => <Svg size={16} sw={2}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Svg>,
  X:         () => <Svg size={16} sw={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>,
  Building:  () => <Svg><rect x="3" y="2" width="18" height="20" rx="1"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01"/></Svg>,
  Bot:       () => <Svg size={20}><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 2v6M8 8V6a4 4 0 018 0v2"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/><path d="M9 18h6"/></Svg>,
  GoogleDrive: () => <Svg size={16}><path d="M12 2L2 19h7.5L12 14l2.5 5H22L12 2z"/><path d="M7.5 19L12 11l4.5 8H7.5z"/></Svg>,
  Download:  () => <Svg size={16} sw={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>,
  User:      () => <Svg><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a8 8 0 0116 0v1"/></Svg>,
  Check:     () => <Svg size={14} sw={2.5}><polyline points="20 6 9 17 4 12"/></Svg>,
  Trash:     () => <Svg size={16}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></Svg>,
  Edit:      () => <Svg size={16}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>,
  Save:      () => <Svg size={16}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></Svg>,
  Eye:       () => <Svg size={16}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Svg>,
  Info:      () => <Svg size={16}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8" strokeWidth={2.5}/><line x1="12" y1="12" x2="12" y2="16"/></Svg>,
};

// ─── SHARED UI ATOMS ──────────────────────────────────────────────────────────
const Field = ({ label, children, required, hint }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase" }}>
      {label}{required && <span style={{ color: "#E86C4A", marginLeft: 2 }}>*</span>}
    </label>}
    {children}
    {hint && <div style={{ fontSize: 11, color: "#AAA", marginTop: 3 }}>{hint}</div>}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text", style: sx = {}, readOnly, align = "left" }) => (
  <input type={type} value={value ?? ""} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly}
    style={{ width: "100%", padding: "9px 11px", border: "1.5px solid #E0E0E0", borderRadius: 7, fontSize: 13, fontFamily: ff, color: "#1A1A1A", background: readOnly ? "#F5F5F5" : "#FAFAFA", outline: "none", boxSizing: "border-box", textAlign: align, transition: "border 0.15s", ...sx }}
    onFocus={e => { if (!readOnly) e.target.style.borderColor = "#1A1A1A"; }}
    onBlur={e => e.target.style.borderColor = "#E0E0E0"} />
);

const Textarea = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ width: "100%", padding: "9px 11px", border: "1.5px solid #E0E0E0", borderRadius: 7, fontSize: 13, fontFamily: ff, color: "#1A1A1A", background: "#FAFAFA", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6, transition: "border 0.15s" }}
    onFocus={e => e.target.style.borderColor = "#1A1A1A"}
    onBlur={e => e.target.style.borderColor = "#E0E0E0"} />
);

const Select = ({ value, onChange, options, placeholder, style: sx = {} }) => (
  <div style={{ position: "relative" }}>
    <select value={value ?? ""} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "9px 30px 9px 11px", border: "1.5px solid #E0E0E0", borderRadius: 7, fontSize: 13, fontFamily: ff, color: value ? "#1A1A1A" : "#999", background: "#FAFAFA", outline: "none", appearance: "none", cursor: "pointer", boxSizing: "border-box", ...sx }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <div style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#AAA" }}><Icons.ChevDown /></div>
  </div>
);

const Toggle = ({ value, onChange, options }) => (
  <div style={{ display: "flex", gap: 6 }}>
    {options.map(o => (
      <button key={o} onClick={() => onChange(o)}
        style={{ flex: 1, padding: "9px 0", border: `1.5px solid ${value === o ? "#1A1A1A" : "#E0E0E0"}`, borderRadius: 7, background: value === o ? "#1A1A1A" : "#FAFAFA", color: value === o ? "#fff" : "#666", fontSize: 13, fontWeight: value === o ? 600 : 400, cursor: "pointer", fontFamily: ff, transition: "all 0.18s" }}>
        {o}
      </button>
    ))}
  </div>
);

const SwitchToggle = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)}
    style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: checked ? "#1A1A1A" : "#D1D5DB", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: checked ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
  </button>
);

const Checkbox = ({ checked, onChange, label }) => (
  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 8 }}>
    <div onClick={() => onChange(!checked)}
      style={{ width: 18, height: 18, minWidth: 18, border: `2px solid ${checked ? "#1A1A1A" : "#CCC"}`, borderRadius: 4, background: checked ? "#1A1A1A" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", marginTop: 1 }}>
      {checked && <Icons.Check />}
    </div>
    <span style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>{label}</span>
  </label>
);

const Btn = ({ onClick, children, variant = "primary", size = "md", disabled, icon, style: sx = {} }) => {
  const sizes = { sm: { padding: "6px 12px", fontSize: 12 }, md: { padding: "9px 16px", fontSize: 13 }, lg: { padding: "11px 22px", fontSize: 14 } };
  const variants = {
    primary: { background: "#1A1A1A", color: "#fff", border: "none" },
    accent:  { background: "#E86C4A", color: "#fff", border: "none" },
    outline: { background: "#fff", color: "#1A1A1A", border: "1.5px solid #E0E0E0" },
    ghost:   { background: "transparent", color: "#555", border: "none" },
    danger:  { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" },
    success: { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontFamily: ff, fontWeight: 700, transition: "all 0.15s", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap", ...sizes[size], ...variants[variant], ...sx }}>
      {icon}{children}
    </button>
  );
};

const Tag = ({ children, color = "#1A1A1A" }) => (
  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + "18", color }}>{children}</span>
);

// Expandable section used in modals
const ExpandSection = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: "1px solid #F0F0F0" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontSize: 13, fontWeight: 600, color: "#333" }}>
        {title}
        <span style={{ color: "#AAA", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", display: "flex" }}><Icons.ChevDown /></span>
      </button>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  );
};

// Address sub-form
const AddressForm = ({ address = {}, onChange, label }) => {
  const upd = (k, v) => onChange({ ...address, [k]: v });
  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>{label}</div>}
      <Field label="Street"><Input value={address.street} onChange={v => upd("street", v)} placeholder="123 High Street" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="City"><Input value={address.city} onChange={v => upd("city", v)} placeholder="London" /></Field>
        <Field label="County / State"><Input value={address.county} onChange={v => upd("county", v)} placeholder="Greater London" /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Postcode"><Input value={address.postcode} onChange={v => upd("postcode", v)} placeholder="EC1A 1BB" /></Field>
        <Field label="Country">
          <Select value={address.country} onChange={v => upd("country", v)} options={COUNTRIES} placeholder="Select country…" />
        </Field>
      </div>
    </div>
  );
};

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
  // CIS
  const [cisRegistered, setCisRegistered] = useState("");
  const [cisContractor, setCisContractor] = useState(false);
  const [cisSubcontractor, setCisSubcontractor] = useState(false);
  const [cisRate, setCisRate] = useState("20%");

  const stateOptions = country === "United Kingdom" ? UK_COUNTIES : country === "United States" ? US_STATES : [];
  const showCIS = industry === "Construction";

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7F5", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: ff }}>
      <div style={{ width: "100%", maxWidth: 640, background: "#fff", borderRadius: 16, boxShadow: "0 4px 40px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ background: "#1A1A1A", padding: "30px 40px 26px", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, background: "#E86C4A", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.Building /></div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em" }}>AI INVOICE</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Organization Setup</h1>
          <p style={{ fontSize: 14, color: "#AAA", margin: 0, lineHeight: 1.6 }}>Welcome aboard, <span style={{ color: "#E86C4A", fontWeight: 600 }}>Alex</span>! Enter your details to get started.</p>
        </div>

        <div style={{ padding: "28px 40px 36px", overflowY: "auto", maxHeight: "72vh" }}>
          <Field label="Type of Business" required><Toggle value={businessType} onChange={setBusinessType} options={["Sole Trader / Freelancer", "Limited Company"]} /></Field>
          <Field label="Organization Name" required><Input value={orgName} onChange={setOrgName} placeholder="e.g. Bright Studio Ltd" /></Field>
          <Field label="Industry" required>
            <Select value={industry} onChange={setIndustry} options={INDUSTRIES} placeholder="Select an industry…" />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Country" required>
              <Select value={country} onChange={v => { setCountry(v); setState(""); }} options={COUNTRIES} placeholder="Select country…" />
            </Field>
            <Field label="State / County">
              {stateOptions.length > 0
                ? <Select value={state} onChange={setState} options={stateOptions} placeholder="Select…" />
                : <Input value={state} onChange={setState} placeholder="Enter state / province…" />}
            </Field>
          </div>

          <Field label="">
            <button onClick={() => setShowAddress(!showAddress)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1.5px dashed #CCC", borderRadius: 7, padding: "9px 14px", cursor: "pointer", color: "#555", fontSize: 13, fontFamily: ff, width: "100%", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#1A1A1A"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#CCC"}>
              <span style={{ color: "#888" }}>{showAddress ? <Icons.ChevDown /> : <Icons.ChevRight />}</span>
              <span style={{ fontWeight: 500 }}>Add Organization Address</span>
            </button>
          </Field>
          {showAddress && (
            <div style={{ background: "#F9F9F9", borderRadius: 10, padding: "16px 16px 2px", marginBottom: 16, border: "1px solid #EBEBEB" }}>
              <Field label="Street"><Input value={street} onChange={setStreet} placeholder="123 High Street" /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="City"><Input value={city} onChange={setCity} placeholder="London" /></Field>
                <Field label="ZIP / Postcode"><Input value={zip} onChange={setZip} placeholder="EC1A 1BB" /></Field>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Currency" required><Select value={currency} onChange={setCurrency} options={CURRENCIES_LIST} placeholder="Select currency…" /></Field>
            <Field label="Time Zone"><Select value={timezone} onChange={setTimezone} options={TIMEZONES} /></Field>
          </div>

          {/* VAT */}
          <Field label="Is this business VAT registered?" required>
            <Toggle value={vatRegistered} onChange={setVatRegistered} options={["Yes", "No"]} />
          </Field>
          {vatRegistered === "Yes" && (
            <div style={{ background: "#F9F9F9", borderRadius: 10, padding: "16px 16px 8px", marginBottom: 16, border: "1px solid #EBEBEB" }}>
              <Field label="VAT Registration Number" required><Input value={vatNumber} onChange={setVatNumber} placeholder="GB123456789" /></Field>
              <Checkbox checked={importExport} onChange={setImportExport} label="I import/export goods and services from other countries" />
              <Checkbox checked={flatRate} onChange={setFlatRate} label="I've joined the VAT Flat Rate scheme" />
              {flatRate && <Field label="Flat Rate VAT %"><Input value={flatRatePct} onChange={setFlatRatePct} placeholder="e.g. 12.5" type="number" /></Field>}
            </div>
          )}

          {/* CIS — shown when industry = Construction */}
          {showCIS && (
            <>
              <Field label="Construction Industry Scheme (CIS) registered?" required>
                <Toggle value={cisRegistered} onChange={setCisRegistered} options={["Yes", "No"]} />
              </Field>
              {cisRegistered === "Yes" && (
                <div style={{ background: "#F9F9F9", borderRadius: 10, padding: "16px 16px 8px", marginBottom: 16, border: "1px solid #EBEBEB" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>CIS Role</div>
                  <Checkbox checked={cisContractor} onChange={setCisContractor} label="I am a Contractor (I engage subcontractors)" />
                  <Checkbox checked={cisSubcontractor} onChange={setCisSubcontractor} label="I am a Subcontractor (I work for contractors)" />
                  {cisSubcontractor && (
                    <Field label="CIS Deduction Rate">
                      <Select value={cisRate} onChange={setCisRate} options={CIS_RATES} />
                    </Field>
                  )}
                  <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#EFF6FF", borderRadius: 8, border: "1px solid #BFDBFE", marginTop: 4 }}>
                    <div style={{ color: "#2563EB", marginTop: 1, flexShrink: 0 }}><Icons.Info /></div>
                    <p style={{ margin: 0, fontSize: 12, color: "#1E40AF", lineHeight: 1.6 }}>
                      CIS deduction will be shown on invoices and automatically deducted from the total amount due. The deduction rate shown is what the contractor retains.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <button onClick={onComplete}
            style={{ width: "100%", padding: "13px 0", background: "#1A1A1A", color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "background 0.2s", marginTop: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = "#E86C4A"}
            onMouseLeave={e => e.currentTarget.style.background = "#1A1A1A"}>
            Complete Setup →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOMER MODAL (New + Edit) ──────────────────────────────────────────────
function CustomerModal({ existing, onClose, onSave }) {
  const isEdit = !!existing;
  const [custType, setCustType] = useState(existing?.type || "Business");
  const [salutation, setSalutation] = useState(existing?.salutation || "");
  const [firstName, setFirstName] = useState(existing?.firstName || "");
  const [lastName, setLastName] = useState(existing?.lastName || "");
  const [companyName, setCompanyName] = useState(existing?.companyName || "");
  const [displayName, setDisplayName] = useState(existing?.name || "");
  const [currency, setCurrency] = useState(existing?.currency ? `${existing.currency} - ${CURRENCIES_LIST.find(c=>c.startsWith(existing.currency))?.split(" - ")[1] || ""}` : "GBP - British Pound Sterling");
  const [email, setEmail] = useState(existing?.email || "");
  const [workPhone, setWorkPhone] = useState(existing?.phone || "");
  const [mobilePhone, setMobilePhone] = useState(existing?.mobile || "");
  const [website, setWebsite] = useState(existing?.website || "");
  const [taxNumber, setTaxNumber] = useState(existing?.taxNumber || "");
  const [paymentTerms, setPaymentTerms] = useState(existing?.paymentTerms || "Net 30");
  const [remarks, setRemarks] = useState(existing?.remarks || "");

  // Addresses
  const emptyAddr = { street: "", city: "", county: "", postcode: "", country: "United Kingdom" };
  const [billingAddress, setBillingAddress] = useState(existing?.billingAddress || emptyAddr);
  const [shippingAddress, setShippingAddress] = useState(existing?.shippingAddress || null);
  const [sameAsBilling, setSameAsBilling] = useState(!existing?.shippingAddress);

  // Contact persons
  const [contactPersons, setContactPersons] = useState(existing?.contactPersons || []);
  const addContact = () => setContactPersons(prev => [...prev, { id: crypto.randomUUID(), salutation: "", firstName: "", lastName: "", email: "", phone: "", jobTitle: "", department: "", isPrimary: false }]);
  const updateContact = (id, field, val) => setContactPersons(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  const removeContact = (id) => setContactPersons(prev => prev.filter(c => c.id !== id));

  // Custom fields
  const [customFields, setCustomFields] = useState(existing?.customFields || []);
  const addCustomField = () => setCustomFields(prev => [...prev, { id: crypto.randomUUID(), key: "", value: "" }]);
  const updateCustomField = (id, field, val) => setCustomFields(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  const removeCustomField = (id) => setCustomFields(prev => prev.filter(f => f.id !== id));

  const handleSave = () => {
    const customer = {
      id: existing?.id || crypto.randomUUID(),
      type: custType, salutation, firstName, lastName,
      companyName, name: displayName || `${firstName} ${lastName}`.trim() || companyName,
      currency: currency.split(" - ")[0],
      email, phone: workPhone, mobile: mobilePhone, website, taxNumber, paymentTerms,
      billingAddress,
      shippingAddress: sameAsBilling ? null : shippingAddress,
      contactPersons, customFields, remarks,
    };
    onSave(customer);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", fontFamily: ff }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 26px 16px", borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1A1A1A" }}>{isEdit ? `Edit — ${existing.name}` : "New Customer"}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#AAA" }}>{isEdit ? "Update customer details" : "Fill in the details to create a new customer"}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#AAA", padding: 4 }}><Icons.X /></button>
        </div>

        <div style={{ overflowY: "auto", padding: "20px 26px", flex: 1 }}>
          <Field label="Customer Type" required><Toggle value={custType} onChange={setCustType} options={["Business", "Individual"]} /></Field>

          {/* Primary contact */}
          <div style={{ background: "#F9F9F9", borderRadius: 10, padding: "14px 14px 4px", marginBottom: 16, border: "1px solid #EBEBEB" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Primary Contact</div>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr", gap: 10 }}>
              <Field label="Salutation"><Select value={salutation} onChange={setSalutation} options={SALUTATIONS} placeholder="—" /></Field>
              <Field label="First Name" required><Input value={firstName} onChange={v => { setFirstName(v); if (!displayName) setDisplayName(v + " " + lastName); }} placeholder="Jane" /></Field>
              <Field label="Last Name" required><Input value={lastName} onChange={v => { setLastName(v); if (!displayName) setDisplayName(firstName + " " + v); }} placeholder="Smith" /></Field>
            </div>
          </div>

          {custType === "Business" && <Field label="Company Name"><Input value={companyName} onChange={setCompanyName} placeholder="e.g. Acme Corporation Ltd" /></Field>}
          <Field label="Display Name (shown on invoices)" required><Input value={displayName} onChange={setDisplayName} placeholder="Name shown on invoices" /></Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Currency"><Select value={currency} onChange={setCurrency} options={CURRENCIES_LIST} /></Field>
            <Field label="Payment Terms"><Select value={paymentTerms} onChange={setPaymentTerms} options={PAYMENT_TERMS} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Email Address" required><Input value={email} onChange={setEmail} placeholder="jane@example.com" type="email" /></Field>
            <Field label="Work Phone"><Input value={workPhone} onChange={setWorkPhone} placeholder="+44 20 7946 0000" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Mobile Phone"><Input value={mobilePhone} onChange={setMobilePhone} placeholder="+44 7700 900000" /></Field>
            <Field label="Website"><Input value={website} onChange={setWebsite} placeholder="https://example.com" /></Field>
          </div>

          {/* Other Details */}
          <ExpandSection title="Other Details">
            <div style={{ paddingTop: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Tax / VAT Number"><Input value={taxNumber} onChange={setTaxNumber} placeholder="GB123456789" /></Field>
              </div>
            </div>
          </ExpandSection>

          {/* Address */}
          <ExpandSection title="Address">
            <div style={{ paddingTop: 8 }}>
              <AddressForm address={billingAddress} onChange={setBillingAddress} label="Billing Address" />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 14px", padding: "10px 12px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #EBEBEB" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Shipping address same as billing</span>
                <SwitchToggle checked={sameAsBilling} onChange={v => { setSameAsBilling(v); if (!v && !shippingAddress) setShippingAddress({ ...emptyAddr }); }} />
              </div>
              {!sameAsBilling && <AddressForm address={shippingAddress || emptyAddr} onChange={setShippingAddress} label="Shipping Address" />}
            </div>
          </ExpandSection>

          {/* Contact Persons */}
          <ExpandSection title={`Contact Persons${contactPersons.length > 0 ? ` (${contactPersons.length})` : ""}`}>
            <div style={{ paddingTop: 8 }}>
              {contactPersons.map((cp, idx) => (
                <div key={cp.id} style={{ background: "#F9F9F9", borderRadius: 10, padding: "14px 14px 6px", marginBottom: 12, border: "1px solid #EBEBEB", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact {idx + 1}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555", cursor: "pointer" }}>
                        <SwitchToggle checked={cp.isPrimary} onChange={v => updateContact(cp.id, "isPrimary", v)} />
                        Primary
                      </label>
                      <button onClick={() => removeContact(cp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CCC", display: "flex", alignItems: "center" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#DC2626"}
                        onMouseLeave={e => e.currentTarget.style.color = "#CCC"}>
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 10 }}>
                    <Field label="Salutation"><Select value={cp.salutation} onChange={v => updateContact(cp.id, "salutation", v)} options={SALUTATIONS} placeholder="—" /></Field>
                    <Field label="First Name"><Input value={cp.firstName} onChange={v => updateContact(cp.id, "firstName", v)} placeholder="First" /></Field>
                    <Field label="Last Name"><Input value={cp.lastName} onChange={v => updateContact(cp.id, "lastName", v)} placeholder="Last" /></Field>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Email"><Input value={cp.email} onChange={v => updateContact(cp.id, "email", v)} placeholder="email@example.com" type="email" /></Field>
                    <Field label="Phone"><Input value={cp.phone} onChange={v => updateContact(cp.id, "phone", v)} placeholder="+44 7700 …" /></Field>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Job Title / Role"><Input value={cp.jobTitle} onChange={v => updateContact(cp.id, "jobTitle", v)} placeholder="e.g. Finance Manager" /></Field>
                    <Field label="Department"><Input value={cp.department} onChange={v => updateContact(cp.id, "department", v)} placeholder="e.g. Accounts" /></Field>
                  </div>
                </div>
              ))}
              <Btn onClick={addContact} variant="outline" size="sm" icon={<Icons.Plus />}>Add Contact Person</Btn>
            </div>
          </ExpandSection>

          {/* Custom Fields */}
          <ExpandSection title={`Custom Fields${customFields.length > 0 ? ` (${customFields.length})` : ""}`}>
            <div style={{ paddingTop: 8 }}>
              {customFields.map((f) => (
                <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 32px", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                  <Field label="Field Name"><Input value={f.key} onChange={v => updateCustomField(f.id, "key", v)} placeholder="e.g. PO Number" /></Field>
                  <Field label="Value"><Input value={f.value} onChange={v => updateCustomField(f.id, "value", v)} placeholder="Value" /></Field>
                  <button onClick={() => removeCustomField(f.id)} style={{ height: 38, border: "none", background: "none", cursor: "pointer", color: "#CCC", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#DC2626"}
                    onMouseLeave={e => e.currentTarget.style.color = "#CCC"}>
                    <Icons.Trash />
                  </button>
                </div>
              ))}
              <Btn onClick={addCustomField} variant="outline" size="sm" icon={<Icons.Plus />}>Add Custom Field</Btn>
            </div>
          </ExpandSection>

          {/* Remarks */}
          <ExpandSection title="Remarks">
            <div style={{ paddingTop: 8 }}>
              <Textarea value={remarks} onChange={setRemarks} placeholder="Internal notes about this customer…" rows={3} />
            </div>
          </ExpandSection>
        </div>

        <div style={{ padding: "14px 26px 18px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary">{isEdit ? "Save Changes" : "Save Customer"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── ITEM MODAL (New + Edit) ──────────────────────────────────────────────────
function ItemModal({ existing, onClose, onSave }) {
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [rate, setRate] = useState(existing?.rate ?? "");
  const [unit, setUnit] = useState(existing?.unit || "hrs");
  const [taxRate, setTaxRate] = useState(existing?.taxRate ?? 20);
  const [active, setActive] = useState(existing?.active ?? true);
  const [sku, setSku] = useState(existing?.sku || "");
  const [account, setAccount] = useState(existing?.account || "");

  const handleSave = () => {
    onSave({ id: existing?.id || crypto.randomUUID(), name, description, rate: Number(rate), unit, taxRate: Number(taxRate), active, sku, account });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", fontFamily: ff, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 26px 16px", borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1A1A1A" }}>{isEdit ? `Edit — ${existing.name}` : "New Item"}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#AAA" }}>Products and services you sell</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#AAA", padding: 4 }}><Icons.X /></button>
        </div>

        <div style={{ padding: "20px 26px" }}>
          <Field label="Item Name" required><Input value={name} onChange={setName} placeholder="e.g. Web Design Package" /></Field>
          <Field label="Description"><Textarea value={description} onChange={setDescription} placeholder="Brief description of this product or service…" rows={2} /></Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Rate / Price" required>
              <Input value={rate} onChange={setRate} placeholder="0.00" type="number" align="right" />
            </Field>
            <Field label="Unit">
              <Select value={unit} onChange={setUnit} options={ITEM_UNITS} />
            </Field>
            <Field label="VAT Rate">
              <Select value={String(taxRate)} onChange={v => setTaxRate(Number(v))} options={TAX_RATES.map(r => ({ value: String(r), label: `${r}%` }))} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="SKU / Code"><Input value={sku} onChange={setSku} placeholder="e.g. WD-001" /></Field>
            <Field label="Account / Category"><Input value={account} onChange={setAccount} placeholder="e.g. Sales" /></Field>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #EBEBEB", marginTop: 4 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>Active</div>
              <div style={{ fontSize: 11, color: "#AAA", marginTop: 1 }}>Available for selection when creating invoices and quotes</div>
            </div>
            <SwitchToggle checked={active} onChange={setActive} />
          </div>
        </div>

        <div style={{ padding: "14px 26px 18px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!name || !rate}>{isEdit ? "Save Changes" : "Save Item"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home",      label: "Home",             Icon: Icons.Home },
  { id: "customers", label: "Customers",         Icon: Icons.Customers },
  { id: "items",     label: "Items",             Icon: Icons.Items },
  { id: "quotes",    label: "Quotes",            Icon: Icons.Quotes },
  { id: "invoices",  label: "Invoices",          Icon: Icons.Invoices },
  { id: "payments",  label: "Payments Received", Icon: Icons.Payments },
  { id: "settings",  label: "Settings",          Icon: Icons.Settings },
];

function Sidebar({ active, setActive }) {
  return (
    <div style={{ width: 220, minHeight: "100vh", background: "#1A1A1A", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100, fontFamily: ff }}>
      <div style={{ padding: "22px 18px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, background: "#E86C4A", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.Invoices /></div>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 800, letterSpacing: "0.06em" }}>AI INVOICE</span>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => setActive(id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 8, border: "none", background: isActive ? "rgba(232,108,74,0.15)" : "none", color: isActive ? "#E86C4A" : "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 400, fontFamily: ff, marginBottom: 2, textAlign: "left", transition: "all 0.15s" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "none"; }}>
              <Icon />{label}
              {isActive && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#E86C4A" }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "12px 16px 18px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
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
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi Alex 👋 I'm your AI Invoice assistant. Ask me anything — from finding invoices to generating financial summaries." }]);
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
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: "You are an AI assistant for an invoice management platform called AI Invoice. Help users with invoice creation, customer management, VAT queries, payment tracking, and financial reporting. Be concise and professional.", messages: [{ role: "user", content: userMsg }] })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.content?.map(i => i.text || "").join("") || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "I'm having trouble connecting right now. Please try again shortly." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "30px 34px", maxWidth: 1100, fontFamily: ff }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1A1A1A", margin: "0 0 4px", letterSpacing: "-0.02em" }}>Good morning, Alex 👋</h1>
        <p style={{ color: "#888", fontSize: 14, margin: 0 }}>Sunday, 8 March 2026 · Here's your financial overview</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {MOCK_STATS.map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", border: "1px solid #EBEBEB" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#AAA", marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* AI Assistant */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #EBEBEB", overflow: "hidden", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
          <div style={{ width: 30, height: 30, background: "#1A1A1A", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icons.Bot /></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>AI Assistant</div>
            <div style={{ fontSize: 11, color: "#AAA" }}>Powered by Claude · Ask about invoices, customers, VAT, and more</div>
          </div>
          <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#16A34A" }} />
        </div>
        <div style={{ height: 220, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "assistant" && <div style={{ width: 24, height: 24, background: "#1A1A1A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginRight: 8, marginTop: 2, flexShrink: 0 }}><Icons.Bot /></div>}
              <div style={{ maxWidth: "72%", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "#1A1A1A" : "#F4F4F4", color: m.role === "user" ? "#fff" : "#1A1A1A", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          ))}
          {loading && <div style={{ display: "flex", gap: 5, padding: "10px 14px", background: "#F4F4F4", borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#CCC", animation: `pulse 1.2s ${i * 0.2}s infinite` }} />)}
          </div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 8 }}>
          <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Ask anything… 'Show overdue invoices' or 'How much VAT do I owe?'"
            style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #E8E8E8", borderRadius: 9, fontSize: 13, fontFamily: ff, outline: "none", color: "#1A1A1A", background: "#FAFAFA" }} />
          <button onClick={sendMessage} disabled={loading}
            style={{ width: 38, height: 38, background: loading ? "#CCC" : "#1A1A1A", border: "none", borderRadius: 9, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
            <Icons.Send />
          </button>
        </div>
      </div>

      {/* Recent Invoices */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #EBEBEB", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #F0F0F0" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A" }}>Recent Invoices</span>
          <button style={{ fontSize: 12, color: "#E86C4A", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: ff }}>View all →</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#FAFAFA" }}>
            {["Invoice #", "Customer", "Date", "Due", "Amount", "Status"].map(h => (
              <th key={h} style={{ padding: "9px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F0F0F0" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {MOCK_INVOICES_HOME.map(inv => (
              <tr key={inv.id} style={{ borderBottom: "1px solid #F7F7F7", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{inv.id}</td>
                <td style={{ padding: "12px 20px", fontSize: 13, color: "#444" }}>{inv.customer}</td>
                <td style={{ padding: "12px 20px", fontSize: 13, color: "#888" }}>{inv.date}</td>
                <td style={{ padding: "12px 20px", fontSize: 13, color: "#888" }}>{inv.due}</td>
                <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{inv.amount}</td>
                <td style={{ padding: "12px 20px" }}><Tag color={statusColors[inv.status]}>{inv.status}</Tag></td>
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
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [modalState, setModalState] = useState(null); // null | { mode: "new" | "edit", customer?: obj }
  const [search, setSearch] = useState("");
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (c) => {
    setCustomers(prev => {
      const idx = prev.findIndex(x => x.id === c.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = c; return u; }
      return [...prev, c];
    });
  };

  return (
    <div style={{ padding: "30px 34px", maxWidth: 1100, fontFamily: ff }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Customers</h1>
          <p style={{ color: "#AAA", fontSize: 13, margin: 0 }}>{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
        </div>
        <Btn onClick={() => setModalState({ mode: "new" })} variant="primary" icon={<Icons.Plus />}>New Customer</Btn>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #EBEBEB", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: 10 }}>
          <Icons.Search />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#1A1A1A", background: "transparent", fontFamily: ff }} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#FAFAFA" }}>
            {["Name", "Type", "Email", "Phone", "Currency", ""].map(h => (
              <th key={h} style={{ padding: "9px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F0F0F0" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid #F7F7F7" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ padding: "13px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "#555" }}>{c.name[0]}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 20px" }}><Tag color={c.type === "Business" ? "#4F46E5" : "#EA580C"}>{c.type}</Tag></td>
                <td style={{ padding: "13px 20px", fontSize: 13, color: "#555" }}>{c.email}</td>
                <td style={{ padding: "13px 20px", fontSize: 13, color: "#888" }}>{c.phone}</td>
                <td style={{ padding: "13px 20px", fontSize: 13, color: "#888" }}>{c.currency}</td>
                <td style={{ padding: "13px 20px" }}>
                  <Btn onClick={() => setModalState({ mode: "edit", customer: c })} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: "40px 20px", textAlign: "center", color: "#CCC", fontSize: 14 }}>No customers found</td></tr>}
          </tbody>
        </table>
      </div>

      {modalState && (
        <CustomerModal
          existing={modalState.mode === "edit" ? modalState.customer : null}
          onClose={() => setModalState(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ─── ITEMS PAGE ───────────────────────────────────────────────────────────────
function ItemsPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [modalState, setModalState] = useState(null);
  const [search, setSearch] = useState("");
  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (item) => {
    setItems(prev => {
      const idx = prev.findIndex(x => x.id === item.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = item; return u; }
      return [...prev, item];
    });
  };

  const toggleActive = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i));

  return (
    <div style={{ padding: "30px 34px", maxWidth: 1100, fontFamily: ff }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Items</h1>
          <p style={{ color: "#AAA", fontSize: 13, margin: 0 }}>Products and services you sell</p>
        </div>
        <Btn onClick={() => setModalState({ mode: "new" })} variant="primary" icon={<Icons.Plus />}>New Item</Btn>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #EBEBEB", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: 10 }}>
          <Icons.Search />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#1A1A1A", background: "transparent", fontFamily: ff }} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#FAFAFA" }}>
            {["Name", "Description", "Rate", "Unit", "VAT", "Status", ""].map(h => (
              <th key={h} style={{ padding: "9px 20px", textAlign: h === "Rate" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F0F0F0" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} style={{ borderBottom: "1px solid #F7F7F7" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ padding: "13px 20px", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{item.name}</td>
                <td style={{ padding: "13px 20px", fontSize: 13, color: "#888", maxWidth: 200 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                </td>
                <td style={{ padding: "13px 20px", fontSize: 13, fontWeight: 700, color: "#1A1A1A", textAlign: "right" }}>
                  {fmt("£", item.rate)}</td>
                <td style={{ padding: "13px 20px", fontSize: 13, color: "#888" }}>{item.unit}</td>
                <td style={{ padding: "13px 20px", fontSize: 13, color: "#888" }}>{item.taxRate}%</td>
                <td style={{ padding: "13px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SwitchToggle checked={item.active} onChange={() => toggleActive(item.id)} />
                    <span style={{ fontSize: 12, color: item.active ? "#16A34A" : "#9CA3AF" }}>{item.active ? "Active" : "Inactive"}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 20px" }}>
                  <Btn onClick={() => setModalState({ mode: "edit", item })} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <Icons.Items />
                  <p style={{ fontSize: 14, color: "#BBB", margin: 0 }}>No items yet. Click "New Item" to get started.</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalState && (
        <ItemModal
          existing={modalState.mode === "edit" ? modalState.item : null}
          onClose={() => setModalState(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ─── INVOICE LINE ITEMS + TOTALS + PREVIEW ────────────────────────────────────
function LineItemsTable({ items, onChange, currSymbol }) {
  const update = (id, field, val) => onChange(items.map(item => {
    if (item.id !== id) return item;
    const u = { ...item, [field]: val };
    u.amount = Number(u.quantity) * Number(u.rate);
    return u;
  }));
  const addRow = () => onChange([...items, newLine(items.length)]);
  const remove = (id) => items.length > 1 && onChange(items.filter(i => i.id !== id));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 88px 82px 78px 32px", gap: 6, paddingBottom: 8, borderBottom: "1.5px solid #EBEBEB", marginBottom: 8 }}>
        {[["Description","left"],["Qty","center"],[`Rate (${currSymbol})`,"right"],["VAT %","center"],["Amount","right"],["",""]].map(([h,a]) => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: a }}>{h}</div>
        ))}
      </div>
      {items.map((item, idx) => (
        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 72px 88px 82px 78px 32px", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <Input value={item.description} onChange={v => update(item.id, "description", v)} placeholder={`Item ${idx + 1}…`} />
          <Input value={item.quantity} onChange={v => update(item.id, "quantity", v)} type="number" align="center" />
          <Input value={item.rate} onChange={v => update(item.id, "rate", v)} type="number" align="right" />
          <select value={item.tax_rate} onChange={e => update(item.id, "tax_rate", Number(e.target.value))}
            style={{ padding: "8px 4px", border: "1.5px solid #E0E0E0", borderRadius: 7, fontSize: 13, fontFamily: ff, background: "#FAFAFA", outline: "none", appearance: "none", textAlign: "center", cursor: "pointer", width: "100%" }}>
            {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
          </select>
          <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{fmt(currSymbol, item.amount)}</div>
          <button onClick={() => remove(item.id)} disabled={items.length === 1}
            style={{ width: 28, height: 28, border: "none", background: "none", cursor: items.length === 1 ? "not-allowed" : "pointer", color: "#CCC", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => { if (items.length > 1) e.currentTarget.style.color = "#DC2626"; }}
            onMouseLeave={e => e.currentTarget.style.color = "#CCC"}>
            <Icons.Trash />
          </button>
        </div>
      ))}
      <Btn onClick={addRow} variant="ghost" size="sm" icon={<Icons.Plus />} style={{ marginTop: 4, color: "#E86C4A" }}>Add Line Item</Btn>
    </div>
  );
}

function TotalsBlock({ subtotal, discountType, discountValue, setDiscountType, setDiscountValue, shipping, setShipping, taxBreakdown, total, currSymbol }) {
  const discAmt = discountType === "percent" ? subtotal * (Number(discountValue) / 100) : Math.min(Number(discountValue), subtotal);
  const Row = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 13, color: color || "#666" }}>{label}</span>
      <span style={{ fontSize: 13, color: color || "#444", fontWeight: 500 }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background: "#FAFAFA", borderRadius: 10, border: "1px solid #EBEBEB", padding: "14px 16px", minWidth: 270 }}>
      <Row label="Subtotal" value={fmt(currSymbol, subtotal)} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
        <span style={{ fontSize: 13, color: "#666" }}>Discount</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <div style={{ display: "flex", border: "1.5px solid #E0E0E0", borderRadius: 6, overflow: "hidden" }}>
            {[["percent", "%"], ["fixed", currSymbol]].map(([t, l]) => (
              <button key={t} onClick={() => setDiscountType(t)}
                style={{ padding: "3px 9px", border: "none", background: discountType === t ? "#1A1A1A" : "transparent", color: discountType === t ? "#fff" : "#999", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                {l}
              </button>
            ))}
          </div>
          <input value={discountValue} onChange={e => setDiscountValue(e.target.value)} type="number" min="0"
            style={{ width: 66, padding: "4px 7px", border: "1.5px solid #E0E0E0", borderRadius: 6, fontSize: 13, textAlign: "right", fontFamily: ff, background: "#fff", outline: "none" }} />
        </div>
      </div>
      {discAmt > 0 && <Row label="" value={`− ${fmt(currSymbol, discAmt)}`} color="#E86C4A" />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
        <span style={{ fontSize: 13, color: "#666" }}>Shipping</span>
        <input value={shipping} onChange={e => setShipping(e.target.value)} type="number" min="0" placeholder="0.00"
          style={{ width: 88, padding: "4px 7px", border: "1.5px solid #E0E0E0", borderRadius: 6, fontSize: 13, textAlign: "right", fontFamily: ff, background: "#fff", outline: "none" }} />
      </div>
      {taxBreakdown.map(tb => <Row key={tb.rate} label={`VAT ${tb.rate}%`} value={fmt(currSymbol, tb.amount)} />)}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 2px", borderTop: "2px solid #1A1A1A", marginTop: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#1A1A1A" }}>Total</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#1A1A1A" }}>{fmt(currSymbol, total)}</span>
      </div>
    </div>
  );
}

function InvoicePreview({ data, currSymbol }) {
  const { invoiceNumber, customer, issueDate, dueDate, items, subtotal, discountAmount, shipping, taxBreakdown, total, notes, terms, currency, status } = data;
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", fontFamily: ff }}>
      <div style={{ background: "#1A1A1A", padding: "20px 24px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>AI Invoice</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>INVOICE</div>
            <div style={{ fontSize: 12, color: "#E86C4A", fontWeight: 700, marginTop: 1 }}>{invoiceNumber || "INV-0001"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Tag color={statusColors[status] || "#6B7280"}>{status || "Draft"}</Tag>
            <div style={{ marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Due: <span style={{ color: "#fff" }}>{fmtDate(dueDate)}</span></div>
          </div>
        </div>
      </div>
      <div style={{ padding: "18px 24px" }}>
        <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid #F0F0F0" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>Bill To</div>
          {customer ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{customer.name}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2, lineHeight: 1.7 }}>{customer.email}</div>
            </>
          ) : <div style={{ fontSize: 12, color: "#CCC", fontStyle: "italic" }}>Select a customer…</div>}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
          <thead><tr style={{ borderBottom: "1.5px solid #EBEBEB" }}>
            {["Description","Qty","Rate","VAT","Amount"].map((h,i) => (
              <th key={h} style={{ padding: "5px 0 7px", textAlign: i > 0 ? "right" : "left", fontSize: 9, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.filter(i => i.description || i.amount > 0).map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #F7F7F7" }}>
                <td style={{ padding: "7px 0", fontSize: 11, color: "#1A1A1A" }}>{item.description || <span style={{ color: "#CCC" }}>Item {idx + 1}</span>}</td>
                <td style={{ padding: "7px 0", fontSize: 11, color: "#666", textAlign: "right" }}>{item.quantity}</td>
                <td style={{ padding: "7px 0", fontSize: 11, color: "#666", textAlign: "right" }}>{fmt(currSymbol, item.rate)}</td>
                <td style={{ padding: "7px 0", fontSize: 11, color: "#666", textAlign: "right" }}>{item.tax_rate}%</td>
                <td style={{ padding: "7px 0", fontSize: 11, fontWeight: 700, color: "#1A1A1A", textAlign: "right" }}>{fmt(currSymbol, item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ minWidth: 200 }}>
            {[["Subtotal", fmt(currSymbol, subtotal)],
              ...(discountAmount > 0 ? [["Discount", `− ${fmt(currSymbol, discountAmount)}`, "#E86C4A"]] : []),
              ...(Number(shipping) > 0 ? [["Shipping", fmt(currSymbol, shipping)]] : []),
              ...taxBreakdown.map(tb => [`VAT ${tb.rate}%`, fmt(currSymbol, tb.amount)]),
            ].map(([l,v,c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 24, padding: "3px 0" }}>
                <span style={{ fontSize: 11, color: "#888" }}>{l}</span>
                <span style={{ fontSize: 11, color: c || "#555" }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 24, padding: "8px 0 2px", borderTop: "2px solid #1A1A1A", marginTop: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1A1A1A" }}>Total Due</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#1A1A1A" }}>{fmt(currSymbol, total)}</span>
            </div>
          </div>
        </div>
        {(notes || terms) && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #F0F0F0" }}>
            {notes && <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 3 }}>Notes</div>
              <p style={{ fontSize: 11, color: "#666", margin: 0, lineHeight: 1.6 }}>{notes}</p>
            </div>}
            {terms && <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 3 }}>Terms</div>
              <p style={{ fontSize: 11, color: "#666", margin: 0, lineHeight: 1.6 }}>{terms}</p>
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── INVOICES PAGE ────────────────────────────────────────────────────────────
function InvoicesPage() {
  const MOCK_CUSTOMERS_INV = [
    { id: "c1", name: "Acme Corporation", email: "billing@acme.com", address: "123 High Street, London, EC1A 1BB", currency: "GBP" },
    { id: "c2", name: "Blue Sky Ltd", email: "accounts@bluesky.co.uk", address: "45 Oxford Road, Manchester, M1 2JA", currency: "GBP" },
    { id: "c3", name: "Green Media Group", email: "finance@greenmedia.io", address: "78 Silicon Way, Bristol, BS1 3NT", currency: "GBP" },
    { id: "c4", name: "Nova Tech Solutions", email: "ap@novatech.com", address: "200 Canary Wharf, London, E14 5AB", currency: "GBP" },
  ];
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
      if (idx >= 0) { const u = [...prev]; u[idx] = inv; return u; }
      return [inv, ...prev];
    });
    setView("list"); setEditing(null);
  };

  if (view === "list") {
    const FILTERS = ["All", "Draft", "Sent", "Paid", "Overdue"];
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
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
      <div style={{ padding: "28px 32px", maxWidth: 1200, fontFamily: ff }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 4px", letterSpacing: "-0.02em" }}>Invoices</h1>
          <p style={{ color: "#AAA", fontSize: 13, margin: 0 }}>Create, manage and track your invoices</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
          {[{ l: "Outstanding", v: totals.outstanding, c: "#2563EB" }, { l: "Overdue", v: totals.overdue, c: "#DC2626" }, { l: "Paid (all time)", v: totals.paid, c: "#16A34A" }].map(s => (
            <div key={s.l} style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #EBEBEB" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{s.l}</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: s.c }}>£{s.v.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#AAA" }}><Icons.Search /></div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices…"
              style={{ width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, outline: "none", background: "#fff", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 3, background: "#F0F0F0", padding: 3, borderRadius: 8 }}>
            {FILTERS.map(f => <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 11px", borderRadius: 6, border: "none", background: filter === f ? "#1A1A1A" : "transparent", color: filter === f ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>{f}</button>)}
          </div>
          <Btn onClick={() => { setEditing(null); setView("new"); }} variant="accent" icon={<Icons.Plus />}>New Invoice</Btn>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#FAFAFA", borderBottom: "1px solid #F0F0F0" }}>
              {["Invoice #","Customer","Issue Date","Due Date","Amount","Status",""].map(h => (
                <th key={h} style={{ padding: "9px 16px", textAlign: h === "Amount" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} style={{ borderBottom: "1px solid #F7F7F7" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{inv.invoice_number}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#444" }}>{inv.customer_name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#888" }}>{fmtDate(inv.issue_date)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: new Date(inv.due_date) < new Date() && inv.status !== "Paid" ? "#DC2626" : "#888" }}>{fmtDate(inv.due_date)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#1A1A1A", textAlign: "right" }}>{fmt("£", inv.total)}</td>
                  <td style={{ padding: "12px 16px" }}><Tag color={statusColors[inv.status]}>{inv.status}</Tag></td>
                  <td style={{ padding: "12px 16px" }}><Btn onClick={() => { setEditing(inv); setView("edit"); }} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: "44px 16px", textAlign: "center", color: "#CCC", fontSize: 13 }}>{invoices.length === 0 ? "No invoices yet." : "No invoices match."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Invoice Form
  const isEdit = view === "edit";
  const [invoiceNumber, setInvoiceNumber] = useState(editing?.invoice_number || nextNum("INV", invoices.map(i => i.invoice_number)));
  const [customer, setCustomer] = useState(editing ? MOCK_CUSTOMERS_INV.find(c => c.id === editing.customer_id) || null : null);
  const [issueDate, setIssueDate] = useState(editing?.issue_date || todayStr());
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [dueDate, setDueDate] = useState(editing?.due_date || addDaysStr(todayStr(), 30));
  const [currency, setCurrency] = useState(editing?.currency || "GBP");
  const [status, setStatus] = useState(editing?.status || "Draft");
  const [items, setItems] = useState(editing?.line_items?.length ? editing.line_items : [newLine(0)]);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [notes, setNotes] = useState(editing?.notes || "");
  const [terms, setTerms] = useState(editing?.terms || DEFAULT_INVOICE_TERMS);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState("Monthly");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState("form");

  useEffect(() => {
    const map = { "Due on Receipt": 0, "Net 7": 7, "Net 14": 14, "Net 30": 30, "Net 60": 60, "Net 90": 90 };
    if (paymentTerms in map) setDueDate(addDaysStr(issueDate, map[paymentTerms]));
  }, [paymentTerms, issueDate]);

  const currSymbol = INVOICE_CURRENCIES[currency] || "£";
  const subtotal = items.reduce((s, i) => s + Number(i.amount), 0);
  const discountAmount = discountType === "percent" ? subtotal * (Number(discountValue) / 100) : Math.min(Number(discountValue), subtotal);
  const taxBreakdown = TAX_RATES.filter(r => r > 0).map(rate => ({ rate, amount: items.filter(i => Number(i.tax_rate) === rate).reduce((s, i) => s + i.amount * (rate / 100), 0) })).filter(tb => tb.amount > 0);
  const taxTotal = taxBreakdown.reduce((s, tb) => s + tb.amount, 0);
  const total = (subtotal - discountAmount) + Number(shipping) + taxTotal;
  const previewData = { invoiceNumber, customer, issueDate, dueDate, currency, status, items, subtotal, discountAmount, shipping, taxBreakdown, total, notes, terms };

  const handleSaveInv = async (newStatus = status) => {
    setSaving(true);
    const payload = { invoice_number: invoiceNumber, customer_id: customer?.id || null, customer_name: customer?.name || "", issue_date: issueDate, due_date: dueDate, status: newStatus, currency, subtotal, discount_type: discountType, discount_value: Number(discountValue), discount_amount: discountAmount, shipping: Number(shipping), tax_total: taxTotal, total, notes, terms, is_recurring: isRecurring, recurring_frequency: isRecurring ? recurringFreq : null };
    try {
      let saved;
      if (isEdit && editing.id) {
        await supabase("PATCH", `invoices?id=eq.${editing.id}`, payload);
        saved = { ...editing, ...payload };
      } else {
        const [inv] = await supabase("POST", "invoices", payload);
        saved = inv;
      }
      setSaveMsg("Saved!"); setStatus(newStatus);
      handleSave({ ...payload, id: saved?.id || editing?.id || crypto.randomUUID(), line_items: items, status: newStatus });
    } catch {
      setSaveMsg("Saved locally!");
      handleSave({ ...payload, id: editing?.id || crypto.randomUUID(), line_items: items, status: newStatus });
    }
    setSaving(false); setTimeout(() => setSaveMsg(""), 3000);
  };

  const SectionCard = ({ title, subtitle, children }) => (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: "20px 22px", marginBottom: 14 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1A1A" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: "#AAA", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, fontFamily: ff }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A", margin: "0 0 3px" }}>{isEdit ? `Edit ${invoiceNumber}` : "New Invoice"}</h1>
          <p style={{ color: "#AAA", fontSize: 13, margin: 0 }}>Fill in the details below</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveMsg && <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Icons.Check />{saveMsg}</span>}
          <Btn onClick={() => { setView("list"); setEditing(null); }} variant="outline">Cancel</Btn>
          <Btn onClick={() => handleSaveInv("Draft")} variant="outline" disabled={saving} icon={<Icons.Save />}>Save Draft</Btn>
          <Btn onClick={() => handleSaveInv("Sent")} variant="accent" disabled={saving} icon={<Icons.Send />}>{saving ? "Saving…" : "Save & Send"}</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 3, background: "#F0F0F0", padding: 3, borderRadius: 9, marginBottom: 16, width: "fit-content" }}>
        {[["form", "Edit"], ["preview", "Preview"]].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "none", background: activeTab === t ? "#1A1A1A" : "transparent", color: activeTab === t ? "#fff" : "#888", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
            {t === "form" ? <Icons.Edit /> : <Icons.Eye />}{l}
          </button>
        ))}
      </div>

      {activeTab === "form" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16, alignItems: "start" }}>
          <div>
            <SectionCard title="Invoice Details">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="Invoice Number" required><Input value={invoiceNumber} onChange={setInvoiceNumber} /></Field>
                <Field label="Issue Date" required><Input value={issueDate} onChange={setIssueDate} type="date" /></Field>
                <Field label="Status"><Select value={status} onChange={setStatus} options={["Draft","Sent","Paid","Void"]} /></Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                <Field label="Payment Terms"><Select value={paymentTerms} onChange={setPaymentTerms} options={PAYMENT_TERMS} /></Field>
                <Field label="Due Date" required><Input value={dueDate} onChange={setDueDate} type="date" /></Field>
                <Field label="Currency"><Select value={currency} onChange={setCurrency} options={Object.keys(INVOICE_CURRENCIES).map(k => ({ value: k, label: `${k} (${INVOICE_CURRENCIES[k]})` }))} /></Field>
              </div>
            </SectionCard>
            <SectionCard title="Bill To">
              <Select value={customer?.id || ""} onChange={id => setCustomer(MOCK_CUSTOMERS_INV.find(c => c.id === id) || null)} options={MOCK_CUSTOMERS_INV.map(c => ({ value: c.id, label: c.name }))} placeholder="Select a customer…" />
              {customer && <div style={{ marginTop: 10, padding: "10px 12px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #EBEBEB" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{customer.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{customer.email} · {customer.address}</div>
              </div>}
            </SectionCard>
            <SectionCard title="Line Items">
              <LineItemsTable items={items} onChange={setItems} currSymbol={currSymbol} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                <TotalsBlock subtotal={subtotal} discountType={discountType} discountValue={discountValue} setDiscountType={setDiscountType} setDiscountValue={setDiscountValue} shipping={shipping} setShipping={setShipping} taxBreakdown={taxBreakdown} total={total} currSymbol={currSymbol} />
              </div>
            </SectionCard>
            <SectionCard title="Notes & Terms">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><Field label="Customer Notes"><Textarea value={notes} onChange={setNotes} placeholder="Thank you for your business!" rows={3} /></Field></div>
                <div><Field label="Terms & Conditions"><Textarea value={terms} onChange={setTerms} rows={3} /></Field></div>
              </div>
            </SectionCard>
            <SectionCard title="Recurring Invoice">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, color: "#555" }}>Enable recurring schedule</div>
                <SwitchToggle checked={isRecurring} onChange={setIsRecurring} />
              </div>
              {isRecurring && (
                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Frequency"><Select value={recurringFreq} onChange={setRecurringFreq} options={RECURRING_OPTS} /></Field>
                  <Field label="Next Date"><Input value={dueDate} readOnly /></Field>
                  <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, padding: "9px 12px", background: "#FFFBEB", borderRadius: 8, border: "1px solid #FDE68A" }}>
                    <Icons.Info />
                    <p style={{ margin: 0, fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>A reminder will be created. You review and send it manually.</p>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
          <div style={{ position: "sticky", top: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Live Preview</div>
            <InvoicePreview data={previewData} currSymbol={currSymbol} />
          </div>
        </div>
      )}
      {activeTab === "preview" && (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
            <Btn variant="outline" size="sm" icon={<Icons.Download />}>Download PDF</Btn>
            <Btn variant="primary" size="sm" icon={<Icons.Send />} onClick={() => handleSaveInv("Sent")}>Send Invoice</Btn>
          </div>
          <InvoicePreview data={previewData} currSymbol={currSymbol} />
        </div>
      )}
    </div>
  );
}

// ─── QUOTES PAGE (INTEGRATED) ─────────────────────────────────────────────────
function QuotesPage() {
  const MOCK_CUSTOMERS_Q = [
    { id: "c1", name: "Acme Corporation", email: "billing@acme.com", address: "123 High Street, London, EC1A 1BB", currency: "GBP" },
    { id: "c2", name: "Blue Sky Ltd", email: "accounts@bluesky.co.uk", address: "45 Oxford Road, Manchester, M1 2JA", currency: "GBP" },
    { id: "c3", name: "Green Media Group", email: "finance@greenmedia.io", address: "78 Silicon Way, Bristol, BS1 3NT", currency: "GBP" },
    { id: "c4", name: "Nova Tech Solutions", email: "ap@novatech.com", address: "200 Canary Wharf, London, E14 5AB", currency: "GBP" },
  ];
  const DEFAULT_QUOTE_TERMS = "This quote is valid until the expiry date shown. Prices exclude VAT unless stated. Work commences upon written acceptance.";
  const QUOTE_STATUSES = ["Draft","Sent","Accepted","Declined","Expired"];

  const [quotes, setQuotes] = useState([
    { id: "q1", quote_number: "QUO-0001", customer_id: "c1", customer_name: "Acme Corporation", issue_date: "2026-02-15", expiry_date: "2026-03-15", status: "Accepted", currency: "GBP", total: 4800, line_items: [], notes: "", terms: DEFAULT_QUOTE_TERMS },
    { id: "q2", quote_number: "QUO-0002", customer_id: "c2", customer_name: "Blue Sky Ltd", issue_date: "2026-03-01", expiry_date: "2026-04-01", status: "Sent", currency: "GBP", total: 2200, line_items: [], notes: "", terms: DEFAULT_QUOTE_TERMS },
    { id: "q3", quote_number: "QUO-0003", customer_id: "c3", customer_name: "Green Media Group", issue_date: "2026-01-10", expiry_date: "2026-02-10", status: "Expired", currency: "GBP", total: 950, line_items: [], notes: "", terms: DEFAULT_QUOTE_TERMS },
  ]);
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);

  const handleSave = (q) => {
    setQuotes(prev => {
      const idx = prev.findIndex(x => x.id === q.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = q; return u; }
      return [q, ...prev];
    });
    setView("list"); setEditing(null);
  };

  const handleClone = (q) => {
    setQuotes(prev => [{
      ...q, id: crypto.randomUUID(),
      quote_number: nextNum("QUO", [...prev.map(x => x.quote_number), q.quote_number]),
      status: "Draft", issue_date: todayStr(), expiry_date: addDaysStr(todayStr(), 30), converted_invoice_id: null,
    }, ...prev]);
  };

  if (view === "list") {
    const FILTERS = ["All", ...QUOTE_STATUSES];
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const filtered = quotes.filter(q =>
      (q.quote_number?.toLowerCase().includes(search.toLowerCase()) || q.customer_name?.toLowerCase().includes(search.toLowerCase())) &&
      (filter === "All" || q.status === filter)
    );
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1200, fontFamily: ff }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 4px", letterSpacing: "-0.02em" }}>Quotes</h1>
          <p style={{ color: "#AAA", fontSize: 13, margin: 0 }}>Create, manage and send quotes to your customers</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
          {[{ l: "Accepted Value", v: quotes.filter(q=>q.status==="Accepted").reduce((a,b)=>a+(b.total||0),0), c: "#16A34A" }, { l: "Awaiting Response", v: quotes.filter(q=>q.status==="Sent").reduce((a,b)=>a+(b.total||0),0), c: "#2563EB" }, { l: "Total Quotes", v: quotes.length, c: "#6B7280", isCount: true }].map(s => (
            <div key={s.l} style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #EBEBEB" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{s.l}</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: s.c }}>{s.isCount ? s.v : `£${s.v.toLocaleString("en-GB",{minimumFractionDigits:2})}`}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#AAA" }}><Icons.Search /></div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotes…"
              style={{ width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, outline: "none", background: "#fff", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 3, background: "#F0F0F0", padding: 3, borderRadius: 8 }}>
            {FILTERS.map(f => <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 11px", borderRadius: 6, border: "none", background: filter === f ? "#1A1A1A" : "transparent", color: filter === f ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>{f}</button>)}
          </div>
          <Btn onClick={() => { setEditing(null); setView("new"); }} variant="accent" icon={<Icons.Plus />}>New Quote</Btn>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#FAFAFA", borderBottom: "1px solid #F0F0F0" }}>
              {["Quote #","Customer","Issue Date","Expiry Date","Amount","Status",""].map(h => (
                <th key={h} style={{ padding: "9px 16px", textAlign: h==="Amount"?"right":"left", fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(q => {
                const expired = q.expiry_date && new Date(q.expiry_date) < new Date() && q.status !== "Accepted";
                return (
                  <tr key={q.id} style={{ borderBottom: "1px solid #F7F7F7" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{q.quote_number}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#444" }}>{q.customer_name}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#888" }}>{fmtDate(q.issue_date)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: expired ? "#DC2626" : "#888" }}>{fmtDate(q.expiry_date)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#1A1A1A", textAlign: "right" }}>{fmt("£", q.total||0)}</td>
                    <td style={{ padding: "12px 16px" }}><Tag color={statusColors[q.status]}>{q.status}</Tag></td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn onClick={() => { setEditing(q); setView("edit"); }} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
                        <Btn onClick={() => handleClone(q)} variant="ghost" size="sm">Clone</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: "44px 16px", textAlign: "center", color: "#CCC", fontSize: 13 }}>{quotes.length === 0 ? "No quotes yet. Click 'New Quote' to get started." : "No quotes match."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Quote Form
  const isEdit = view === "edit";
  const [quoteNumber, setQuoteNumber] = useState(editing?.quote_number || nextNum("QUO", quotes.map(q => q.quote_number)));
  const [customer, setCustomer] = useState(editing ? MOCK_CUSTOMERS_Q.find(c => c.id === editing.customer_id) || null : null);
  const [issueDate, setIssueDate] = useState(editing?.issue_date || todayStr());
  const [expiryDate, setExpiryDate] = useState(editing?.expiry_date || addDaysStr(todayStr(), 30));
  const [status, setStatus] = useState(editing?.status || "Draft");
  const [currency, setCurrency] = useState(editing?.currency || "GBP");
  const [items, setItems] = useState(editing?.line_items?.length ? editing.line_items : [newLine(0)]);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [notes, setNotes] = useState(editing?.notes || "");
  const [terms, setTerms] = useState(editing?.terms || DEFAULT_QUOTE_TERMS);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState("form");

  const currSymbol = INVOICE_CURRENCIES[currency] || "£";
  const subtotal = items.reduce((s, i) => s + Number(i.amount), 0);
  const discountAmount = discountType === "percent" ? subtotal * (Number(discountValue) / 100) : Math.min(Number(discountValue), subtotal);
  const taxBreakdown = TAX_RATES.filter(r => r > 0).map(rate => ({ rate, amount: items.filter(i => Number(i.tax_rate) === rate).reduce((s, i) => s + i.amount * (rate / 100), 0) })).filter(tb => tb.amount > 0);
  const taxTotal = taxBreakdown.reduce((s, tb) => s + tb.amount, 0);
  const total = (subtotal - discountAmount) + Number(shipping) + taxTotal;

  const handleSaveQ = async (newStatus = status) => {
    setSaving(true);
    const payload = { quote_number: quoteNumber, customer_id: customer?.id || null, customer_name: customer?.name || "", customer_email: customer?.email || "", issue_date: issueDate, expiry_date: expiryDate, status: newStatus, currency, subtotal, discount_type: discountType, discount_value: Number(discountValue), discount_amount: discountAmount, shipping: Number(shipping), tax_total: taxTotal, total, notes, terms };
    try {
      let saved;
      if (isEdit && editing.id) { await supabase("PATCH", `quotes?id=eq.${editing.id}`, payload); saved = { ...editing, ...payload }; }
      else { const [q] = await supabase("POST", "quotes", payload); saved = q; }
      setSaveMsg("Saved!"); setStatus(newStatus);
      handleSave({ ...payload, id: saved?.id || editing?.id || crypto.randomUUID(), line_items: items, status: newStatus });
    } catch {
      setSaveMsg("Saved locally!");
      handleSave({ ...payload, id: editing?.id || crypto.randomUUID(), line_items: items, status: newStatus });
    }
    setSaving(false); setTimeout(() => setSaveMsg(""), 3000);
  };

  const SectionCard = ({ title, subtitle, children }) => (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: "20px 22px", marginBottom: 14 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1A1A" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: "#AAA", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );

  const previewData = { invoiceNumber: quoteNumber, customer, issueDate, dueDate: expiryDate, currency, status, items, subtotal, discountAmount, shipping, taxBreakdown, total, notes, terms };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, fontFamily: ff }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A", margin: "0 0 3px" }}>{isEdit ? `Edit ${quoteNumber}` : "New Quote"}</h1>
          <p style={{ color: "#AAA", fontSize: 13, margin: 0 }}>Fill in the details below</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveMsg && <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Icons.Check />{saveMsg}</span>}
          <Btn onClick={() => { setView("list"); setEditing(null); }} variant="outline">Cancel</Btn>
          <Btn onClick={() => handleSaveQ("Draft")} variant="outline" disabled={saving} icon={<Icons.Save />}>Save Draft</Btn>
          <Btn onClick={() => handleSaveQ("Sent")} variant="accent" disabled={saving} icon={<Icons.Send />}>{saving ? "Saving…" : "Save & Send"}</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 3, background: "#F0F0F0", padding: 3, borderRadius: 9, marginBottom: 16, width: "fit-content" }}>
        {[["form","Edit"],["preview","Preview"]].map(([t,l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "none", background: activeTab===t?"#1A1A1A":"transparent", color: activeTab===t?"#fff":"#888", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
            {t==="form"?<Icons.Edit />:<Icons.Eye />}{l}
          </button>
        ))}
      </div>

      {activeTab === "form" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16, alignItems: "start" }}>
          <div>
            <SectionCard title="Quote Details">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="Quote Number" required><Input value={quoteNumber} onChange={setQuoteNumber} /></Field>
                <Field label="Issue Date" required><Input value={issueDate} onChange={setIssueDate} type="date" /></Field>
                <Field label="Expiry Date" required><Input value={expiryDate} onChange={setExpiryDate} type="date" /></Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <Field label="Status"><Select value={status} onChange={setStatus} options={QUOTE_STATUSES} /></Field>
                <Field label="Currency"><Select value={currency} onChange={setCurrency} options={Object.keys(INVOICE_CURRENCIES).map(k => ({ value: k, label: `${k} (${INVOICE_CURRENCIES[k]})` }))} /></Field>
              </div>
            </SectionCard>
            <SectionCard title="Quote For">
              <Select value={customer?.id || ""} onChange={id => setCustomer(MOCK_CUSTOMERS_Q.find(c => c.id === id) || null)} options={MOCK_CUSTOMERS_Q.map(c => ({ value: c.id, label: c.name }))} placeholder="Select a customer…" />
              {customer && <div style={{ marginTop: 10, padding: "10px 12px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #EBEBEB" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{customer.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{customer.email} · {customer.address}</div>
              </div>}
            </SectionCard>
            <SectionCard title="Line Items">
              <LineItemsTable items={items} onChange={setItems} currSymbol={currSymbol} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                <TotalsBlock subtotal={subtotal} discountType={discountType} discountValue={discountValue} setDiscountType={setDiscountType} setDiscountValue={setDiscountValue} shipping={shipping} setShipping={setShipping} taxBreakdown={taxBreakdown} total={total} currSymbol={currSymbol} />
              </div>
            </SectionCard>
            <SectionCard title="Notes & Terms">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><Field label="Customer Notes"><Textarea value={notes} onChange={setNotes} placeholder="Visible to the customer…" rows={3} /></Field></div>
                <div><Field label="Terms & Conditions"><Textarea value={terms} onChange={setTerms} rows={3} /></Field></div>
              </div>
            </SectionCard>
          </div>
          <div style={{ position: "sticky", top: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Live Preview</div>
            <InvoicePreview data={previewData} currSymbol={currSymbol} />
          </div>
        </div>
      )}
      {activeTab === "preview" && (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
            <Btn variant="outline" size="sm" icon={<Icons.Download />}>Download PDF</Btn>
            <Btn variant="primary" size="sm" icon={<Icons.Send />} onClick={() => handleSaveQ("Sent")}>Send Quote</Btn>
          </div>
          <InvoicePreview data={previewData} currSymbol={currSymbol} />
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage({ onOrgSetup }) {
  return (
    <div style={{ padding: "30px 34px", maxWidth: 700, fontFamily: ff }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", marginBottom: 22, letterSpacing: "-0.02em" }}>Settings</h1>
      {[
        { label: "Organization Setup", desc: "Edit organization details, VAT, CIS and preferences", action: "Edit", onClick: onOrgSetup },
        { label: "Google Drive Integration", desc: "Connect Google Drive to export and store invoices as PDFs", action: "Connect", icon: <Icons.GoogleDrive /> },
        { label: "PDF Export Settings", desc: "Customize invoice PDF layout, logo and footer", action: "Configure", icon: <Icons.Download /> },
        { label: "Users & Permissions", desc: "Manage team members and their access levels", action: "Manage", icon: <Icons.User /> },
      ].map(item => (
        <div key={item.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", padding: "16px 20px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "#F4F4F4", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>{item.icon || <Icons.Settings />}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{item.label}</div>
              <div style={{ fontSize: 12, color: "#AAA", marginTop: 2 }}>{item.desc}</div>
            </div>
          </div>
          <Btn onClick={item.onClick} variant="outline" size="sm">{item.action}</Btn>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("setup");
  const [activePage, setActivePage] = useState("home");

  if (screen === "setup") return <OrgSetupPage onComplete={() => setScreen("app")} />;

  const renderPage = () => {
    switch (activePage) {
      case "home":      return <HomePage />;
      case "customers": return <CustomersPage />;
      case "items":     return <ItemsPage />;
      case "quotes":    return <QuotesPage />;
      case "invoices":  return <InvoicesPage />;
      case "payments":  return (
        <div style={{ padding: "30px 34px", fontFamily: ff }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: "0 0 4px" }}>Payments Received</h1>
          <p style={{ color: "#AAA", fontSize: 13, margin: "0 0 24px" }}>Record and track incoming payments</p>
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px dashed #E8E8E8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, color: "#CCC", gap: 12 }}>
            <Icons.Payments />
            <p style={{ fontSize: 14, color: "#BBB", margin: 0 }}>No payments recorded yet.</p>
          </div>
        </div>
      );
      case "settings":  return <SettingsPage onOrgSetup={() => setScreen("setup")} />;
      default:          return <HomePage />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F7F7F5" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Instrument+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; } body { margin: 0; }
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#DDD;border-radius:10px}
      `}</style>
      <Sidebar active={activePage} setActive={setActivePage} />
      <main style={{ marginLeft: 220, flex: 1, overflowY: "auto" }}>{renderPage()}</main>
    </div>
  );
}
