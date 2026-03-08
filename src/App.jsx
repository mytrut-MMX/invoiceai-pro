import { useState, useRef, useEffect, useContext, createContext } from "react";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
async function sbFetch(method, path, body) {
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

// ─── APP CONTEXT ─────────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const upsert = (arr, item) => { const i = arr.findIndex(x=>x.id===item.id); if(i>=0){const u=[...arr];u[i]=item;return u;} return [...arr,item]; };

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const ff = "'Instrument Sans','DM Sans','Helvetica Neue',sans-serif";
const TAX_RATES = [0, 5, 12.5, 20];
const CUR_SYM = { GBP:"£", USD:"$", EUR:"€", AUD:"A$", CAD:"C$", CHF:"Fr", JPY:"¥", INR:"₹" };
const PAYMENT_TERMS_OPTS = ["Due on Receipt","Net 7","Net 14","Net 30","Net 60","Net 90","Custom"];
const RECURRING_OPTS = ["Weekly","Monthly","Quarterly","Yearly"];
const DEFAULT_INV_TERMS = "Payment is due within the agreed payment terms. Late payments may incur interest charges.";
const DEFAULT_QUOTE_TERMS = "This quote is valid until the expiry date shown. Prices exclude VAT unless stated. Work commences upon written acceptance.";
const INDUSTRIES = ["Agency","Agriculture","Art and Design","Automotive","Construction","Consulting","Consumer Packaged Goods","Education","Engineering","Entertainment","Financial Services","Food Services","Gardening","Gaming","Government","Health Care","Interior Design","Legal","Logistics","Manufacturing","Marketing","Non Profit","Publishing","Real Estate","Retail","Services","Technology","Telecommunications","Travel/Hospitality","Web Design","Others"];
const COUNTRIES = ["United Kingdom","Australia","Austria","Belgium","Brazil","Canada","China","Denmark","Finland","France","Germany","Ghana","Greece","Hungary","India","Indonesia","Ireland","Israel","Italy","Japan","Kenya","Malaysia","Mexico","Netherlands","New Zealand","Nigeria","Norway","Pakistan","Philippines","Poland","Portugal","Romania","Russia","Saudi Arabia","Singapore","South Africa","South Korea","Spain","Sweden","Switzerland","Taiwan","Thailand","Turkey","UAE","United States","Vietnam","Zimbabwe"];
const CURRENCIES_LIST = ["GBP - British Pound Sterling","USD - US Dollar","EUR - Euro","AUD - Australian Dollar","CAD - Canadian Dollar","CHF - Swiss Franc","CNY - Chinese Yuan","JPY - Japanese Yen","INR - Indian Rupee","SGD - Singapore Dollar","HKD - Hong Kong Dollar","SEK - Swedish Krona","NZD - New Zealand Dollar","ZAR - South African Rand","AED - UAE Dirham","BRL - Brazilian Real"];
const TIMEZONES = ["(UTC+00:00) London","(UTC+00:00) Dublin","(UTC+01:00) Amsterdam","(UTC+01:00) Berlin","(UTC+01:00) Paris","(UTC+01:00) Rome","(UTC+02:00) Athens","(UTC+02:00) Cairo","(UTC+03:00) Moscow","(UTC+04:00) Dubai","(UTC+05:30) New Delhi","(UTC+08:00) Singapore","(UTC+09:00) Tokyo","(UTC+10:00) Sydney","(UTC-05:00) New York","(UTC-06:00) Chicago","(UTC-08:00) Los Angeles"];
const UK_COUNTIES = ["Avon","Bedfordshire","Berkshire","Bristol","Buckinghamshire","Cambridgeshire","Cheshire","Cornwall","Cumbria","Derbyshire","Devon","Dorset","Durham","East Sussex","Essex","Gloucestershire","Greater London","Greater Manchester","Hampshire","Hertfordshire","Kent","Lancashire","Leicestershire","Lincolnshire","Merseyside","Norfolk","North Yorkshire","Northamptonshire","Nottinghamshire","Oxfordshire","Somerset","Staffordshire","Suffolk","Surrey","Tyne and Wear","Warwickshire","West Midlands","West Sussex","West Yorkshire","Wiltshire","Worcestershire"];
const SALUTATIONS = ["Mr.","Mrs.","Ms.","Miss","Dr.","Prof."];
const ITEM_UNITS = ["hrs","days","qty","kg","m","m²","m³","l","pcs","flat rate"];
const ITEM_TYPES = ["Service","Material","Labour","Equipment","Other"];
const CIS_RATES = ["20%","30%","0% (gross payment)"];
const ACCOUNT_CATEGORIES = [
  "Sales","Services","Consulting","Design & Creative","Development & IT",
  "Marketing","Labour","Materials","Equipment Hire","Subcontractors",
  "Expenses","Travel & Subsistence","Office Supplies","Software & Subscriptions",
  "Professional Fees","Advertising","Utilities","Rent & Rates","Other Income","Other",
];
const STATUS_COLORS = { Sent:"#2563EB", Overdue:"#C0392B", Paid:"#16A34A", Draft:"#6B7280", Void:"#9CA3AF", Accepted:"#16A34A", Declined:"#DC2626", Expired:"#9CA3AF" };
const QUOTE_STATUSES = ["Draft","Sent","Accepted","Declined","Expired"];
const PDF_TEMPLATES = [
  { id:"classic",  name:"Classic",  desc:"Clean header, ruled lines",          defaultAccent:"#1A1A1A", defaultBg:"#fff" },
  { id:"modern",   name:"Modern",   desc:"Bold colour band, split layout",      defaultAccent:"#2563EB", defaultBg:"#EFF6FF" },
  { id:"minimal",  name:"Minimal",  desc:"Sage green, clean typography",        defaultAccent:"#16A34A", defaultBg:"#fff" },
  { id:"branded",  name:"Branded",  desc:"Rich terracotta, premium feel",       defaultAccent:"#E86C4A", defaultBg:"#FFF7F4" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (sym, val) => `${sym}${Number(val||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const todayStr = () => new Date().toISOString().split("T")[0];
const addDays = (d, n) => { const dt=new Date(d); dt.setDate(dt.getDate()+n); return dt.toISOString().split("T")[0]; };
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const newLine = (order=0) => ({ id:crypto.randomUUID(), description:"", quantity:1, rate:0, tax_rate:20, amount:0, sort_order:order });
const nextNum = (prefix, existing) => {
  const nums = (existing||[]).map(n=>parseInt((n||"").replace(/\D/g,""),10)).filter(Boolean);
  return `${prefix}-${String(nums.length?Math.max(...nums)+1:1).padStart(4,"0")}`;
};
function validateVatNumber(num) {
  if(!num) return false;
  const clean = num.replace(/\s/g,"").toUpperCase();
  if(/^GB\d{9}$/.test(clean)) return true;
  if(/^[A-Z]{2}[A-Z0-9]{2,12}$/.test(clean)) return true;
  return false;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_CUSTOMERS = [
  { id:"c1", type:"Business", name:"Acme Corporation", companyName:"Acme Corporation", firstName:"James", lastName:"Acme", email:"billing@acme.com", phone:"+44 20 7946 0001", currency:"GBP", paymentTerms:"Net 30", billingAddress:{ street:"123 High Street", city:"London", county:"Greater London", postcode:"EC1A 1BB", country:"United Kingdom" }, shippingAddress:null, contactPersons:[], customFields:[], remarks:"", taxDetails:{ vatNumber:"", cisRegistered:false, cisRole:"", cisRate:"20%" } },
  { id:"c2", type:"Business", name:"Blue Sky Ltd", companyName:"Blue Sky Ltd", firstName:"Sara", lastName:"Blue", email:"accounts@bluesky.co.uk", phone:"+44 161 496 0002", currency:"GBP", paymentTerms:"Net 30", billingAddress:{ street:"45 Oxford Road", city:"Manchester", county:"Greater Manchester", postcode:"M1 2JA", country:"United Kingdom" }, shippingAddress:null, contactPersons:[], customFields:[], remarks:"", taxDetails:{ vatNumber:"", cisRegistered:false, cisRole:"", cisRate:"20%" } },
];
const MOCK_ITEMS_INIT = [
  { id:"i1", name:"Web Design", type:"Service", description:"Professional website design", rate:850, unit:"flat rate", taxRate:20, cisApplicable:false, active:true },
  { id:"i2", name:"Consulting", type:"Service", description:"Business consulting", rate:120, unit:"hrs", taxRate:20, cisApplicable:true, active:true },
  { id:"i3", name:"Timber", type:"Material", description:"Construction timber", rate:45, unit:"m³", taxRate:20, cisApplicable:false, active:true },
];
const MOCK_INV_LIST = [
  { id:"inv1", invoice_number:"INV-0001", customer_id:"c1", customer_name:"Acme Corporation", issue_date:"2026-02-01", due_date:"2026-03-03", status:"Overdue", currency:"GBP", total:3200, line_items:[], notes:"", terms:DEFAULT_INV_TERMS },
  { id:"inv2", invoice_number:"INV-0002", customer_id:"c2", customer_name:"Blue Sky Ltd", issue_date:"2026-03-01", due_date:"2026-03-31", status:"Sent", currency:"GBP", total:1120, line_items:[], notes:"", terms:DEFAULT_INV_TERMS },
  { id:"inv3", invoice_number:"INV-0003", customer_id:"c1", customer_name:"Acme Corporation", issue_date:"2026-01-15", due_date:"2026-02-14", status:"Paid", currency:"GBP", total:8400, line_items:[], notes:"", terms:DEFAULT_INV_TERMS },
];
const MOCK_QUOTES_LIST = [
  { id:"q1", quote_number:"QUO-0001", customer_id:"c1", customer_name:"Acme Corporation", issue_date:"2026-02-15", expiry_date:"2026-03-15", status:"Accepted", currency:"GBP", total:4800, line_items:[], notes:"", terms:DEFAULT_QUOTE_TERMS },
  { id:"q2", quote_number:"QUO-0002", customer_id:"c2", customer_name:"Blue Sky Ltd", issue_date:"2026-03-01", expiry_date:"2026-04-01", status:"Sent", currency:"GBP", total:2200, line_items:[], notes:"", terms:DEFAULT_QUOTE_TERMS },
];
const PAYMENT_METHODS = ["Bank Transfer","Card","Cash","Cheque","PayPal","Stripe","Direct Debit","Crypto","Other"];
const MOCK_PAYMENTS = [
  { id:"pay1", payment_number:"PAY-0001", invoice_id:"inv3", invoice_number:"INV-0003", customer_id:"c1", customer_name:"Acme Corporation", amount:8400, currency:"GBP", date:"2026-02-14", method:"Bank Transfer", reference:"BACS-20260214", notes:"Full payment received", status:"Reconciled" },
  { id:"pay2", payment_number:"PAY-0002", invoice_id:"inv2", invoice_number:"INV-0002", customer_id:"c2", customer_name:"Blue Sky Ltd", amount:500, currency:"GBP", date:"2026-03-05", method:"Card", reference:"", notes:"Partial payment", status:"Partial" },
];

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Ic = ({ d, size=18, sw=1.6 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html:d}} />;
const Icons = {
  Home:     () => <Ic d='<path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>'/>,
  Customers:() => <Ic d='<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.85"/>'/>,
  Items:    () => <Ic d='<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'/>,
  Quotes:   () => <Ic d='<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>'/>,
  Invoices: () => <Ic d='<rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>'/>,
  Payments: () => <Ic d='<rect x="1" y="5" width="22" height="14" rx="2"/><path d="M1 10h22"/>'/>,
  Settings: () => <Ic d='<circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'/>,
  Plus:     () => <Ic d='<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' size={16} sw={2}/>,
  ChevDown: () => <Ic d='<polyline points="6 9 12 15 18 9"/>' size={14} sw={2}/>,
  ChevRight:() => <Ic d='<polyline points="9 18 15 12 9 6"/>' size={14} sw={2}/>,
  Search:   () => <Ic d='<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' size={16} sw={2}/>,
  Send:     () => <Ic d='<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' size={16} sw={2}/>,
  X:        () => <Ic d='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' size={16} sw={2}/>,
  Building: () => <Ic d='<rect x="3" y="2" width="18" height="20" rx="1"/><path d="M9 22V12h6v10M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01"/>'/>,
  Bot:      () => <Ic d='<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 2v6M8 8V6a4 4 0 018 0v2"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M9 18h6"/>' size={20}/>,
  Download: () => <Ic d='<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' size={16} sw={2}/>,
  Check:    () => <Ic d='<polyline points="20 6 9 17 4 12"/>' size={14} sw={2.5}/>,
  Trash:    () => <Ic d='<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>' size={15}/>,
  Edit:     () => <Ic d='<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>' size={15}/>,
  Save:     () => <Ic d='<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>' size={15}/>,
  Eye:      () => <Ic d='<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' size={15}/>,
  Info:     () => <Ic d='<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5"/><line x1="12" y1="12" x2="12" y2="16"/>' size={15}/>,
  User:     () => <Ic d='<circle cx="12" cy="8" r="4"/><path d="M4 20v-1a8 8 0 0116 0v1"/>'/>,
  Drive:    () => <Ic d='<path d="M12 2L2 19h7.5L12 14l2.5 5H22L12 2z"/><path d="M7.5 19L12 11l4.5 8H7.5z"/>' size={16}/>,
  Pen:      () => <Ic d='<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>' size={14}/>,
  Alert:    () => <Ic d='<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' size={16}/>,
  Link:     () => <Ic d='<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>' size={15}/>,
  Unlink:   () => <Ic d='<path d="M18.84 12.25l1.72-1.71a4.9 4.9 0 000-6.93 4.9 4.9 0 00-6.93 0l-1.72 1.71"/><path d="M5.17 11.75l-1.72 1.71a4.9 4.9 0 000 6.93 4.9 4.9 0 006.93 0l1.72-1.72M8 16l8-8"/>' size={15}/>,
  Bank:     () => <Ic d='<path d="M3 10l9-7 9 7v11H3V10z"/><path d="M12 3v7"/><path d="M7 21V14h10v7"/>' size={16}/>,
  Filter:   () => <Ic d='<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>' size={15}/>,
  Receipt:  () => <Ic d='<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M8 10h8M8 14h5"/>' size={16}/>,
};

// ─── ATOMS ───────────────────────────────────────────────────────────────────
const Field = ({ label, children, required, hint, error }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:"block", fontSize:11, fontWeight:700, color:error?"#DC2626":"#666", marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase" }}>
      {label}{required && <span style={{ color:"#E86C4A", marginLeft:2 }}>*</span>}
    </label>}
    {children}
    {error && <div style={{ fontSize:11, color:"#DC2626", marginTop:4, display:"flex", alignItems:"center", gap:4 }}><Icons.Alert />{error}</div>}
    {!error && hint && <div style={{ fontSize:11, color:"#AAA", marginTop:3 }}>{hint}</div>}
  </div>
);
const Input = ({ value, onChange, placeholder, type="text", style:sx={}, readOnly, align="left", error }) => (
  <input type={type} value={value??""} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly}
    style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${error?"#FCA5A5":"#E0E0E0"}`, borderRadius:7, fontSize:13, fontFamily:ff, color:"#1A1A1A", background:readOnly?"#F5F5F5":"#FAFAFA", outline:"none", boxSizing:"border-box", textAlign:align, transition:"border 0.15s", ...sx }}
    onFocus={e=>{ if(!readOnly) e.target.style.borderColor=error?"#DC2626":"#1A1A1A"; }}
    onBlur={e=>e.target.style.borderColor=error?"#FCA5A5":"#E0E0E0"} />
);
const Textarea = ({ value, onChange, placeholder, rows=3 }) => (
  <textarea value={value??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ width:"100%", padding:"9px 11px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, color:"#1A1A1A", background:"#FAFAFA", outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.6, transition:"border 0.15s" }}
    onFocus={e=>e.target.style.borderColor="#1A1A1A"} onBlur={e=>e.target.style.borderColor="#E0E0E0"} />
);
const Select = ({ value, onChange, options, placeholder, style:sx={} }) => (
  <div style={{ position:"relative" }}>
    <select value={value??""} onChange={e=>onChange(e.target.value)}
      style={{ width:"100%", padding:"9px 30px 9px 11px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, color:value?"#1A1A1A":"#999", background:"#FAFAFA", outline:"none", appearance:"none", cursor:"pointer", boxSizing:"border-box", ...sx }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <div style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"#AAA" }}><Icons.ChevDown /></div>
  </div>
);
const Toggle = ({ value, onChange, options }) => (
  <div style={{ display:"flex", gap:5 }}>
    {options.map(o=>(
      <button key={o} onClick={()=>onChange(o)}
        style={{ flex:1, padding:"9px 0", border:`1.5px solid ${value===o?"#1A1A1A":"#E0E0E0"}`, borderRadius:7, background:value===o?"#1A1A1A":"#FAFAFA", color:value===o?"#fff":"#666", fontSize:13, fontWeight:value===o?700:400, cursor:"pointer", fontFamily:ff, transition:"all 0.18s" }}>
        {o}
      </button>
    ))}
  </div>
);
const Switch = ({ checked, onChange }) => (
  <button onClick={()=>onChange(!checked)}
    style={{ width:40, height:22, borderRadius:11, border:"none", background:checked?"#1A1A1A":"#D1D5DB", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
    <div style={{ width:16, height:16, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:checked?21:3, transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
  </button>
);
// Slide toggle with Yes/No labels
const SlideToggle = ({ value, onChange }) => (
  <div style={{ display:"flex", alignItems:"center", gap:9 }}>
    <span style={{ fontSize:12, fontWeight:700, color:value?"#AAA":"#DC2626", minWidth:24, textAlign:"right" }}>No</span>
    <button onClick={()=>onChange(!value)}
      style={{ width:48, height:26, borderRadius:13, border:"none", background:value?"#16A34A":"#D1D5DB", cursor:"pointer", position:"relative", transition:"background 0.25s", flexShrink:0 }}>
      <div style={{ width:20, height:20, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:value?25:3, transition:"left 0.25s", boxShadow:"0 1px 4px rgba(0,0,0,0.25)" }} />
    </button>
    <span style={{ fontSize:12, fontWeight:700, color:value?"#16A34A":"#AAA", minWidth:24 }}>Yes</span>
  </div>
);
const Checkbox = ({ checked, onChange, label }) => (
  <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer", marginBottom:8 }}>
    <div onClick={()=>onChange(!checked)}
      style={{ width:18, height:18, minWidth:18, border:`2px solid ${checked?"#1A1A1A":"#CCC"}`, borderRadius:4, background:checked?"#1A1A1A":"#fff", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", marginTop:1 }}>
      {checked && <Icons.Check />}
    </div>
    <span style={{ fontSize:13, color:"#444", lineHeight:1.5 }}>{label}</span>
  </label>
);
const Btn = ({ onClick, children, variant="primary", size="md", disabled, icon, style:sx={} }) => {
  const sizes = { sm:{padding:"6px 11px",fontSize:12}, md:{padding:"9px 16px",fontSize:13}, lg:{padding:"11px 22px",fontSize:14} };
  const variants = { primary:{background:"#1A1A1A",color:"#fff",border:"none"}, accent:{background:"#E86C4A",color:"#fff",border:"none"}, outline:{background:"#fff",color:"#1A1A1A",border:"1.5px solid #E0E0E0"}, ghost:{background:"transparent",color:"#555",border:"none"}, danger:{background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA"} };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", gap:7, borderRadius:8, cursor:disabled?"not-allowed":"pointer", fontFamily:ff, fontWeight:700, transition:"all 0.15s", opacity:disabled?0.5:1, whiteSpace:"nowrap", ...sizes[size], ...variants[variant], ...sx }}>
      {icon}{children}
    </button>
  );
};
const Tag = ({ children, color="#1A1A1A" }) => (
  <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:color+"18", color }}>{children}</span>
);
const SectionCard = ({ title, subtitle, children }) => (
  <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"18px 20px", marginBottom:14 }}>
    {(title||subtitle) && <div style={{ marginBottom:14 }}>
      {title && <div style={{ fontSize:13, fontWeight:800, color:"#1A1A1A" }}>{title}</div>}
      {subtitle && <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{subtitle}</div>}
    </div>}
    {children}
  </div>
);
const InfoBox = ({ children, color="#2563EB" }) => (
  <div style={{ display:"flex", gap:8, padding:"10px 12px", background:color+"10", borderRadius:8, border:`1px solid ${color}30`, marginTop:8 }}>
    <div style={{ color, marginTop:1, flexShrink:0 }}><Icons.Info /></div>
    <p style={{ margin:0, fontSize:12, color, lineHeight:1.6 }}>{children}</p>
  </div>
);
const ExpandSection = ({ title, children, defaultOpen=false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop:"1px solid #F0F0F0" }}>
      <button onClick={()=>setOpen(!open)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 0", background:"none", border:"none", cursor:"pointer", fontFamily:ff, fontSize:13, fontWeight:600, color:"#333" }}>
        {title}
        <span style={{ color:"#AAA", transition:"transform 0.2s", transform:open?"rotate(180deg)":"none", display:"flex" }}><Icons.ChevDown /></span>
      </button>
      {open && <div style={{ paddingBottom:16 }}>{children}</div>}
    </div>
  );
};
const AddressForm = ({ address={}, onChange, label }) => {
  const u = (k,v) => onChange({ ...address, [k]:v });
  return (
    <div>
      {label && <div style={{ fontSize:12, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>{label}</div>}
      <Field label="Street"><Input value={address.street} onChange={v=>u("street",v)} placeholder="123 High Street" /></Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Field label="City"><Input value={address.city} onChange={v=>u("city",v)} placeholder="London" /></Field>
        <Field label="County / State"><Input value={address.county} onChange={v=>u("county",v)} placeholder="Greater London" /></Field>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Field label="Postcode / ZIP"><Input value={address.postcode} onChange={v=>u("postcode",v)} placeholder="EC1A 1BB" /></Field>
        <Field label="Country"><Select value={address.country} onChange={v=>u("country",v)} options={COUNTRIES} placeholder="Select…" /></Field>
      </div>
    </div>
  );
};
const PaymentTermsField = ({ value, onChange, customDays, onCustomDaysChange }) => (
  <div>
    <Select value={value} onChange={onChange} options={PAYMENT_TERMS_OPTS} />
    {value==="Custom" && (
      <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8 }}>
        <Input value={customDays} onChange={onCustomDaysChange} type="number" placeholder="e.g. 45" style={{ maxWidth:90 }} />
        <span style={{ fontSize:12, color:"#666", whiteSpace:"nowrap" }}>days from invoice date</span>
      </div>
    )}
  </div>
);

// ─── AUTH PAGE (Login / Register) ────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Simple in-memory "user store" (persists while app is open)
  const STORAGE_KEY = "ai_invoice_users";
  const getUsers = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); } catch { return []; } };
  const saveUsers = users => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)); } catch {} };

  const handleSubmit = () => {
    setError("");
    if(!email || !password) { setError("Email and password are required."); return; }
    if(!/\S+@\S+\.\S+/.test(email)) { setError("Please enter a valid email address."); return; }
    if(password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    setTimeout(() => {
      const users = getUsers();
      if(mode==="register") {
        if(!name.trim()) { setError("Full name is required."); setLoading(false); return; }
        if(password !== confirmPw) { setError("Passwords do not match."); setLoading(false); return; }
        if(users.find(u=>u.email===email)) { setError("An account with this email already exists."); setLoading(false); return; }
        const newUser = { name: name.trim(), email, password, role:"Admin", createdAt: new Date().toISOString() };
        saveUsers([...users, newUser]);
        onAuth({ name: newUser.name, email: newUser.email, role:"Admin" });
      } else {
        const found = users.find(u=>u.email===email && u.password===password);
        if(!found) { setError("Incorrect email or password."); setLoading(false); return; }
        onAuth({ name: found.name, email: found.email, role: found.role||"Admin" });
      }
      setLoading(false);
    }, 600);
  };

  const eyeIcon = showPw
    ? <Ic d='<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/><circle cx="12" cy="12" r="3"/>' size={16} sw={2}/>
    : <Ic d='<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' size={16} sw={2}/>;

  return (
    <div style={{ minHeight:"100vh", background:"#F7F7F5", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:ff }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Brand header */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:48, height:48, background:"#1A1A1A", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
            <div style={{ width:28, height:28, background:"#E86C4A", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:"#1A1A1A", letterSpacing:"0.02em" }}>AI INVOICE</div>
          <div style={{ fontSize:13, color:"#AAA", marginTop:3 }}>Smart invoicing for modern businesses</div>
        </div>

        <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 4px 40px rgba(0,0,0,0.08)", overflow:"hidden" }}>
          {/* Tab switcher */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:"1px solid #F0F0F0" }}>
            {[["login","Sign In"],["register","Create Account"]].map(([m,l])=>(
              <button key={m} onClick={()=>{ setMode(m); setError(""); }}
                style={{ padding:"16px 0", border:"none", borderBottom:`2.5px solid ${mode===m?"#1A1A1A":"transparent"}`, background:"none", fontSize:13, fontWeight:mode===m?800:500, color:mode===m?"#1A1A1A":"#AAA", cursor:"pointer", fontFamily:ff, transition:"all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ padding:"24px 28px 28px" }}>
            {mode==="register" && (
              <Field label="Full Name" required>
                <Input value={name} onChange={setName} placeholder="e.g. Alex Morgan" />
              </Field>
            )}
            <Field label="Email Address" required>
              <Input value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
            </Field>
            <Field label="Password" required>
              <div style={{ position:"relative" }}>
                <input
                  type={showPw?"text":"password"}
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                  placeholder={mode==="register"?"Min. 8 characters":"Enter your password"}
                  style={{ width:"100%", padding:"9px 38px 9px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }}
                />
                <button onClick={()=>setShowPw(p=>!p)} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#AAA", padding:2, display:"flex" }}>
                  {eyeIcon}
                </button>
              </div>
            </Field>
            {mode==="register" && (
              <Field label="Confirm Password" required>
                <div style={{ position:"relative" }}>
                  <input
                    type={showPw?"text":"password"}
                    value={confirmPw}
                    onChange={e=>setConfirmPw(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                    placeholder="Repeat password"
                    style={{ width:"100%", padding:"9px 10px", border:`1.5px solid ${confirmPw&&confirmPw!==password?"#DC2626":"#E0E0E0"}`, borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }}
                  />
                </div>
              </Field>
            )}

            {error && (
              <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"9px 12px", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ color:"#DC2626", fontSize:12 }}><Icons.Info /></span>
                <span style={{ color:"#DC2626", fontSize:12, fontWeight:500 }}>{error}</span>
              </div>
            )}

            {mode==="register" && (
              <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:8, padding:"9px 12px", marginBottom:12 }}>
                <div style={{ fontSize:11, color:"#16A34A", fontWeight:600, marginBottom:4 }}>Password requirements:</div>
                {[["At least 8 characters", password.length>=8],["Passwords match", password===confirmPw&&confirmPw.length>0]].map(([t,ok])=>(
                  <div key={t} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:ok?"#16A34A":"#AAA" }}>
                    <span>{ok?"✓":"○"}</span>{t}
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{ width:"100%", padding:"12px 0", background:loading?"#CCC":"#1A1A1A", color:"#fff", border:"none", borderRadius:9, fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", fontFamily:ff, marginTop:4, transition:"background 0.18s" }}
              onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background="#E86C4A"; }}
              onMouseLeave={e=>{ if(!loading) e.currentTarget.style.background="#1A1A1A"; }}>
              {loading ? "Please wait…" : mode==="login" ? "Sign In →" : "Create Account →"}
            </button>

            {mode==="login" && (
              <div style={{ textAlign:"center", marginTop:14 }}>
                <span style={{ fontSize:12, color:"#AAA" }}>Don't have an account? </span>
                <button onClick={()=>{ setMode("register"); setError(""); }} style={{ fontSize:12, fontWeight:700, color:"#E86C4A", background:"none", border:"none", cursor:"pointer", fontFamily:ff, padding:0 }}>
                  Create one free
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:18, fontSize:11, color:"#CCC" }}>
          Your data stays private and secure · AI Invoice
        </div>
      </div>
    </div>
  );
}

// ─── ORG SETUP ───────────────────────────────────────────────────────────────
function OrgSetupPage({ onComplete, initialData }) {
  const [bType, setBType] = useState(initialData?.bType||"");
  const [orgName, setOrgName] = useState(initialData?.orgName||"");
  const [crn, setCrn] = useState(initialData?.crn||"");
  const [industry, setIndustry] = useState(initialData?.industry||"");
  const [country, setCountry] = useState(initialData?.country||"United Kingdom");
  const [state, setState] = useState(initialData?.state||"");
  const [showAddr, setShowAddr] = useState(false);
  const [street, setStreet] = useState(initialData?.street||"");
  const [city, setCity] = useState(initialData?.city||"");
  const [postcode, setPostcode] = useState(initialData?.postcode||"");
  const [currency, setCurrency] = useState(initialData?.currency||"GBP - British Pound Sterling");
  const [timezone, setTimezone] = useState(initialData?.timezone||"(UTC+00:00) London");
  const [vatReg, setVatReg] = useState(initialData?.vatReg||false);
  const [vatNum, setVatNum] = useState(initialData?.vatNum||"");
  const [vatNumTouched, setVatNumTouched] = useState(false);
  const [importExport, setImportExport] = useState(initialData?.importExport||false);
  const [flatRate, setFlatRate] = useState(initialData?.flatRate||false);
  const [flatRatePct, setFlatRatePct] = useState(initialData?.flatRatePct||"");
  const [cisReg, setCisReg] = useState(initialData?.cisReg||false);
  const [cisContractor, setCisContractor] = useState(initialData?.cisContractor||false);
  const [cisSub, setCisSub] = useState(initialData?.cisSub||false);
  const [cisRate, setCisRate] = useState(initialData?.cisRate||"20%");
  const [cisUtr, setCisUtr] = useState(initialData?.cisUtr||"");

  const stateOpts = country==="United Kingdom" ? UK_COUNTIES : [];
  const isCIS = industry==="Construction";
  const vatNumError = vatReg && vatNumTouched && !validateVatNumber(vatNum)
    ? "Please enter a valid VAT number (e.g. GB123456789)" : null;
  // Fix: canSubmit never requires vatReg to be truthy — toggling it is optional
  const canSubmit = bType && orgName && industry && country &&
    (!vatReg || (vatReg && validateVatNumber(vatNum)));

  const handleComplete = () => {
    if(!canSubmit){ setVatNumTouched(true); return; }
    onComplete({ bType, orgName, crn, industry, country, state, street, city, postcode, currency, timezone,
      vatReg: vatReg ? "Yes" : "No", vatNum, importExport, flatRate, flatRatePct,
      cisReg: cisReg ? "Yes" : "No", cisContractor, cisSub, cisRate, cisUtr });
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F7F7F5", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:ff }}>
      <div style={{ width:"100%", maxWidth:640, background:"#fff", borderRadius:16, boxShadow:"0 4px 40px rgba(0,0,0,0.08)", overflow:"hidden" }}>
        <div style={{ background:"#1A1A1A", padding:"28px 40px 24px", color:"#fff" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:32, height:32, background:"#E86C4A", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Building /></div>
            <span style={{ fontSize:15, fontWeight:700, letterSpacing:"0.04em" }}>AI INVOICE</span>
          </div>
          <h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 4px" }}>Organization Setup</h1>
          <p style={{ fontSize:13, color:"#AAA", margin:0 }}>Welcome! Enter your details to get started.</p>
        </div>
        <div style={{ padding:"24px 40px 36px", overflowY:"auto", maxHeight:"75vh" }}>
          <Field label="Type of Business" required><Toggle value={bType} onChange={setBType} options={["Sole Trader / Freelancer","Limited Company"]} /></Field>
          <Field label="Organization Name" required><Input value={orgName} onChange={setOrgName} placeholder="e.g. Bright Studio Ltd" /></Field>
          {bType==="Limited Company" && (
            <Field label="Company Registration Number (CRN)" hint="Found on your Companies House certificate">
              <Input value={crn} onChange={setCrn} placeholder="e.g. 12345678" />
            </Field>
          )}
          <Field label="Industry" required><Select value={industry} onChange={setIndustry} options={INDUSTRIES} placeholder="Select an industry…" /></Field>
          {/* Organisation Address — country/county included */}
          <Field label="">
            <button onClick={()=>setShowAddr(!showAddr)}
              style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"1.5px dashed #CCC", borderRadius:7, padding:"9px 14px", cursor:"pointer", color:"#555", fontSize:13, fontFamily:ff, width:"100%" }}>
              <span style={{ color:"#888" }}>{showAddr?<Icons.ChevDown />:<Icons.ChevRight />}</span>
              <span style={{ fontWeight:500 }}>Organisation Address</span>
              {(country||street||city) && <span style={{ fontSize:11, color:"#888", marginLeft:"auto" }}>{[street,city,country].filter(Boolean).join(", ").slice(0,40)}</span>}
            </button>
          </Field>
          {showAddr && (
            <div style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 14px 2px", marginBottom:14, border:"1px solid #EBEBEB" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Country" required><Select value={country} onChange={v=>{setCountry(v);setState("");}} options={COUNTRIES} /></Field>
                <Field label="State / County">
                  {stateOpts.length>0?<Select value={state} onChange={setState} options={stateOpts} placeholder="Select…" />:<Input value={state} onChange={setState} placeholder="Enter…" />}
                </Field>
              </div>
              <Field label="Street Address"><Input value={street} onChange={setStreet} placeholder="123 High Street" /></Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="City / Town"><Input value={city} onChange={setCity} /></Field>
                <Field label="Postcode / ZIP"><Input value={postcode} onChange={setPostcode} /></Field>
              </div>
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Currency" required><Select value={currency} onChange={setCurrency} options={CURRENCIES_LIST} /></Field>
            <Field label="Time Zone"><Select value={timezone} onChange={setTimezone} options={TIMEZONES} /></Field>
          </div>
          {/* VAT as slide toggle */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"#F9F9F9", borderRadius:9, border:"1px solid #EBEBEB", marginBottom:4 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>VAT Registered</div>
              <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Are you registered to charge VAT?</div>
            </div>
            <SlideToggle value={vatReg} onChange={v=>{setVatReg(v);setVatNumTouched(false);}} />
          </div>
          {vatReg && (
            <div style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 14px 8px", marginBottom:14, border:"1px solid #EBEBEB" }}>
              <Field label="VAT Registration Number" required error={vatNumError}>
                <Input value={vatNum} onChange={v=>{setVatNum(v);setVatNumTouched(true);}} placeholder="GB123456789" error={!!vatNumError} />
              </Field>
              {vatNum && validateVatNumber(vatNum) && (
                <div style={{ display:"flex", alignItems:"center", gap:6, color:"#16A34A", fontSize:12, fontWeight:600, marginBottom:10 }}>
                  <Icons.Check /> VAT number format valid
                </div>
              )}
              <Checkbox checked={importExport} onChange={setImportExport} label="I import/export goods and services from other countries" />
              <Checkbox checked={flatRate} onChange={setFlatRate} label="I've joined the VAT Flat Rate scheme" />
              {flatRate && <Field label="Flat Rate %"><Input value={flatRatePct} onChange={setFlatRatePct} type="number" placeholder="e.g. 12.5" /></Field>}
            </div>
          )}
          {!vatReg && <InfoBox color="#D97706">Items and invoices will not include VAT. You cannot legally charge VAT to customers until VAT registered.</InfoBox>}
          {isCIS && (
            <>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"#F9F9F9", borderRadius:9, border:"1px solid #EBEBEB", marginTop:8, marginBottom:4 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>CIS Registered</div>
                  <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Construction Industry Scheme</div>
                </div>
                <SlideToggle value={cisReg} onChange={v=>setCisReg(v)} />
              </div>
              {cisReg && (
                <div style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 14px 8px", marginBottom:14, border:"1px solid #EBEBEB" }}>
                  <Field label="UTR Number" hint="Unique Taxpayer Reference — 10 digits">
                    <Input value={cisUtr} onChange={setCisUtr} placeholder="e.g. 1234567890" maxLength={10} />
                  </Field>
                  <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", margin:"8px 0 10px" }}>CIS Role</div>
                  <Checkbox checked={cisContractor} onChange={setCisContractor} label="Contractor (I engage subcontractors)" />
                  <Checkbox checked={cisSub} onChange={setCisSub} label="Subcontractor (I work for contractors)" />
                  {cisSub && <Field label="CIS Deduction Rate"><Select value={cisRate} onChange={setCisRate} options={CIS_RATES} /></Field>}
                  <InfoBox>CIS deduction will be shown on invoices and automatically deducted from the total due.</InfoBox>
                </div>
              )}
            </>
          )}
          <button onClick={handleComplete} disabled={!canSubmit}
            style={{ width:"100%", padding:"13px 0", background:canSubmit?"#1A1A1A":"#CCC", color:"#fff", border:"none", borderRadius:9, fontSize:15, fontWeight:700, cursor:canSubmit?"pointer":"not-allowed", fontFamily:ff, marginTop:16, transition:"background 0.2s" }}
            onMouseEnter={e=>{ if(canSubmit) e.currentTarget.style.background="#E86C4A"; }}
            onMouseLeave={e=>{ if(canSubmit) e.currentTarget.style.background="#1A1A1A"; }}>
            Complete Setup →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOMER MODAL ──────────────────────────────────────────────────────────
function CustomerModal({ existing, onClose, onSave }) {
  const isEdit = !!existing;
  const ea = { street:"", city:"", county:"", postcode:"", country:"United Kingdom" };
  const [custType, setCustType] = useState(existing?.type||"Business");
  const [salutation, setSalutation] = useState(existing?.salutation||"");
  const [firstName, setFirstName] = useState(existing?.firstName||"");
  const [lastName, setLastName] = useState(existing?.lastName||"");
  const [companyName, setCompanyName] = useState(existing?.companyName||"");
  const [displayName, setDisplayName] = useState(existing?.name||"");
  const [currency, setCurrency] = useState(existing?.currency||"GBP");
  const [email, setEmail] = useState(existing?.email||"");
  const [workPhone, setWorkPhone] = useState(existing?.phone||"");
  const [mobile, setMobile] = useState(existing?.mobile||"");
  const [website, setWebsite] = useState(existing?.website||"");
  const [paymentTerms, setPaymentTerms] = useState(existing?.paymentTerms||"Net 30");
  const [customDays, setCustomDays] = useState(existing?.customPaymentDays||"");
  const [billing, setBilling] = useState(existing?.billingAddress||{...ea});
  const [sameAddr, setSameAddr] = useState(!existing?.shippingAddress);
  const [shippingAddr, setShippingAddr] = useState(existing?.shippingAddress||{...ea});
  const [contacts, setContacts] = useState(existing?.contactPersons||[]);
  const [customFields, setCustomFields] = useState(existing?.customFields||[]);
  const [remarks, setRemarks] = useState(existing?.remarks||"");
  const [vatNumber, setVatNumber] = useState(existing?.taxDetails?.vatNumber||"");
  const [utr, setUtr] = useState(existing?.taxDetails?.utr||"");
  const [cifRegistered, setCifRegistered] = useState(existing?.taxDetails?.cisRegistered||false);
  const [cisRole, setCisRole] = useState(existing?.taxDetails?.cisRole||"");
  const [cisDeductRate, setCisDeductRate] = useState(existing?.taxDetails?.cisRate||"20%");
  const addContact = () => setContacts(p=>[...p,{ id:crypto.randomUUID(), salutation:"", firstName:"", lastName:"", email:"", phone:"", jobTitle:"", department:"", isPrimary:false }]);
  const updContact = (id,f,v) => setContacts(p=>p.map(c=>c.id===id?{...c,[f]:v}:c));
  const delContact = id => setContacts(p=>p.filter(c=>c.id!==id));
  const addCF = () => setCustomFields(p=>[...p,{ id:crypto.randomUUID(), key:"", value:"" }]);
  const updCF = (id,f,v) => setCustomFields(p=>p.map(x=>x.id===id?{...x,[f]:v}:x));
  const delCF = id => setCustomFields(p=>p.filter(x=>x.id!==id));
  const handleSave = () => {
    onSave({ id:existing?.id||crypto.randomUUID(), type:custType, salutation, firstName, lastName, companyName, name:displayName||`${firstName} ${lastName}`.trim()||companyName, currency, email, phone:workPhone, mobile, website, paymentTerms, customPaymentDays:customDays, billingAddress:billing, shippingAddress:sameAddr?null:shippingAddr, contactPersons:contacts, customFields, remarks, taxDetails:{ vatNumber, utr, cisRegistered:cifRegistered, cisRole, cisRate:cisDeductRate } });
    onClose();
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:600, maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.18)", fontFamily:ff }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px 14px", borderBottom:"1px solid #F0F0F0" }}>
          <div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:"#1A1A1A" }}>{isEdit?`Edit — ${existing.name}`:"New Customer"}</h2>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#AAA" }}>{isEdit?"Update customer details":"Fill in the details below"}</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA" }}><Icons.X /></button>
        </div>
        <div style={{ overflowY:"auto", padding:"18px 24px", flex:1 }}>
          <Field label="Customer Type" required><Toggle value={custType} onChange={setCustType} options={["Business","Individual"]} /></Field>
          <div style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 14px 2px", marginBottom:14, border:"1px solid #EBEBEB" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Primary Contact</div>
            <div style={{ display:"grid", gridTemplateColumns:"100px 1fr 1fr", gap:10 }}>
              <Field label="Salutation"><Select value={salutation} onChange={setSalutation} options={SALUTATIONS} placeholder="—" /></Field>
              <Field label="First Name" required><Input value={firstName} onChange={setFirstName} placeholder="Jane" /></Field>
              <Field label="Last Name" required><Input value={lastName} onChange={setLastName} placeholder="Smith" /></Field>
            </div>
          </div>
          {custType==="Business" && <Field label="Company Name"><Input value={companyName} onChange={v=>{ setCompanyName(v); if(!displayName || displayName===companyName) setDisplayName(v); }} placeholder="Acme Corporation Ltd" /></Field>}
          <Field label="Display Name (on invoices)" required><Input value={displayName} onChange={setDisplayName} /></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Email" required><Input value={email} onChange={setEmail} type="email" placeholder="jane@example.com" /></Field>
            <Field label="Work Phone"><Input value={workPhone} onChange={setWorkPhone} placeholder="+44 20 7946 0000" /></Field>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Mobile"><Input value={mobile} onChange={setMobile} placeholder="+44 7700 900000" /></Field>
            <Field label="Website"><Input value={website} onChange={setWebsite} placeholder="https://example.com" /></Field>
          </div>

          {/* ADDRESS — before currency */}
          <ExpandSection title="Address">
            <div style={{ paddingTop:8 }}>
              <AddressForm address={billing} onChange={setBilling} label="Billing Address" />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB", margin:"4px 0 14px" }}>
                <span style={{ fontSize:13, fontWeight:600, color:"#333" }}>Shipping same as billing</span>
                <Switch checked={sameAddr} onChange={v=>{setSameAddr(v);if(!v)setShippingAddr({...ea});}} />
              </div>
              {!sameAddr && <AddressForm address={shippingAddr} onChange={setShippingAddr} label="Shipping Address" />}
            </div>
          </ExpandSection>

          {/* CURRENCY + PAYMENT TERMS — after address */}
          <div style={{ borderTop:"1px solid #F0F0F0", paddingTop:14, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#333", marginBottom:12 }}>Currency & Payment</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Currency"><Select value={currency} onChange={setCurrency} options={Object.keys(CUR_SYM).map(k=>({ value:k, label:`${k} (${CUR_SYM[k]})` }))} /></Field>
              <Field label="Payment Terms">
                <PaymentTermsField value={paymentTerms} onChange={setPaymentTerms} customDays={customDays} onCustomDaysChange={setCustomDays} />
              </Field>
            </div>
          </div>

          {/* TAX DETAILS */}
          <ExpandSection title="Tax Details">
            <div style={{ paddingTop:8 }}>
              <Field label="VAT Number"><Input value={vatNumber} onChange={setVatNumber} placeholder="GB123456789" /></Field>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB", marginBottom:12 }}>
                <div><div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>CIS Registered</div><div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Construction Industry Scheme</div></div>
                <Switch checked={cifRegistered} onChange={setCifRegistered} />
              </div>
              {cifRegistered && (
                <div style={{ background:"#F9F9F9", borderRadius:8, padding:"12px 14px", border:"1px solid #EBEBEB" }}>
                  <Field label="UTR Number" hint="Unique Taxpayer Reference"><Input value={utr} onChange={setUtr} placeholder="1234567890" /></Field>
                  <Field label="CIS Role"><Select value={cisRole} onChange={setCisRole} options={["Contractor","Subcontractor","Both"]} placeholder="Select role…" /></Field>
                  {(cisRole==="Subcontractor"||cisRole==="Both") && <Field label="CIS Deduction Rate"><Select value={cisDeductRate} onChange={setCisDeductRate} options={CIS_RATES} /></Field>}
                  <InfoBox>CIS deduction will be applied automatically on invoices raised for this customer.</InfoBox>
                </div>
              )}
            </div>
          </ExpandSection>

          {/* CONTACT PERSONS */}
          <ExpandSection title={`Contact Persons${contacts.length>0?` (${contacts.length})`:""}`}>
            <div style={{ paddingTop:8 }}>
              {contacts.map((cp,idx)=>(
                <div key={cp.id} style={{ background:"#F9F9F9", borderRadius:10, padding:"12px 12px 4px", marginBottom:10, border:"1px solid #EBEBEB" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.05em" }}>Contact {idx+1}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#555", cursor:"pointer" }}><Switch checked={cp.isPrimary} onChange={v=>updContact(cp.id,"isPrimary",v)} /> Primary</label>
                      <button onClick={()=>delContact(cp.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC" }}
                        onMouseEnter={e=>e.currentTarget.style.color="#DC2626"} onMouseLeave={e=>e.currentTarget.style.color="#CCC"}><Icons.Trash /></button>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr", gap:8 }}>
                    <Field label="Title"><Select value={cp.salutation} onChange={v=>updContact(cp.id,"salutation",v)} options={SALUTATIONS} placeholder="—" /></Field>
                    <Field label="First Name"><Input value={cp.firstName} onChange={v=>updContact(cp.id,"firstName",v)} placeholder="First" /></Field>
                    <Field label="Last Name"><Input value={cp.lastName} onChange={v=>updContact(cp.id,"lastName",v)} placeholder="Last" /></Field>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <Field label="Email"><Input value={cp.email} onChange={v=>updContact(cp.id,"email",v)} /></Field>
                    <Field label="Phone"><Input value={cp.phone} onChange={v=>updContact(cp.id,"phone",v)} /></Field>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <Field label="Job Title"><Input value={cp.jobTitle} onChange={v=>updContact(cp.id,"jobTitle",v)} placeholder="Finance Manager" /></Field>
                    <Field label="Department"><Input value={cp.department} onChange={v=>updContact(cp.id,"department",v)} placeholder="Accounts" /></Field>
                  </div>
                </div>
              ))}
              <Btn onClick={addContact} variant="outline" size="sm" icon={<Icons.Plus />}>Add Contact Person</Btn>
            </div>
          </ExpandSection>

          {/* CUSTOM FIELDS */}
          <ExpandSection title={`Custom Fields${customFields.length>0?` (${customFields.length})`:""}`}>
            <div style={{ paddingTop:8 }}>
              {customFields.map(f=>(
                <div key={f.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 28px", gap:8, marginBottom:8, alignItems:"flex-end" }}>
                  <Field label="Field Name"><Input value={f.key} onChange={v=>updCF(f.id,"key",v)} placeholder="e.g. PO Number" /></Field>
                  <Field label="Value"><Input value={f.value} onChange={v=>updCF(f.id,"value",v)} placeholder="Value" /></Field>
                  <button onClick={()=>delCF(f.id)} style={{ height:38, border:"none", background:"none", cursor:"pointer", color:"#CCC", marginBottom:14 }}
                    onMouseEnter={e=>e.currentTarget.style.color="#DC2626"} onMouseLeave={e=>e.currentTarget.style.color="#CCC"}><Icons.Trash /></button>
                </div>
              ))}
              <Btn onClick={addCF} variant="outline" size="sm" icon={<Icons.Plus />}>Add Custom Field</Btn>
            </div>
          </ExpandSection>

          <ExpandSection title="Remarks">
            <div style={{ paddingTop:8 }}><Textarea value={remarks} onChange={setRemarks} placeholder="Internal notes…" rows={3} /></div>
          </ExpandSection>
        </div>
        <div style={{ padding:"12px 24px 16px", borderTop:"1px solid #F0F0F0", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary">{isEdit?"Save Changes":"Save Customer"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── ITEM MODAL ──────────────────────────────────────────────────────────────
function ItemModal({ existing, onClose, onSave }) {
  const { orgSettings } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name||"");
  const [itemType, setItemType] = useState(existing?.type||"Service");
  const [description, setDescription] = useState(existing?.description||"");
  const [rate, setRate] = useState(existing?.rate??"");
  const [unit, setUnit] = useState(existing?.unit||"hrs");
  const [taxRate, setTaxRate] = useState(existing?.taxRate??20);
  const [active, setActive] = useState(existing?.active??true);
  const [sku, setSku] = useState(existing?.sku||"");
  const [account, setAccount] = useState(existing?.account||"");
  const [cisApplicable, setCisApplicable] = useState(existing?.cisApplicable??false);
  const [cisLabourRate, setCisLabourRate] = useState(existing?.cisLabourRate||"20%");
  const showCIS = itemType==="Service"||itemType==="Labour"||itemType==="Material";
  const typeColors = { Service:"#4F46E5", Labour:"#D97706", Material:"#059669", Equipment:"#2563EB", Other:"#6B7280" };
  const handleSave = () => {
    onSave({ id:existing?.id||crypto.randomUUID(), name, type:itemType, description, rate:Number(rate), unit, taxRate:isVat?Number(taxRate):0, active, sku, account, cisApplicable:showCIS?cisApplicable:false, cisLabourRate:cisApplicable?cisLabourRate:null });
    onClose();
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, boxShadow:"0 20px 60px rgba(0,0,0,0.18)", fontFamily:ff, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px 14px", borderBottom:"1px solid #F0F0F0" }}>
          <div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:"#1A1A1A" }}>{isEdit?`Edit — ${existing.name}`:"New Item"}</h2>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#AAA" }}>Products and services you sell</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA" }}><Icons.X /></button>
        </div>
        <div style={{ padding:"18px 24px" }}>
          <Field label="Item Type" required>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {ITEM_TYPES.map(t=>(
                <button key={t} onClick={()=>setItemType(t)}
                  style={{ padding:"7px 14px", borderRadius:20, border:`1.5px solid ${itemType===t?typeColors[t]:"#E0E0E0"}`, background:itemType===t?typeColors[t]+"15":"#FAFAFA", color:itemType===t?typeColors[t]:"#888", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff, transition:"all 0.15s" }}>
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Item Name" required><Input value={name} onChange={setName} placeholder="e.g. Web Design Package" /></Field>
          <Field label="Description"><Textarea value={description} onChange={setDescription} placeholder="Brief description…" rows={2} /></Field>
          <div style={{ display:"grid", gridTemplateColumns:isVat?"1fr 1fr 1fr":"1fr 1fr", gap:12 }}>
            <Field label="Rate" required><Input value={rate} onChange={setRate} placeholder="0.00" type="number" align="right" /></Field>
            <Field label="Unit"><Select value={unit} onChange={setUnit} options={ITEM_UNITS} /></Field>
            {isVat && (
              <Field label="VAT Rate">
                <Select value={String(taxRate)} onChange={v=>setTaxRate(Number(v))} options={TAX_RATES.map(r=>({ value:String(r), label:`${r}%` }))} />
              </Field>
            )}
          </div>
          {!isVat && <InfoBox color="#D97706">VAT Rate hidden — your organisation is not VAT registered. Items cannot legally include VAT.</InfoBox>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:4 }}>
            <Field label="SKU / Code"><Input value={sku} onChange={setSku} placeholder="e.g. WD-001" /></Field>
            <Field label="Account / Category">
              <Select value={account} onChange={setAccount} options={ACCOUNT_CATEGORIES} placeholder="Select category…" />
            </Field>
          </div>
          {showCIS && (
            <div style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 14px 10px", border:"1px solid #EBEBEB", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:cisApplicable?12:0 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>CIS Applicable</div>
                  <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>
                    {itemType==="Material"?"Materials may include a CIS-liable labour element.":itemType==="Labour"?"Labour is typically subject to CIS deduction.":"Services may be subject to CIS if provided to a contractor."}
                  </div>
                </div>
                <Switch checked={cisApplicable} onChange={setCisApplicable} />
              </div>
              {cisApplicable && (
                <div style={{ marginTop:10 }}>
                  <Field label="CIS Deduction Rate"><Select value={cisLabourRate} onChange={setCisLabourRate} options={CIS_RATES} /></Field>
                  <InfoBox>{itemType==="Material"?"Only the labour element is subject to CIS. Pure material cost excluded.":"CIS will be deducted when this item is included on an invoice to a contractor."}</InfoBox>
                </div>
              )}
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB" }}>
            <div><div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>Active</div><div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Available in invoices and quotes</div></div>
            <Switch checked={active} onChange={setActive} />
          </div>
        </div>
        <div style={{ padding:"12px 24px 16px", borderTop:"1px solid #F0F0F0", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!name||!rate}>{isEdit?"Save Changes":"Save Item"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV = [
  { id:"home", label:"Home", Icon:Icons.Home },
  { id:"customers", label:"Customers", Icon:Icons.Customers },
  { id:"items", label:"Items", Icon:Icons.Items },
  { id:"quotes", label:"Quotes", Icon:Icons.Quotes },
  { id:"invoices", label:"Invoices", Icon:Icons.Invoices },
  { id:"payments", label:"Payments Received", Icon:Icons.Payments },
  { id:"settings", label:"Settings", Icon:Icons.Settings },
];

const SIDEBAR_FULL = 220;
const SIDEBAR_ICON = 54;

function Sidebar({ active, setActive, user, onEditUser, setMobileOpen, sidebarBg="#1A1A1A", accent="#E86C4A", pinned=true, onTogglePin, userAvatar, collapsed=false }) {
  return (
    <div style={{ width: collapsed ? SIDEBAR_ICON : SIDEBAR_FULL, height:"100%", background:sidebarBg, display:"flex", flexDirection:"column", fontFamily:ff, overflow:"hidden", transition:"width 0.22s cubic-bezier(.4,0,.2,1)" }}>
      {/* Logo / header */}
      <div style={{ padding: collapsed ? "16px 0" : "18px 14px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent: collapsed ? "center" : "space-between", flexShrink:0 }}>
        {collapsed ? (
          <button onClick={onTogglePin} title="Expand sidebar"
            style={{ width:28, height:28, background:accent, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", padding:0 }}>
            <Icons.Invoices />
          </button>
        ) : (<>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:28, height:28, background:accent, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
            <span style={{ color:"#fff", fontSize:13, fontWeight:800, letterSpacing:"0.06em" }}>AI INVOICE</span>
          </div>
          {onTogglePin && (
            <button onClick={onTogglePin} title={pinned ? "Unpin sidebar" : "Pin sidebar"}
              style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", padding:3, display:"flex", borderRadius:5, transition:"color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.color=accent} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.4)"}>
              <Ic d={pinned
                ? '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>'
                : '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'
              } size={14} sw={2}/>
            </button>
          )}
        </>)}
      </div>

      {/* Nav items */}
      <nav style={{ flex:1, padding: collapsed ? "8px 0" : "10px 8px", overflowY:"auto" }}>
        {NAV.map(({ id, label, Icon })=>{
          const on = active===id;
          return collapsed ? (
            <button key={id} onClick={()=>{ setActive(id); setMobileOpen?.(false); }}
              title={label}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", padding:"11px 0", border:"none", background:on?`${accent}22`:"none", color:on?accent:"rgba(255,255,255,0.45)", cursor:"pointer", marginBottom:1, position:"relative", transition:"all 0.15s" }}
              onMouseEnter={e=>{ if(!on) e.currentTarget.style.background="rgba(255,255,255,0.07)"; }}
              onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="none"; }}>
              <Icon />
              {on && <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:3, height:20, borderRadius:"3px 0 0 3px", background:accent }} />}
            </button>
          ) : (
            <button key={id} onClick={()=>{ setActive(id); setMobileOpen?.(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:8, border:"none", background:on?`${accent}22`:"none", color:on?accent:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:13, fontWeight:on?700:400, fontFamily:ff, marginBottom:2, textAlign:"left", transition:"all 0.15s" }}
              onMouseEnter={e=>{ if(!on) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
              onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="none"; }}>
              <Icon />{label}{on && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:accent }} />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: collapsed ? "10px 0 14px" : "10px 12px 14px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent: collapsed ? "center" : "unset", gap:9, flexShrink:0 }}>
        <button onClick={onEditUser} title="Edit profile"
          style={{ width:32, height:32, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:700, flexShrink:0, overflow:"hidden", border:"none", cursor:"pointer", padding:0 }}>
          {userAvatar ? <img src={userAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (user.name||"?")[0].toUpperCase()}
        </button>
        {!collapsed && (<>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:"#fff", fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name}</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>{user.role}</div>
          </div>
          <button onClick={onEditUser} title="Edit profile"
            style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.3)", padding:2, display:"flex" }}
            onMouseEnter={e=>e.currentTarget.style.color=accent} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.3)"}>
            <Icons.Pen />
          </button>
        </>)}
      </div>
    </div>
  );
}

// ─── MOBILE TOP BAR ───────────────────────────────────────────────────────────
function MobileTopBar({ activePage, onMenuOpen, onNavigate, sidebarBg="#1A1A1A" }) {
  const page = NAV.find(n=>n.id===activePage);
  return (
    <div className="mobile-topbar" style={{ display:"none", position:"fixed", top:0, left:0, right:0, height:52, background:sidebarBg, zIndex:200, alignItems:"center", padding:"0 16px", gap:12 }}>
      <button onClick={onMenuOpen} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", padding:4 }}>
        <Ic d='<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' size={20} sw={2} />
      </button>
      <div style={{ display:"flex", alignItems:"center", gap:7, flex:1 }}>
        <div style={{ width:24, height:24, background:"#E86C4A", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
        <span style={{ color:"#fff", fontSize:13, fontWeight:800, letterSpacing:"0.06em" }}>AI INVOICE</span>
      </div>
      <span style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>{page?.label||""}</span>
    </div>
  );
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
const MOB_NAV = [
  { id:"home", label:"Home", Icon:Icons.Home },
  { id:"invoices", label:"Invoices", Icon:Icons.Invoices },
  { id:"quotes", label:"Quotes", Icon:Icons.Quotes },
  { id:"customers", label:"Clients", Icon:Icons.Customers },
  { id:"settings", label:"Settings", Icon:Icons.Settings },
];
function MobileBottomNav({ active, setActive }) {
  return (
    <div className="mobile-bottom-nav" style={{ display:"none", position:"fixed", bottom:0, left:0, right:0, height:60, background:"#1A1A1A", zIndex:200, borderTop:"1px solid rgba(255,255,255,0.08)", alignItems:"center", justifyContent:"space-around" }}>
      {MOB_NAV.map(({ id, label, Icon })=>{
        const on=active===id;
        return (
          <button key={id} onClick={()=>setActive(id)}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", color:on?"#E86C4A":"rgba(255,255,255,0.4)", fontFamily:ff, padding:"6px 12px", minWidth:52, transition:"color 0.15s" }}>
            <Icon />
            <span style={{ fontSize:10, fontWeight:on?700:400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── USER EDIT MODAL ──────────────────────────────────────────────────────────
function UserEditModal({ user, onClose, onSave, userAvatar, setUserAvatar, appTheme, setAppTheme, sidebarPinned, setSidebarPinned }) {
  const [name, setName] = useState(user.name||"");
  const [role, setRole] = useState(user.role||"Admin");
  const [email, setEmail] = useState(user.email||"");
  const [tab, setTab] = useState("profile"); // "profile" | "appearance"
  const [localAvatar, setLocalAvatar] = useState(userAvatar);
  const [themeType, setThemeType] = useState(appTheme?.type||"solid");
  const [themeColor, setThemeColor] = useState(appTheme?.color||"#1A1A1A");
  const [themeColor2, setThemeColor2] = useState(appTheme?.color2||"#E86C4A");
  const [themeAccent, setThemeAccent] = useState(appTheme?.accent||"#E86C4A");
  const [pinned, setPinned] = useState(sidebarPinned);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLocalAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const PRESET_THEMES = [
    { label:"Dark",       type:"solid",    color:"#1A1A1A", color2:"#333", accent:"#E86C4A" },
    { label:"Ocean",      type:"gradient", color:"#1E3A8A", color2:"#0891B2", accent:"#38BDF8" },
    { label:"Forest",     type:"gradient", color:"#14532D", color2:"#166534", accent:"#4ADE80" },
    { label:"Sunset",     type:"gradient", color:"#7C2D12", color2:"#E86C4A", accent:"#FDBA74" },
    { label:"Violet",     type:"gradient", color:"#4C1D95", color2:"#7C3AED", accent:"#C4B5FD" },
    { label:"Slate",      type:"solid",    color:"#334155", color2:"#475569", accent:"#94A3B8" },
    { label:"Rose",       type:"gradient", color:"#881337", color2:"#E11D48", accent:"#FDA4AF" },
    { label:"Charcoal",   type:"solid",    color:"#292524", color2:"#44403C", accent:"#FCD34D" },
  ];

  const previewBg = themeType==="gradient"
    ? `linear-gradient(160deg,${themeColor},${themeColor2})`
    : themeColor;

  const handleSave = () => {
    onSave({ name, role, email });
    setUserAvatar(localAvatar);
    setAppTheme({ type:themeType, color:themeColor, color2:themeColor2, accent:themeAccent });
    setSidebarPinned(pinned);
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:480, maxHeight:"92vh", boxShadow:"0 24px 60px rgba(0,0,0,0.2)", fontFamily:ff, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 22px 12px", borderBottom:"1px solid #F0F0F0" }}>
          <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:"#1A1A1A" }}>Profile & Appearance</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA", display:"flex" }}><Icons.X /></button>
        </div>
        {/* Tabs */}
        <div style={{ display:"flex", gap:0, padding:"0 22px", borderBottom:"1px solid #F0F0F0" }}>
          {[["profile","👤 Profile"],["appearance","🎨 Appearance"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:"10px 16px", border:"none", borderBottom:`2px solid ${tab===t?"#1A1A1A":"transparent"}`, background:"none", fontSize:13, fontWeight:tab===t?700:400, color:tab===t?"#1A1A1A":"#888", cursor:"pointer", fontFamily:ff }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ overflowY:"auto", flex:1, padding:"18px 22px" }}>
          {tab==="profile" && (<>
            {/* Avatar */}
            <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
              <label style={{ cursor:"pointer", position:"relative", display:"block" }}>
                <div style={{ width:80, height:80, borderRadius:"50%", background:themeColor, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:30, fontWeight:800, overflow:"hidden", border:"3px solid #F0F0F0" }}>
                  {localAvatar
                    ? <img src={localAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : (name||"?")[0].toUpperCase()
                  }
                </div>
                <div style={{ position:"absolute", bottom:0, right:0, width:26, height:26, borderRadius:"50%", background:"#1A1A1A", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", border:"2px solid #fff" }}>
                  <Icons.Plus />
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display:"none" }} />
              </label>
            </div>
            {localAvatar && (
              <div style={{ textAlign:"center", marginBottom:14 }}>
                <button onClick={()=>setLocalAvatar(null)} style={{ fontSize:11, color:"#DC2626", background:"none", border:"none", cursor:"pointer", fontFamily:ff }}>Remove photo</button>
              </div>
            )}
            <Field label="Full Name" required><Input value={name} onChange={setName} placeholder="Your name" /></Field>
            <Field label="Email"><Input value={email} onChange={setEmail} type="email" placeholder="email@example.com" /></Field>
            <Field label="Role"><Select value={role} onChange={setRole} options={["Admin","Manager","Accountant","Viewer"]} /></Field>
          </>)}

          {tab==="appearance" && (<>
            {/* Sidebar preview */}
            <div style={{ borderRadius:10, overflow:"hidden", marginBottom:16, border:"1px solid #EBEBEB" }}>
              <div style={{ background:previewBg, padding:"12px 14px", display:"flex", alignItems:"center", gap:9 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:themeAccent, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
                <span style={{ color:"#fff", fontSize:12, fontWeight:800, letterSpacing:"0.06em" }}>AI INVOICE</span>
              </div>
              <div style={{ background:previewBg, padding:"4px 8px 10px" }}>
                {["Home","Invoices","Payments"].map(l=>(
                  <div key={l} style={{ padding:"7px 10px", borderRadius:6, margin:"2px 0", color:l==="Invoices"?themeAccent:"rgba(255,255,255,0.5)", background:l==="Invoices"?`${themeAccent}22`:"none", fontSize:12, display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:l==="Invoices"?themeAccent:"rgba(255,255,255,0.2)" }} />{l}
                  </div>
                ))}
              </div>
            </div>

            {/* Preset themes */}
            <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Preset Themes</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
              {PRESET_THEMES.map(p=>{
                const bg = p.type==="gradient"?`linear-gradient(135deg,${p.color},${p.color2})`:p.color;
                const active = themeColor===p.color && themeType===p.type;
                return (
                  <button key={p.label} onClick={()=>{ setThemeType(p.type); setThemeColor(p.color); setThemeColor2(p.color2); setThemeAccent(p.accent); }}
                    style={{ padding:"8px 6px", borderRadius:8, border:`2px solid ${active?"#1A1A1A":"#EBEBEB"}`, background:"#fff", cursor:"pointer", fontFamily:ff }}>
                    <div style={{ height:22, borderRadius:5, background:bg, marginBottom:4 }} />
                    <span style={{ fontSize:10, fontWeight:600, color:"#555" }}>{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom controls */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Style">
                <Toggle value={themeType==="gradient"?"Gradient":"Solid"} onChange={v=>setThemeType(v==="Gradient"?"gradient":"solid")} options={["Solid","Gradient"]} />
              </Field>
              <Field label="Accent Colour">
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input type="color" value={themeAccent} onChange={e=>setThemeAccent(e.target.value)}
                    style={{ width:36, height:34, borderRadius:7, border:"1.5px solid #E0E0E0", padding:2, cursor:"pointer" }} />
                  <span style={{ fontSize:11, color:"#AAA", fontFamily:"monospace" }}>{themeAccent}</span>
                </div>
              </Field>
              <Field label={themeType==="gradient"?"Gradient Start":"Sidebar Colour"}>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input type="color" value={themeColor} onChange={e=>setThemeColor(e.target.value)}
                    style={{ width:36, height:34, borderRadius:7, border:"1.5px solid #E0E0E0", padding:2, cursor:"pointer" }} />
                  <span style={{ fontSize:11, color:"#AAA", fontFamily:"monospace" }}>{themeColor}</span>
                </div>
              </Field>
              {themeType==="gradient" && (
                <Field label="Gradient End">
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <input type="color" value={themeColor2} onChange={e=>setThemeColor2(e.target.value)}
                      style={{ width:36, height:34, borderRadius:7, border:"1.5px solid #E0E0E0", padding:2, cursor:"pointer" }} />
                    <span style={{ fontSize:11, color:"#AAA", fontFamily:"monospace" }}>{themeColor2}</span>
                  </div>
                </Field>
              )}
            </div>

            {/* Sidebar behaviour */}
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Sidebar Behaviour</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"#F9F9F9", borderRadius:9, border:"1px solid #EBEBEB" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>Pinned Sidebar</div>
                  <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Always visible · hover to show when unpinned</div>
                </div>
                <SlideToggle value={pinned} onChange={setPinned} />
              </div>
            </div>
          </>)}
        </div>

        <div style={{ padding:"12px 22px 16px", borderTop:"1px solid #F0F0F0", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!name}>Save Changes</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ user, onNavigate }) {
  const [aiInput, setAiInput] = useState("");
  const [messages, setMessages] = useState([{ role:"assistant", text:`Hi ${user?.name?.split(" ")[0]||"there"} 👋 I'm your AI Invoice assistant. Ask me anything!` }]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[messages]);
  const send = async () => {
    if(!aiInput.trim()||loading) return;
    const msg=aiInput.trim(); setAiInput("");
    setMessages(p=>[...p,{ role:"user", text:msg }]);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:"You are an AI assistant for an invoicing platform called AI Invoice. Help users with invoices, customers, VAT, CIS, payments. Be concise.", messages:[{ role:"user", content:msg }] }) });
      const d = await res.json();
      setMessages(p=>[...p,{ role:"assistant", text:d.content?.map(i=>i.text||"").join("")||"Sorry, couldn't process that." }]);
    } catch { setMessages(p=>[...p,{ role:"assistant", text:"Connection issue. Please try again." }]); }
    setLoading(false);
  };
  const STATS = [{ label:"Outstanding", value:"£4,320.00", sub:"3 invoices", color:"#E86C4A" },{ label:"Overdue", value:"£1,200.00", sub:"1 invoice", color:"#C0392B" },{ label:"Paid (30 days)", value:"£12,800.00", sub:"8 invoices", color:"#1A1A1A" },{ label:"Draft", value:"£2,500.00", sub:"2 invoices", color:"#888" }];
  const RECENT = [{ id:"INV-0001", customer:"Acme Corp", date:"01 Mar 2026", due:"31 Mar 2026", amount:"£1,200.00", status:"Sent" },{ id:"INV-0002", customer:"Blue Sky Ltd", date:"20 Feb 2026", due:"20 Mar 2026", amount:"£3,120.00", status:"Overdue" },{ id:"INV-0003", customer:"Green Media", date:"15 Feb 2026", due:"15 Mar 2026", amount:"£840.00", status:"Paid" }];
  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, fontFamily:ff }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:"#1A1A1A", margin:"0 0 3px" }}>Good morning, {user?.name?.split(" ")[0]||"there"} 👋</h1>
        <p style={{ color:"#888", fontSize:13, margin:0 }}>Sunday, 8 March 2026 · Financial overview</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
        {STATS.map(s=>(
          <div key={s.label} style={{ background:"#fff", borderRadius:12, padding:"16px 18px", border:"1px solid #EBEBEB" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", overflow:"hidden", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderBottom:"1px solid #F0F0F0", background:"#FAFAFA" }}>
          <div style={{ width:28, height:28, background:"#1A1A1A", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}><Icons.Bot /></div>
          <div><div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>AI Assistant</div><div style={{ fontSize:11, color:"#AAA" }}>Powered by Claude</div></div>
          <div style={{ marginLeft:"auto", width:7, height:7, borderRadius:"50%", background:"#16A34A" }} />
        </div>
        <div style={{ height:200, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:10 }}>
          {messages.map((m,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
              {m.role==="assistant" && <div style={{ width:22, height:22, background:"#1A1A1A", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", marginRight:7, marginTop:2, flexShrink:0 }}><Icons.Bot /></div>}
              <div style={{ maxWidth:"72%", padding:"9px 13px", borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", background:m.role==="user"?"#1A1A1A":"#F4F4F4", color:m.role==="user"?"#fff":"#1A1A1A", fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{m.text}</div>
            </div>
          ))}
          {loading && <div style={{ display:"flex", gap:4, padding:"9px 13px", background:"#F4F4F4", borderRadius:"14px 14px 14px 4px", width:"fit-content" }}>{[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#CCC", animation:`pulse 1.2s ${i*0.2}s infinite` }} />)}</div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding:"8px 12px", borderTop:"1px solid #F0F0F0", display:"flex", gap:7 }}>
          <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about invoices, VAT, CIS…"
            style={{ flex:1, padding:"9px 13px", border:"1.5px solid #E8E8E8", borderRadius:9, fontSize:13, fontFamily:ff, outline:"none", background:"#FAFAFA" }} />
          <button onClick={send} disabled={loading} style={{ width:36, height:36, background:loading?"#CCC":"#1A1A1A", border:"none", borderRadius:8, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}><Icons.Send /></button>
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", overflowX:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderBottom:"1px solid #F0F0F0" }}>
          <span style={{ fontWeight:700, fontSize:13, color:"#1A1A1A" }}>Recent Invoices</span>
          <button onClick={()=>onNavigate?.("invoices")} style={{ fontSize:12, color:"#E86C4A", background:"none", border:"none", cursor:"pointer", fontWeight:600, fontFamily:ff }}>View all →</button>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
          <thead><tr style={{ background:"#FAFAFA" }}>{["Invoice #","Customer","Date","Due","Amount","Status"].map(h=><th key={h} style={{ padding:"8px 18px", textAlign:"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #F0F0F0" }}>{h}</th>)}</tr></thead>
          <tbody>{RECENT.map(inv=>(
            <tr key={inv.id} style={{ borderBottom:"1px solid #F7F7F7" }}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{ padding:"11px 18px", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{inv.id}</td>
              <td style={{ padding:"11px 18px", fontSize:13, color:"#444" }}>{inv.customer}</td>
              <td style={{ padding:"11px 18px", fontSize:13, color:"#888" }}>{inv.date}</td>
              <td style={{ padding:"11px 18px", fontSize:13, color:"#888" }}>{inv.due}</td>
              <td style={{ padding:"11px 18px", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{inv.amount}</td>
              <td style={{ padding:"11px 18px" }}><Tag color={STATUS_COLORS[inv.status]}>{inv.status}</Tag></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CUSTOMERS PAGE ──────────────────────────────────────────────────────────
function CustomersPage() {
  const { customers, setCustomers } = useContext(AppCtx);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const filtered = customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.email.toLowerCase().includes(search.toLowerCase()));
  const onSave = c => setCustomers(p => upsert(p, c));
  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, fontFamily:ff }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div><h1 style={{ fontSize:24, fontWeight:800, color:"#1A1A1A", margin:"0 0 3px" }}>Customers</h1><p style={{ color:"#AAA", fontSize:13, margin:0 }}>{customers.length} total</p></div>
        <Btn onClick={()=>setModal({ mode:"new" })} variant="primary" icon={<Icons.Plus />}>New Customer</Btn>
      </div>
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", overflowX:"auto" }}>
        <div style={{ padding:"11px 16px", borderBottom:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:9 }}>
          <Icons.Search />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1A1A1A", background:"transparent", fontFamily:ff }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
          <thead><tr style={{ background:"#FAFAFA" }}>{["Name","Type","Email","Phone","Currency",""].map(h=><th key={h} style={{ padding:"8px 18px", textAlign:"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #F0F0F0" }}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(c=>(
            <tr key={c.id} style={{ borderBottom:"1px solid #F7F7F7" }}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{ padding:"12px 18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:30, height:30, borderRadius:"50%", background:"#F0F0F0", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:"#555" }}>{c.name[0]}</div>
                  <span style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>{c.name}</span>
                </div>
              </td>
              <td style={{ padding:"12px 18px" }}><Tag color={c.type==="Business"?"#4F46E5":"#EA580C"}>{c.type}</Tag></td>
              <td style={{ padding:"12px 18px", fontSize:13, color:"#555" }}>{c.email}</td>
              <td style={{ padding:"12px 18px", fontSize:13, color:"#888" }}>{c.phone}</td>
              <td style={{ padding:"12px 18px", fontSize:13, color:"#888" }}>{c.currency}</td>
              <td style={{ padding:"12px 18px" }}><Btn onClick={()=>setModal({ mode:"edit", customer:c })} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn></td>
            </tr>
          ))}
          {filtered.length===0 && <tr><td colSpan={6} style={{ padding:"40px 18px", textAlign:"center", color:"#CCC", fontSize:13 }}>No customers found</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && <CustomerModal existing={modal.mode==="edit"?modal.customer:null} onClose={()=>setModal(null)} onSave={onSave} />}
    </div>
  );
}

// ─── ITEMS PAGE ──────────────────────────────────────────────────────────────
function ItemsPage() {
  const { orgSettings, catalogItems, setCatalogItems } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const filtered = catalogItems.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())||i.description.toLowerCase().includes(search.toLowerCase()));
  const onSave = item => setCatalogItems(p=>{ const i=p.findIndex(x=>x.id===item.id); if(i>=0){const u=[...p];u[i]=item;return u;} return [...p,item]; });
  const toggleActive = id => setCatalogItems(p=>p.map(i=>i.id===id?{...i,active:!i.active}:i));
  const typeColors = { Service:"#4F46E5", Labour:"#D97706", Material:"#059669", Equipment:"#2563EB", Other:"#6B7280" };
  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, fontFamily:ff }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div><h1 style={{ fontSize:24, fontWeight:800, color:"#1A1A1A", margin:"0 0 3px" }}>Items</h1><p style={{ color:"#AAA", fontSize:13, margin:0 }}>Products and services you sell</p></div>
        <Btn onClick={()=>setModal({ mode:"new" })} variant="primary" icon={<Icons.Plus />}>New Item</Btn>
      </div>
      {!isVat && <div style={{ marginBottom:14 }}><InfoBox color="#D97706">Your organisation is not VAT registered. VAT rates are hidden on all items.</InfoBox></div>}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", overflowX:"auto" }}>
        <div style={{ padding:"11px 16px", borderBottom:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:9 }}>
          <Icons.Search />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1A1A1A", background:"transparent", fontFamily:ff }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
          <thead><tr style={{ background:"#FAFAFA" }}>
            {["Name","Type","Rate","Unit",...(isVat?["VAT"]:[]),"CIS","Status",""].map(h=><th key={h} style={{ padding:"8px 18px", textAlign:h==="Rate"?"right":"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #F0F0F0" }}>{h}</th>)}
          </tr></thead>
          <tbody>{filtered.map(item=>(
            <tr key={item.id} style={{ borderBottom:"1px solid #F7F7F7" }}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{ padding:"12px 18px" }}><div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{item.name}</div><div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>{item.description}</div></td>
              <td style={{ padding:"12px 18px" }}><Tag color={typeColors[item.type]||"#888"}>{item.type||"—"}</Tag></td>
              <td style={{ padding:"12px 18px", fontSize:13, fontWeight:700, color:"#1A1A1A", textAlign:"right" }}>{fmt("£",item.rate)}</td>
              <td style={{ padding:"12px 18px", fontSize:13, color:"#888" }}>{item.unit}</td>
              {isVat && <td style={{ padding:"12px 18px", fontSize:13, color:"#888" }}>{item.taxRate}%</td>}
              <td style={{ padding:"12px 18px" }}>{item.cisApplicable?<Tag color="#D97706">CIS {item.cisLabourRate||"20%"}</Tag>:<span style={{ fontSize:12, color:"#CCC" }}>—</span>}</td>
              <td style={{ padding:"12px 18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <Switch checked={item.active} onChange={()=>toggleActive(item.id)} />
                  <span style={{ fontSize:12, color:item.active?"#16A34A":"#9CA3AF" }}>{item.active?"Active":"Inactive"}</span>
                </div>
              </td>
              <td style={{ padding:"12px 18px" }}><Btn onClick={()=>setModal({ mode:"edit", item })} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn></td>
            </tr>
          ))}
          {filtered.length===0 && <tr><td colSpan={8} style={{ padding:"40px 18px", textAlign:"center", color:"#CCC", fontSize:13 }}>No items. Click "New Item" to add one.</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && <ItemModal existing={modal.mode==="edit"?modal.item:null} onClose={()=>setModal(null)} onSave={onSave} />}
    </div>
  );
}

// ─── LINE ITEMS TABLE ─────────────────────────────────────────────────────────
function LineItemsTable({ items, onChange, currSymbol, catalogItems, isVat }) {
  const [pickerRow, setPickerRow] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const upd = (id, f, v) => onChange(items.map(it => {
    if(it.id!==id) return it;
    const u={...it,[f]:v};
    u.amount=Number(u.quantity)*Number(u.rate);
    return u;
  }));
  const applyItem = (rowId, ci) => {
    const descText = ci.description ? `${ci.name} — ${ci.description}` : ci.name;
    onChange(items.map(it => {
      if(it.id!==rowId) return it;
      return { ...it, description:descText, rate:ci.rate, tax_rate:isVat?(ci.taxRate||20):0, amount:Number(it.quantity)*Number(ci.rate) };
    }));
    setPickerRow(null); setPickerSearch("");
  };
  const add = () => onChange([...items, newLine(items.length)]);
  const del = id => items.length>1 && onChange(items.filter(i=>i.id!==id));
  const activeItems = (catalogItems||[]).filter(i=>i.active);
  const filteredCat = activeItems.filter(i=>!pickerSearch||i.name.toLowerCase().includes(pickerSearch.toLowerCase())||i.description?.toLowerCase().includes(pickerSearch.toLowerCase()));
  const cols = isVat ? "1fr 68px 84px 76px 74px 28px" : "1fr 68px 90px 80px 28px";
  const headers = isVat
    ? [["Description","left"],["Qty","center"],[`Rate (${currSymbol})`,"right"],["VAT","center"],["Amount","right"],["",""]]
    : [["Description","left"],["Qty","center"],[`Rate (${currSymbol})`,"right"],["Amount","right"],["",""]];
  return (
    <div>
      {activeItems.length>0 && (
        <div style={{ marginBottom:10, padding:"9px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, color:"#888" }}>Quick-add from items catalogue</span>
          <Btn onClick={()=>setPickerRow(items[items.length-1]?.id||null)} variant="outline" size="sm" icon={<Icons.Items />}>Browse Items</Btn>
        </div>
      )}
      {/* Global picker (not per-row) */}
      {pickerRow && (
        <div style={{ background:"#fff", border:"1.5px solid #1A1A1A", borderRadius:10, padding:"12px", marginBottom:12, boxShadow:"0 8px 24px rgba(0,0,0,0.1)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#1A1A1A" }}>Select Item to Add</span>
            <button onClick={()=>setPickerRow(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA" }}><Icons.X /></button>
          </div>
          <input value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)} placeholder="Search items…"
            style={{ width:"100%", padding:"7px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, outline:"none", marginBottom:8, boxSizing:"border-box" }} autoFocus />
          <div style={{ maxHeight:200, overflowY:"auto" }}>
            {filteredCat.length===0 && <div style={{ padding:"14px 0", textAlign:"center", color:"#CCC", fontSize:13 }}>No matching items</div>}
            {filteredCat.map(ci=>(
              <button key={ci.id} onClick={()=>{
                // Add as new line item
                const descText = ci.description ? `${ci.name} — ${ci.description}` : ci.name;
                const newItem = { id:crypto.randomUUID(), description:descText, quantity:1, rate:ci.rate, tax_rate:isVat?(ci.taxRate||20):0, amount:ci.rate, sort_order:items.length };
                onChange([...items, newItem]);
                setPickerRow(null); setPickerSearch("");
              }}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 10px", background:"none", border:"none", cursor:"pointer", borderRadius:7, textAlign:"left", fontFamily:ff }}
                onMouseEnter={e=>e.currentTarget.style.background="#F5F5F5"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>{ci.name}</div>
                  {ci.description && <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>{ci.description}</div>}
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{fmt(currSymbol, ci.rate)}</div>
                  <div style={{ fontSize:11, color:"#AAA" }}>{ci.unit}{isVat?` · ${ci.taxRate}% VAT`:""}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:cols, gap:6, paddingBottom:8, borderBottom:"1.5px solid #EBEBEB", marginBottom:8 }}>
        {headers.map(([h,a])=><div key={h} style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", textAlign:a }}>{h}</div>)}
      </div>
      {items.map((it,idx)=>(
        <div key={it.id} style={{ display:"grid", gridTemplateColumns:cols, gap:6, marginBottom:6, alignItems:"center" }}>
          <Input value={it.description} onChange={v=>upd(it.id,"description",v)} placeholder={`Item ${idx+1}…`} />
          <Input value={it.quantity} onChange={v=>upd(it.id,"quantity",v)} type="number" align="center" />
          <Input value={it.rate} onChange={v=>upd(it.id,"rate",v)} type="number" align="right" />
          {isVat && (
            <select value={it.tax_rate} onChange={e=>upd(it.id,"tax_rate",Number(e.target.value))}
              style={{ padding:"8px 4px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, background:"#FAFAFA", outline:"none", appearance:"none", textAlign:"center", cursor:"pointer", width:"100%" }}>
              {TAX_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
            </select>
          )}
          <div style={{ textAlign:"right", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{fmt(currSymbol,it.amount)}</div>
          <button onClick={()=>del(it.id)} disabled={items.length===1}
            style={{ width:26, height:26, border:"none", background:"none", cursor:items.length===1?"not-allowed":"pointer", color:"#DDD", display:"flex", alignItems:"center", justifyContent:"center" }}
            onMouseEnter={e=>{if(items.length>1)e.currentTarget.style.color="#DC2626";}} onMouseLeave={e=>e.currentTarget.style.color="#DDD"}>
            <Icons.Trash /></button>
        </div>
      ))}
      <Btn onClick={add} variant="ghost" size="sm" icon={<Icons.Plus />} style={{ marginTop:4, color:"#E86C4A" }}>Add Line Item</Btn>
    </div>
  );
}

function TotalsBlock({ subtotal, discountType, discountValue, setDiscountType, setDiscountValue, shipping, setShipping, taxBreakdown, total, currSymbol, isVat, cisDeduction }) {
  const discAmt = discountType==="percent"?subtotal*(Number(discountValue)/100):Math.min(Number(discountValue),subtotal);
  const R = ({ label, value, color }) => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0" }}>
      <span style={{ fontSize:13, color:color||"#666" }}>{label}</span>
      <span style={{ fontSize:13, color:color||"#444", fontWeight:500 }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background:"#FAFAFA", borderRadius:10, border:"1px solid #EBEBEB", padding:"14px 16px", minWidth:260 }}>
      <R label="Subtotal" value={fmt(currSymbol,subtotal)} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0" }}>
        <span style={{ fontSize:13, color:"#666" }}>Discount</span>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          <div style={{ display:"flex", border:"1.5px solid #E0E0E0", borderRadius:6, overflow:"hidden" }}>
            {[["percent","%"],["fixed",currSymbol]].map(([t,l])=>(
              <button key={t} onClick={()=>setDiscountType(t)}
                style={{ padding:"3px 8px", border:"none", background:discountType===t?"#1A1A1A":"transparent", color:discountType===t?"#fff":"#999", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:ff }}>{l}</button>
            ))}
          </div>
          <input value={discountValue} onChange={e=>setDiscountValue(e.target.value)} type="number" min="0"
            style={{ width:62, padding:"4px 6px", border:"1.5px solid #E0E0E0", borderRadius:6, fontSize:13, textAlign:"right", fontFamily:ff, background:"#fff", outline:"none" }} />
        </div>
      </div>
      {discAmt>0 && <R label="" value={`− ${fmt(currSymbol,discAmt)}`} color="#E86C4A" />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0" }}>
        <span style={{ fontSize:13, color:"#666" }}>Shipping</span>
        <input value={shipping} onChange={e=>setShipping(e.target.value)} type="number" min="0" placeholder="0.00"
          style={{ width:86, padding:"4px 6px", border:"1.5px solid #E0E0E0", borderRadius:6, fontSize:13, textAlign:"right", fontFamily:ff, background:"#fff", outline:"none" }} />
      </div>
      {isVat && taxBreakdown.map(tb=><R key={tb.rate} label={`VAT ${tb.rate}%`} value={fmt(currSymbol,tb.amount)} />)}
      {cisDeduction>0 && <R label="CIS Deduction" value={`− ${fmt(currSymbol,cisDeduction)}`} color="#D97706" />}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0 2px", borderTop:"2px solid #1A1A1A", marginTop:6 }}>
        <span style={{ fontSize:14, fontWeight:800, color:"#1A1A1A" }}>Total</span>
        <span style={{ fontSize:16, fontWeight:800, color:"#1A1A1A" }}>{fmt(currSymbol,total)}</span>
      </div>
      {cisDeduction>0 && (
        <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", marginTop:2 }}>
          <span style={{ fontSize:11, color:"#AAA" }}>Gross (before CIS)</span>
          <span style={{ fontSize:11, color:"#AAA" }}>{fmt(currSymbol,total+cisDeduction)}</span>
        </div>
      )}
    </div>
  );
}

function DocPreview({ data, currSymbol, docType="Invoice", isVat }) {
  const { docNumber, customer, dueDate, items, subtotal, discountAmount, shipping, taxBreakdown, total, notes, terms, status, cisDeduction } = data;
  return (
    <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", overflow:"hidden", boxShadow:"0 2px 16px rgba(0,0,0,0.06)", fontFamily:ff }}>
      <div style={{ background:"#1A1A1A", padding:"18px 22px", color:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>AI Invoice</div>
            <div style={{ fontSize:17, fontWeight:800 }}>{docType.toUpperCase()}</div>
            <div style={{ fontSize:12, color:"#E86C4A", fontWeight:700, marginTop:1 }}>{docNumber||`${docType.slice(0,3).toUpperCase()}-0001`}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <Tag color={STATUS_COLORS[status]||"#6B7280"}>{status||"Draft"}</Tag>
            <div style={{ marginTop:5, fontSize:10, color:"rgba(255,255,255,0.4)" }}>{docType==="Quote"?"Expires":"Due"}: <span style={{ color:"#fff" }}>{fmtDate(dueDate)}</span></div>
          </div>
        </div>
      </div>
      <div style={{ padding:"16px 22px" }}>
        <div style={{ marginBottom:14, paddingBottom:12, borderBottom:"1px solid #F0F0F0" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:4 }}>Bill To</div>
          {customer?(<><div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{customer.name}</div><div style={{ fontSize:11, color:"#888", marginTop:1 }}>{customer.email}</div></>):<div style={{ fontSize:12, color:"#CCC", fontStyle:"italic" }}>Select a customer…</div>}
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12 }}>
          <thead><tr style={{ borderBottom:"1.5px solid #EBEBEB" }}>
            {["Description","Qty","Rate",...(isVat?["VAT"]:[]),"Amount"].map((h,i)=><th key={h} style={{ padding:"4px 0 6px", textAlign:i>0?"right":"left", fontSize:9, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>)}
          </tr></thead>
          <tbody>{items.filter(i=>i.description||i.amount>0).map((it,idx)=>(
            <tr key={it.id} style={{ borderBottom:"1px solid #F7F7F7" }}>
              <td style={{ padding:"6px 0", fontSize:11, color:"#1A1A1A" }}>{it.description||<span style={{ color:"#CCC" }}>Item {idx+1}</span>}</td>
              <td style={{ padding:"6px 0", fontSize:11, color:"#666", textAlign:"right" }}>{it.quantity}</td>
              <td style={{ padding:"6px 0", fontSize:11, color:"#666", textAlign:"right" }}>{fmt(currSymbol,it.rate)}</td>
              {isVat && <td style={{ padding:"6px 0", fontSize:11, color:"#666", textAlign:"right" }}>{it.tax_rate}%</td>}
              <td style={{ padding:"6px 0", fontSize:11, fontWeight:700, color:"#1A1A1A", textAlign:"right" }}>{fmt(currSymbol,it.amount)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <div style={{ minWidth:190 }}>
            {[["Subtotal",fmt(currSymbol,subtotal)],
              ...(discountAmount>0?[["Discount",`− ${fmt(currSymbol,discountAmount)}`,"#E86C4A"]]:[]),
              ...(Number(shipping)>0?[["Shipping",fmt(currSymbol,shipping)]]:[]),
              ...(isVat?taxBreakdown.map(tb=>[`VAT ${tb.rate}%`,fmt(currSymbol,tb.amount)]):[]),
            ].map(([l,v,c])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", gap:20, padding:"2px 0" }}>
                <span style={{ fontSize:11, color:"#888" }}>{l}</span>
                <span style={{ fontSize:11, color:c||"#555" }}>{v}</span>
              </div>
            ))}
            {(cisDeduction||0)>0 && (<>
              <div style={{ display:"flex", justifyContent:"space-between", gap:20, padding:"5px 0 2px", borderTop:"1.5px solid #EBEBEB", marginTop:3 }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#555" }}>Gross Total</span>
                <span style={{ fontSize:11, fontWeight:700, color:"#555" }}>{fmt(currSymbol,total+cisDeduction)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", gap:20, padding:"2px 0" }}>
                <span style={{ fontSize:11, color:"#D97706" }}>CIS Deduction</span>
                <span style={{ fontSize:11, color:"#D97706" }}>{`− ${fmt(currSymbol,cisDeduction)}`}</span>
              </div>
            </>)}
            <div style={{ display:"flex", justifyContent:"space-between", gap:20, padding:"7px 0 2px", borderTop:"2px solid #1A1A1A", marginTop:4 }}>
              <span style={{ fontSize:13, fontWeight:800, color:"#1A1A1A" }}>Total Due</span>
              <span style={{ fontSize:13, fontWeight:800, color:"#1A1A1A" }}>{fmt(currSymbol,total)}</span>
            </div>
          </div>
        </div>
        {(notes||terms)&&<div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #F0F0F0" }}>
          {notes&&<div style={{ marginBottom:6 }}><div style={{ fontSize:9, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:2 }}>Notes</div><p style={{ fontSize:11, color:"#666", margin:0, lineHeight:1.6 }}>{notes}</p></div>}
          {terms&&<div><div style={{ fontSize:9, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:2 }}>Terms</div><p style={{ fontSize:11, color:"#666", margin:0, lineHeight:1.6 }}>{terms}</p></div>}
        </div>}
      </div>
    </div>
  );
}

// ─── SAVE SPLIT BUTTON ────────────────────────────────────────────────────────
function SaveSplitBtn({ onSave, onSaveAndSend, onSaveAndPrint, saving }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    const h = e=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h);
  },[]);
  return (
    <div ref={ref} style={{ position:"relative", display:"flex" }}>
      <button onClick={()=>{ onSave(); setOpen(false); }} disabled={saving}
        style={{ padding:"8px 14px", background:"#1A1A1A", color:"#fff", border:"none", borderRight:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px 0 0 8px", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:ff, display:"flex", alignItems:"center", gap:6, opacity:saving?0.6:1 }}>
        <Icons.Save />{saving?"Saving…":"Save"}
      </button>
      <button onClick={()=>setOpen(o=>!o)} disabled={saving}
        style={{ padding:"8px 9px", background:"#1A1A1A", color:"#fff", border:"none", borderRadius:"0 8px 8px 0", fontSize:13, cursor:saving?"not-allowed":"pointer", display:"flex", alignItems:"center", opacity:saving?0.6:1 }}>
        <Icons.ChevDown />
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, background:"#fff", border:"1.5px solid #E0E0E0", borderRadius:9, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", minWidth:160, zIndex:500, overflow:"hidden" }}>
          {[
            { label:"Save", icon:<Icons.Save />, action:onSave },
            { label:"Save & Send", icon:<Icons.Send />, action:onSaveAndSend },
            { label:"Save & Print", icon:<Icons.Receipt />, action:onSaveAndPrint },
          ].map(item=>(
            <button key={item.label} onClick={()=>{ item.action(); setOpen(false); }}
              style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", display:"flex", alignItems:"center", gap:9, fontSize:13, fontWeight:600, color:"#1A1A1A", cursor:"pointer", fontFamily:ff, textAlign:"left" }}
              onMouseEnter={e=>e.currentTarget.style.background="#F7F7F5"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <span style={{ color:"#888" }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PAID CONFIRM MODAL ───────────────────────────────────────────────────────
function PaidConfirmModal({ invoice, onConfirm, onCancel }) {
  const { customPayMethods } = useContext(AppCtx);
  const allMethods = [...PAYMENT_METHODS, ...customPayMethods];
  const [payDate, setPayDate] = useState(todayStr());
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payRef, setPayRef] = useState("");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:3000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,0.18)", fontFamily:ff, overflow:"hidden" }}>
        <div style={{ background:"#F0FDF4", padding:"18px 22px 14px", borderBottom:"1px solid #BBF7D0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:"#16A34A", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}><Icons.Check /></div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"#15803D" }}>Mark as Paid</div>
              <div style={{ fontSize:12, color:"#16A34A", marginTop:1 }}>{invoice.invoice_number} · {fmt(CUR_SYM[invoice.currency]||"£", invoice.total)}</div>
            </div>
          </div>
        </div>
        <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <p style={{ margin:0, fontSize:13, color:"#555", lineHeight:1.6 }}>Confirm payment details. A record will be automatically added to <strong>Payments Received</strong>.</p>
          <Field label="Payment Date" required>
            <input value={payDate} onChange={e=>setPayDate(e.target.value)} type="date"
              style={{ width:"100%", padding:"9px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
          </Field>
          <Field label="Payment Method" required>
            <Select value={payMethod} onChange={setPayMethod} options={allMethods} />
          </Field>
          <Field label="Reference (optional)">
            <Input value={payRef} onChange={setPayRef} placeholder="Bank ref, transaction ID…" />
          </Field>
        </div>
        <div style={{ padding:"12px 22px 18px", display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn onClick={onCancel} variant="outline">Cancel</Btn>
          <Btn onClick={()=>onConfirm({ date:payDate, method:payMethod, reference:payRef })} variant="primary" icon={<Icons.Check />}>Confirm Payment</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── A4 INVOICE DOCUMENT (multi-template, for print/email) ───────────────────
function A4InvoiceDoc({ data, currSymbol, isVat, orgSettings, accentColor, template="classic", footerText="" }) {
  const { docNumber, customer, issueDate, dueDate, paymentTerms, items, subtotal, discountAmount, shipping, taxBreakdown, cisDeduction, total, notes, terms } = data;
  const sym = currSymbol||"£";
  const org = orgSettings||{};
  // Default accent per template if not overridden
  const tplDef = PDF_TEMPLATES.find(t=>t.id===template)||PDF_TEMPLATES[0];
  const accent = accentColor || tplDef.defaultAccent;
  const addrParts = [org.street, org.city, [org.postcode, org.state].filter(Boolean).join(" "), org.country].filter(Boolean);

  const OrgBlock = () => (
    <div>
      {org.logo && <img src={org.logo} alt="logo" style={{ maxHeight:52, maxWidth:160, objectFit:"contain", display:"block", marginBottom:5 }} />}
      <div style={{ fontSize:"15pt", fontWeight:900, color: template==="modern" ? "#fff" : accent, letterSpacing:"-0.01em" }}>{org.orgName||"Your Company"}</div>
      {addrParts.length>0 && (
        <div style={{ fontSize:"7.5pt", color: template==="modern" ? "rgba(255,255,255,0.75)" : "#666", marginTop:3, lineHeight:1.8 }}>
          {addrParts.map((line,i)=><div key={i}>{line}</div>)}
        </div>
      )}
      {org.vatNum && <div style={{ fontSize:"7.5pt", color: template==="modern" ? "rgba(255,255,255,0.6)" : "#AAA", marginTop:2 }}>VAT No: {org.vatNum}</div>}
    </div>
  );

  const InvoiceMetaBlock = ({ dark=false }) => (
    <div>
      <div style={{ fontSize:"7pt", fontWeight:700, color:dark?"rgba(255,255,255,0.5)":"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"3mm" }}>Invoice Details</div>
      {[["Invoice No", docNumber||"INV-0001"],["Issue Date", fmtDate(issueDate)],["Due Date", fmtDate(dueDate)],["Payment Terms", paymentTerms||"Net 30"]].map(([l,v])=>(
        <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"1.5mm 0", borderBottom:`1px solid ${dark?"rgba(255,255,255,0.12)":"#F0F0F0"}` }}>
          <span style={{ fontSize:"8.5pt", color:dark?"rgba(255,255,255,0.6)":"#888" }}>{l}</span>
          <span style={{ fontSize:"8.5pt", fontWeight:700, color:dark?"#fff":"#1A1A1A" }}>{v}</span>
        </div>
      ))}
    </div>
  );

  const BillToBlock = ({ dark=false }) => (
    <div>
      <div style={{ fontSize:"7pt", fontWeight:700, color:dark?"rgba(255,255,255,0.5)":"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"3mm" }}>Bill To</div>
      {customer ? (<>
        <div style={{ fontWeight:700, fontSize:"11pt", color:dark?"#fff":"#1A1A1A" }}>{customer.name}</div>
        {customer.companyName && customer.companyName!==customer.name && <div style={{ fontSize:"9pt", color:dark?"rgba(255,255,255,0.7)":"#555", marginTop:1 }}>{customer.companyName}</div>}
        {customer.email && <div style={{ fontSize:"8.5pt", color:dark?"rgba(255,255,255,0.6)":"#666", marginTop:2 }}>{customer.email}</div>}
        {customer.phone && <div style={{ fontSize:"8.5pt", color:dark?"rgba(255,255,255,0.6)":"#666" }}>{customer.phone}</div>}
        {customer.billingAddress && (
          <div style={{ fontSize:"8.5pt", color:dark?"rgba(255,255,255,0.6)":"#666", marginTop:3, lineHeight:1.7 }}>
            {[customer.billingAddress.street, customer.billingAddress.city, [customer.billingAddress.postcode, customer.billingAddress.county].filter(Boolean).join(" "), customer.billingAddress.country].filter(Boolean).map((l,i)=><div key={i}>{l}</div>)}
          </div>
        )}
      </>) : <div style={{ fontSize:"9pt", color:"#CCC", fontStyle:"italic" }}>No customer selected</div>}
    </div>
  );

  const ItemsTable = ({ headerBg=accent, headerColor="#fff", stripeBg="#FAFAFA" }) => (
    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"5mm" }}>
      <thead>
        <tr style={{ background:headerBg }}>
          {["Description","Qty","Unit Price",...(isVat?["VAT"]:[]),"Amount"].map((h,i)=>(
            <th key={h} style={{ padding:"2.5mm 3mm", textAlign:i>0?"right":"left", fontSize:"7.5pt", fontWeight:700, color:headerColor, letterSpacing:"0.04em" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.filter(it=>it.description||it.amount>0).map((it,idx)=>(
          <tr key={it.id} style={{ background:idx%2===0?stripeBg:"#fff" }}>
            <td style={{ padding:"2.5mm 3mm", fontSize:"9pt" }}>{it.description||`Item ${idx+1}`}</td>
            <td style={{ padding:"2.5mm 3mm", fontSize:"9pt", textAlign:"right", color:"#666" }}>{it.quantity}</td>
            <td style={{ padding:"2.5mm 3mm", fontSize:"9pt", textAlign:"right", color:"#666" }}>{fmt(sym,it.rate)}</td>
            {isVat && <td style={{ padding:"2.5mm 3mm", fontSize:"9pt", textAlign:"right", color:"#888" }}>{it.tax_rate}%</td>}
            <td style={{ padding:"2.5mm 3mm", fontSize:"9pt", fontWeight:700, textAlign:"right" }}>{fmt(sym,it.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const TotalsBlock = () => (
    <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"5mm" }}>
      <div style={{ minWidth:"62mm" }}>
        {[["Subtotal",fmt(sym,subtotal)],
          ...(discountAmount>0?[["Discount",`− ${fmt(sym,discountAmount)}`,"#E86C4A"]]:[]),
          ...(Number(shipping)>0?[["Shipping",fmt(sym,shipping)]]:[]),
          ...(isVat?taxBreakdown.map(tb=>[`VAT ${tb.rate}%`,fmt(sym,tb.amount)]):[]),
          ...((cisDeduction||0)>0?[["CIS Deduction",`− ${fmt(sym,cisDeduction)}`,"#D97706"]]:[]),
        ].map(([l,v,c])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", gap:"8mm", padding:"1.5mm 0", borderBottom:"1px solid #F4F4F4" }}>
            <span style={{ fontSize:"8.5pt", color:"#888" }}>{l}</span>
            <span style={{ fontSize:"8.5pt", color:c||"#555" }}>{v}</span>
          </div>
        ))}
        {(cisDeduction||0)>0 && (<>
          <div style={{ display:"flex", justifyContent:"space-between", gap:"8mm", padding:"1.5mm 0", borderTop:"1px solid #F4F4F4", marginTop:2 }}>
            <span style={{ fontSize:"8.5pt", color:"#555", fontWeight:600 }}>Gross Total</span>
            <span style={{ fontSize:"8.5pt", fontWeight:700, color:"#555" }}>{fmt(sym,total+cisDeduction)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", gap:"8mm", padding:"1.5mm 0" }}>
            <span style={{ fontSize:"8.5pt", color:"#D97706", fontWeight:600 }}>CIS Deduction</span>
            <span style={{ fontSize:"8.5pt", fontWeight:700, color:"#D97706" }}>{`− ${fmt(sym,cisDeduction)}`}</span>
          </div>
        </>)}
        <div style={{ display:"flex", justifyContent:"space-between", gap:"8mm", padding:"3mm 4mm 2mm", background:accent, borderRadius:4, marginTop:2 }}>
          <span style={{ fontSize:"10pt", fontWeight:800, color:"#fff" }}>Total Due</span>
          <span style={{ fontSize:"11pt", fontWeight:900, color:"#fff" }}>{fmt(sym,total)}</span>
        </div>
        )}
      </div>
    </div>
  );

  const NotesBlock = () => (notes||terms) ? (
    <div style={{ borderTop:"1px solid #EBEBEB", paddingTop:"4mm", display:"grid", gridTemplateColumns:notes&&terms?"1fr 1fr":"1fr", gap:"6mm" }}>
      {notes && <div><div style={{ fontSize:"7pt", fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"2mm" }}>Notes</div><p style={{ fontSize:"8pt", color:"#555", margin:0, lineHeight:1.7 }}>{notes}</p></div>}
      {terms && <div><div style={{ fontSize:"7pt", fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"2mm" }}>Payment Terms</div><p style={{ fontSize:"8pt", color:"#555", margin:0, lineHeight:1.7 }}>{terms}</p></div>}
    </div>
  ) : null;

  const FooterBar = () => (
    <div style={{ position:"absolute", bottom:"10mm", left:"18mm", right:"18mm", borderTop:"1px solid #EBEBEB", paddingTop:"2.5mm" }}>
      {footerText
        ? <div style={{ fontSize:"7pt", color:"#888", textAlign:"center", lineHeight:1.6 }}>{footerText}</div>
        : <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:"7pt", color:"#CCC" }}>{org.orgName||""}{org.vatNum?` · VAT ${org.vatNum}`:""}{org.crn?` · CRN ${org.crn}`:""}</span>
            <span style={{ fontSize:"7pt", color:"#CCC" }}>{org.email||""}</span>
          </div>
      }
    </div>
  );

  const base = { width:"210mm", minHeight:"297mm", background:"#fff", fontFamily:ff, boxSizing:"border-box", fontSize:"10pt", color:"#1A1A1A", position:"relative" };

  // ── CLASSIC: ruled lines, black header bar ────────────────────────────────
  if(template==="classic") return (
    <div id="a4-invoice-doc" style={{ ...base, padding:"0" }}>
      <div style={{ background:accent, padding:"14mm 18mm 10mm", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <OrgBlock />
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"22pt", fontWeight:900, color:"#fff", letterSpacing:"0.04em" }}>INVOICE</div>
          <div style={{ fontSize:"12pt", color:"rgba(255,255,255,0.8)", fontWeight:700, marginTop:2 }}>{docNumber||"INV-0001"}</div>
        </div>
      </div>
      <div style={{ padding:"8mm 18mm 14mm" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8mm", marginBottom:"8mm", paddingBottom:"6mm", borderBottom:`2px solid ${accent}` }}>
          <BillToBlock />
          <InvoiceMetaBlock />
        </div>
        <ItemsTable headerBg={accent} headerColor="#fff" stripeBg="#F8F8F8" />
        <TotalsBlock />
        <NotesBlock />
      </div>
      <FooterBar />
    </div>
  );

  // ── MODERN: blue split panel, white right ─────────────────────────────────
  if(template==="modern") return (
    <div id="a4-invoice-doc" style={{ ...base, display:"flex", flexDirection:"column", padding:0 }}>
      <div style={{ display:"grid", gridTemplateColumns:"42% 58%" }}>
        {/* Left dark panel */}
        <div style={{ background:accent, padding:"14mm 12mm 10mm 14mm", minHeight:"62mm" }}>
          <OrgBlock />
          <div style={{ marginTop:"8mm" }}><BillToBlock dark={true} /></div>
        </div>
        {/* Right panel */}
        <div style={{ padding:"14mm 14mm 10mm 12mm", background:"#fff", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"28pt", fontWeight:900, color:accent, letterSpacing:"-0.02em", lineHeight:1 }}>INVOICE</div>
            <div style={{ fontSize:"12pt", fontWeight:700, color:"#555", marginTop:3, marginBottom:"6mm" }}>{docNumber||"INV-0001"}</div>
            <InvoiceMetaBlock />
          </div>
        </div>
      </div>
      <div style={{ padding:"8mm 14mm 14mm" }}>
        <ItemsTable headerBg={`${accent}18`} headerColor={accent} stripeBg="#F0F7FF" />
        <TotalsBlock />
        <NotesBlock />
      </div>
      <FooterBar />
    </div>
  );

  // ── MINIMAL: sage green accents, clean white ──────────────────────────────
  if(template==="minimal") return (
    <div id="a4-invoice-doc" style={{ ...base, padding:"14mm 18mm 16mm" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8mm" }}>
        <OrgBlock />
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"10pt", fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.14em" }}>Invoice</div>
          <div style={{ fontSize:"18pt", fontWeight:900, color:accent, marginTop:1 }}>{docNumber||"INV-0001"}</div>
        </div>
      </div>
      <div style={{ height:2, background:`linear-gradient(90deg,${accent},${accent}44)`, marginBottom:"7mm", borderRadius:1 }} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8mm", marginBottom:"7mm" }}>
        <BillToBlock />
        <InvoiceMetaBlock />
      </div>
      <ItemsTable headerBg={`${accent}15`} headerColor={accent} stripeBg="#FAFAFA" />
      <TotalsBlock />
      <NotesBlock />
      <FooterBar />
    </div>
  );

  // ── BRANDED: terracotta, full-bleed colour strip ──────────────────────────
  if(template==="branded") return (
    <div id="a4-invoice-doc" style={{ ...base, padding:0 }}>
      {/* Full-bleed top band */}
      <div style={{ background:`linear-gradient(135deg,${accent} 0%,${accent}BB 100%)`, padding:"12mm 18mm 8mm", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
        <div style={{ position:"absolute", bottom:-40, right:40, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative" }}>
          <OrgBlock />
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"24pt", fontWeight:900, color:"#fff", letterSpacing:"0.02em" }}>INVOICE</div>
            <div style={{ fontSize:"12pt", fontWeight:700, color:"rgba(255,255,255,0.75)", marginTop:2 }}>{docNumber||"INV-0001"}</div>
          </div>
        </div>
      </div>
      {/* Info strip */}
      <div style={{ background:tplDef.defaultBg||"#FFF7F4", padding:"6mm 18mm 5mm", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10mm", borderBottom:`3px solid ${accent}` }}>
        <BillToBlock />
        <InvoiceMetaBlock />
      </div>
      {/* Body */}
      <div style={{ padding:"7mm 18mm 14mm" }}>
        <ItemsTable headerBg={`${accent}22`} headerColor={accent} stripeBg="#FFFAF8" />
        <TotalsBlock />
        <NotesBlock />
      </div>
      <FooterBar />
    </div>
  );

  // Fallback
  return <div>Template not found</div>;
}

// ─── A4 PRINT MODAL ───────────────────────────────────────────────────────────
function A4PrintModal({ data, currSymbol, isVat, onClose }) {
  const { orgSettings } = useContext(AppCtx);
  // Read pdfTemplate from context (via App root) — fallback to classic
  const ctxFull = useContext(AppCtx);
  const pdfTemplate = ctxFull.pdfTemplate||"classic";
  const tplDef = PDF_TEMPLATES.find(t=>t.id===pdfTemplate)||PDF_TEMPLATES[0];
  const [accentColor, setAccentColor] = useState(tplDef.defaultAccent);
  const [activeTemplate, setActiveTemplate] = useState(pdfTemplate);

  // When template tab changes, update accent to that template's default
  const switchTemplate = (id) => {
    setActiveTemplate(id);
    setAccentColor(PDF_TEMPLATES.find(t=>t.id===id)?.defaultAccent||"#1A1A1A");
  };

  const handlePrint = () => {
    const el = document.getElementById("a4-invoice-doc");
    if(!el) return;
    const w = window.open("","_blank","width=900,height=700");
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${data.docNumber||""}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
        body{background:#fff;font-family:'Instrument Sans','DM Sans','Helvetica Neue',sans-serif}
        @page{size:A4;margin:0}
        @media print{body{margin:0}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}}
      </style>
    </head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(()=>{ w.focus(); w.print(); },400);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", zIndex:4000, overflowY:"auto", padding:"16px 16px 40px" }}>
      {/* Toolbar */}
      <div style={{ width:"100%", maxWidth:820, background:"#1A1A1A", borderRadius:"12px 12px 0 0", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Print Preview — A4</span>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.08)", padding:"3px 8px", borderRadius:5 }}>
            {PDF_TEMPLATES.find(t=>t.id===activeTemplate)?.name||"Classic"}
          </span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={onClose}
            style={{ padding:"7px 14px", borderRadius:8, border:"1.5px solid rgba(255,255,255,0.3)", background:"transparent", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:ff }}>
            Close
          </button>
          <Btn onClick={handlePrint} variant="accent" icon={<Icons.Receipt />}>Print</Btn>
        </div>
      </div>
      {/* A4 sheet */}
      <div style={{ width:"100%", maxWidth:820, background:"#fff", boxShadow:"0 8px 40px rgba(0,0,0,0.35)", overflow:"hidden" }}>
        <A4InvoiceDoc data={data} currSymbol={currSymbol} isVat={isVat} orgSettings={orgSettings} accentColor={accentColor} template={activeTemplate} />
      </div>
    </div>
  );
}

// ─── INVOICE FORM ─────────────────────────────────────────────────────────────
function InvoiceForm({ existing, invoices, onSave, onCancel }) {
  const { orgSettings, catalogItems, customers, quotes, payments, setPayments } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const [invoiceNumber, setInvoiceNumber] = useState(existing?.invoice_number||nextNum("INV",invoices.map(i=>i.invoice_number)));
  const [customer, setCustomer] = useState(existing ? (customers||[]).find(c=>c.id===existing.customer_id)||null : null);
  const [issueDate, setIssueDate] = useState(existing?.issue_date||todayStr());
  const [paymentTerms, setPaymentTerms] = useState(existing?.payment_terms||"Net 30");
  const [customDays, setCustomDays] = useState(existing?.custom_payment_days||"");
  const [dueDate, setDueDate] = useState(existing?.due_date||addDays(todayStr(),30));
  const [currency, setCurrency] = useState(existing?.currency||"GBP");
  const [status, setStatus] = useState(existing?.status||"Draft");
  const [items, setItems] = useState(existing?.line_items?.length?existing.line_items:[newLine(0)]);
  const [discountType, setDiscountType] = useState(existing?.discount_type||"percent");
  const [discountValue, setDiscountValue] = useState(existing?.discount_value||0);
  const [shipping, setShipping] = useState(existing?.shipping||0);
  const [notes, setNotes] = useState(existing?.notes||"");
  const [terms, setTerms] = useState(existing?.terms||DEFAULT_INV_TERMS);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState("Monthly");
  const [recurringNextDate, setRecurringNextDate] = useState(existing?.recurring_next_date||addDays(todayStr(),30));
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showQuotePicker, setShowQuotePicker] = useState(false);
  const [fromQuote, setFromQuote] = useState(existing?.from_quote||null);

  const importFromQuote = (q) => {
    const c=(customers||[]).find(x=>x.id===q.customer_id)||null;
    setCustomer(c);
    if(c?.paymentTerms){ setPaymentTerms(c.paymentTerms); if(c.paymentTerms==="Custom") setCustomDays(c.customPaymentDays||"30"); }
    setCurrency(q.currency||"GBP");
    setItems(q.line_items?.length ? q.line_items.map(i=>({...i,id:crypto.randomUUID()})) : [newLine(0)]);
    setDiscountType(q.discount_type||"percent");
    setDiscountValue(q.discount_value||0);
    setShipping(q.shipping||0);
    setNotes(q.notes||"");
    setFromQuote(q.quote_number);
    setShowQuotePicker(false);
  };

  useEffect(()=>{
    const map={"Due on Receipt":0,"Net 7":7,"Net 14":14,"Net 30":30,"Net 60":60,"Net 90":90};
    if(paymentTerms in map) setDueDate(addDays(issueDate,map[paymentTerms]));
    else if(paymentTerms==="Custom"&&customDays) setDueDate(addDays(issueDate,Number(customDays)));
  },[paymentTerms,customDays,issueDate]);

  useEffect(()=>{
    if(!isVat) setItems(p=>p.map(i=>({ ...i, tax_rate:0 })));
  },[isVat]);

  const currSymbol=CUR_SYM[currency]||"£";
  const subtotal=items.reduce((s,i)=>s+Number(i.amount),0);
  const discountAmount=discountType==="percent"?subtotal*(Number(discountValue)/100):Math.min(Number(discountValue),subtotal);
  const taxBreakdown=isVat?TAX_RATES.filter(r=>r>0).map(rate=>({ rate, amount:items.filter(i=>Number(i.tax_rate)===rate).reduce((s,i)=>s+i.amount*(rate/100),0) })).filter(tb=>tb.amount>0):[];
  const taxTotal=taxBreakdown.reduce((s,tb)=>s+tb.amount,0);
  const cisApplicableItems = items.filter(it=>{ const ci = catalogItems?.find(c=>c.name===it.description); return ci?.cisApplicable; });
  const cisDeduction = cisApplicableItems.reduce((s,it)=>{ const ci = catalogItems?.find(c=>c.name===it.description); const rate = ci?.cisLabourRate ? parseFloat(ci.cisLabourRate)/100 : 0.2; return s + it.amount * rate; }, 0);
  const totalBeforeCIS=(subtotal-discountAmount)+Number(shipping)+taxTotal;
  const total=totalBeforeCIS-cisDeduction;

  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [showA4Print, setShowA4Print] = useState(false);

  // Intercept status → Paid to collect payment info
  const handleStatusChange = (newStatus) => {
    if(newStatus==="Paid" && status!=="Paid") { setShowPaidConfirm(true); }
    else setStatus(newStatus);
  };

  const doSave = async (forceStatus, afterSave) => {
    setSaving(true);
    const finalStatus = forceStatus !== undefined ? forceStatus : status;
    const payload={ invoice_number:invoiceNumber, customer_id:customer?.id||null, customer_name:customer?.name||"", issue_date:issueDate, due_date:dueDate, payment_terms:paymentTerms, custom_payment_days:customDays, status:finalStatus, currency, subtotal, discount_type:discountType, discount_value:Number(discountValue), discount_amount:discountAmount, shipping:Number(shipping), tax_total:taxTotal, cis_deduction:cisDeduction, total, notes, terms, from_quote:fromQuote };
    try { if(existing?.id) await sbFetch("PATCH",`invoices?id=eq.${existing.id}`,payload); else await sbFetch("POST","invoices",payload); } catch {}
    setSaveMsg("Saved!");
    const saved = { ...payload, id:existing?.id||crypto.randomUUID(), line_items:items };
    onSave(saved);
    setSaving(false); setTimeout(()=>setSaveMsg(""),2000);
    if(afterSave) afterSave(saved);
  };

  const previewData={ docNumber:invoiceNumber, customer, issueDate, dueDate, paymentTerms, currency, status, items, subtotal, discountAmount, shipping, taxBreakdown, cisDeduction, total, notes, terms };

  return (
    <div style={{ padding:"clamp(12px,3vw,24px) clamp(12px,4vw,30px)", maxWidth:860, fontFamily:ff }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div><h1 style={{ fontSize:22, fontWeight:800, color:"#1A1A1A", margin:"0 0 2px" }}>{existing?"Edit "+invoiceNumber:"New Invoice"}</h1><p style={{ color:"#AAA", fontSize:12, margin:0 }}>Fill in the details below</p></div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          {saveMsg && <span style={{ fontSize:12, color:"#16A34A", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}><Icons.Check />{saveMsg}</span>}
          <Btn onClick={onCancel} variant="outline">Cancel</Btn>
          <Btn onClick={()=>setShowPreview(true)} variant="outline" icon={<Icons.Eye />}>Preview</Btn>
          {/* Print standalone */}
          <Btn onClick={()=>setShowA4Print(true)} variant="outline" icon={<Icons.Receipt />}>Print</Btn>
          {/* Save dropdown group */}
          <SaveSplitBtn
            onSave={()=>doSave()}
            onSaveAndSend={()=>doSave("Sent")}
            onSaveAndPrint={()=>{ doSave(undefined, ()=>setShowA4Print(true)); }}
            saving={saving}
          />
        </div>
      </div>
      <SectionCard title="Invoice Details">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <Field label="Invoice Number" required><Input value={invoiceNumber} onChange={setInvoiceNumber} /></Field>
          <Field label="Issue Date" required><Input value={issueDate} onChange={setIssueDate} type="date" /></Field>
          <Field label="Status">
            <Select value={status} onChange={handleStatusChange} options={["Draft","Sent","Paid","Overdue","Void"]} />
          </Field>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:10 }}>
          <Field label="Payment Terms">
            <PaymentTermsField value={paymentTerms} onChange={setPaymentTerms} customDays={customDays} onCustomDaysChange={setCustomDays} />
          </Field>
          <Field label="Due Date"><Input value={dueDate} onChange={setDueDate} type="date" /></Field>
          <Field label="Currency"><Select value={currency} onChange={setCurrency} options={Object.keys(CUR_SYM).map(k=>({ value:k, label:`${k} (${CUR_SYM[k]})` }))} /></Field>
        </div>
      </SectionCard>
      <SectionCard title="Bill To">
        {fromQuote && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 11px", background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:8, marginBottom:10, fontSize:12 }}>
            <Icons.Check /><span style={{ color:"#16A34A", fontWeight:700 }}>Imported from {fromQuote}</span>
            <button onClick={()=>setFromQuote(null)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", fontSize:11 }}>Clear</button>
          </div>
        )}
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <div style={{ flex:1 }}>
            <Select value={customer?.id||""} onChange={id=>{
              const c=(customers||[]).find(x=>x.id===id)||null;
              setCustomer(c);
              if(c?.paymentTerms) {
                setPaymentTerms(c.paymentTerms);
                if(c.paymentTerms==="Custom") setCustomDays(c.customPaymentDays||"30");
              }
            }} options={(customers||[]).map(c=>({ value:c.id, label:c.name }))} placeholder="Select a customer…" />
          </div>
          {(quotes||[]).filter(q=>q.status!=="Void").length>0 && (
            <Btn onClick={()=>setShowQuotePicker(true)} variant="outline" size="sm" icon={<Icons.Quotes />} style={{ whiteSpace:"nowrap" }}>Import Quote</Btn>
          )}
        </div>
        {customer && <div style={{ padding:"9px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{customer.name}</div>
            <div style={{ fontSize:12, color:"#888", marginTop:1 }}>{customer.email}</div>
          </div>
          {customer.paymentTerms && <div style={{ fontSize:11, color:"#888", background:"#F0F0F0", padding:"3px 9px", borderRadius:20 }}>{customer.paymentTerms}</div>}
        </div>}
        {/* Quote picker modal */}
        {showQuotePicker && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:3000, padding:20 }}>
            <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:560, maxHeight:"80vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.18)", fontFamily:ff, overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 22px", borderBottom:"1px solid #F0F0F0" }}>
                <div><div style={{ fontSize:15, fontWeight:800, color:"#1A1A1A" }}>Import from Quote</div><div style={{ fontSize:12, color:"#AAA", marginTop:2 }}>Select a quote to pre-fill this invoice</div></div>
                <button onClick={()=>setShowQuotePicker(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA" }}><Icons.X /></button>
              </div>
              <div style={{ overflowY:"auto", padding:"8px 0" }}>
                {(quotes||[]).filter(q=>q.status!=="Void").map(q=>(
                  <button key={q.id} onClick={()=>importFromQuote(q)}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 22px", background:"none", border:"none", cursor:"pointer", textAlign:"left", fontFamily:ff, borderBottom:"1px solid #F7F7F7" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#F9F9F9"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{q.quote_number}</span>
                        <Tag color={STATUS_COLORS[q.status]||"#888"}>{q.status}</Tag>
                        {q.converted_to_invoice && <span style={{ fontSize:10, color:"#16A34A", fontWeight:600 }}>→ {q.converted_to_invoice}</span>}
                      </div>
                      <div style={{ fontSize:12, color:"#888", marginTop:3 }}>{q.customer_name} · {fmtDate(q.issue_date)}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{fmt("£", q.total||0)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>
      <SectionCard title="Line Items">
        <LineItemsTable items={items} onChange={setItems} currSymbol={currSymbol} catalogItems={catalogItems} isVat={isVat} />
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16 }}>
          <TotalsBlock subtotal={subtotal} discountType={discountType} discountValue={discountValue} setDiscountType={setDiscountType} setDiscountValue={setDiscountValue} shipping={shipping} setShipping={setShipping} taxBreakdown={taxBreakdown} total={total} currSymbol={currSymbol} isVat={isVat} cisDeduction={cisDeduction} />
        </div>
      </SectionCard>
      <SectionCard title="Notes & Terms">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Field label="Customer Notes"><Textarea value={notes} onChange={setNotes} placeholder="Thank you for your business!" rows={3} /></Field>
          <Field label="Terms & Conditions"><Textarea value={terms} onChange={setTerms} rows={3} /></Field>
        </div>
      </SectionCard>
      <SectionCard title="Recurring">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:13, color:"#555" }}>Enable recurring schedule</div>
          <Switch checked={isRecurring} onChange={setIsRecurring} />
        </div>
        {isRecurring && <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Field label="Frequency"><Select value={recurringFreq} onChange={v=>{setRecurringFreq(v);const fd={Weekly:7,Monthly:30,Quarterly:90,Yearly:365};setRecurringNextDate(addDays(issueDate,fd[v]||30));}} options={RECURRING_OPTS} /></Field>
          <Field label="Next Invoice Date"><Input value={recurringNextDate} onChange={setRecurringNextDate} type="date" /></Field>
          <div style={{ gridColumn:"1/-1" }}><InfoBox color="#D97706">A new invoice identical to this one will be auto-created on {recurringNextDate?fmtDate(recurringNextDate):"the scheduled date"}. You review and send it manually.</InfoBox></div>
        </div>}
      </SectionCard>
      {showPreview && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:24 }}>
          <div style={{ background:"#fff", borderRadius:16, maxWidth:680, width:"100%", maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 22px", borderBottom:"1px solid #F0F0F0" }}>
              <span style={{ fontSize:15, fontWeight:800, color:"#1A1A1A" }}>Invoice Preview</span>
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={()=>{ setShowPreview(false); setShowA4Print(true); }} variant="outline" size="sm" icon={<Icons.Receipt />}>Print Preview</Btn>
                <button onClick={()=>setShowPreview(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA" }}><Icons.X /></button>
              </div>
            </div>
            <div style={{ overflowY:"auto", padding:22 }}>
              <DocPreview data={previewData} currSymbol={currSymbol} docType="Invoice" isVat={isVat} />
            </div>
          </div>
        </div>
      )}
      {showPaidConfirm && (
        <PaidConfirmModal
          invoice={{ invoice_number:invoiceNumber, total, currency }}
          onConfirm={(payInfo)=>{
            setStatus("Paid");
            setShowPaidConfirm(false);
            doSave("Paid", (saved)=>{
              // Register payment automatically in Payments Received
              const nums = (payments||[]).map(p=>parseInt((p.payment_number||"").replace(/\D/g,""),10)).filter(Boolean);
              const payNum = `PAY-${String(nums.length?Math.max(...nums)+1:1).padStart(4,"0")}`;
              const newPay = {
                id: crypto.randomUUID(), payment_number: payNum,
                invoice_id: saved.id, invoice_number: saved.invoice_number,
                customer_id: saved.customer_id, customer_name: saved.customer_name,
                amount: saved.total, currency: saved.currency,
                date: payInfo.date, method: payInfo.method, reference: payInfo.reference||"",
                notes: `Auto-recorded when marked Paid in Invoice ${saved.invoice_number}`,
                status: "Reconciled",
              };
              setPayments(p=>upsert(p||[], newPay));
            });
          }}
          onCancel={()=>setShowPaidConfirm(false)}
        />
      )}
      {showA4Print && (
        <A4PrintModal data={previewData} currSymbol={currSymbol} isVat={isVat} onClose={()=>setShowA4Print(false)} />
      )}
    </div>
  );
}

// ─── INVOICES PAGE ────────────────────────────────────────────────────────────
function InvoicesPage() {
  const { invoices, setInvoices, payments, setPayments, customPayMethods } = useContext(AppCtx);
  const allMethods = [...PAYMENT_METHODS, ...customPayMethods];
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const FILTERS=["All","Draft","Sent","Paid","Overdue"];
  const onSave=inv=>{ setInvoices(p=>upsert(p,inv)); setView("list"); setEditing(null); };
  const onCancel=()=>{ setView("list"); setEditing(null); };
  if(view!=="list") return <InvoiceForm existing={editing} invoices={invoices} onSave={onSave} onCancel={onCancel} />;
  const filtered=invoices.filter(inv=>(inv.invoice_number?.toLowerCase().includes(search.toLowerCase())||inv.customer_name?.toLowerCase().includes(search.toLowerCase()))&&(filter==="All"||inv.status===filter));
  const totals={ outstanding:invoices.filter(i=>i.status==="Sent").reduce((a,b)=>a+b.total,0), overdue:invoices.filter(i=>i.status==="Overdue").reduce((a,b)=>a+b.total,0), paid:invoices.filter(i=>i.status==="Paid").reduce((a,b)=>a+b.total,0) };
  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,30px)", maxWidth:1200, fontFamily:ff }}>
      <div style={{ marginBottom:20 }}><h1 style={{ fontSize:24, fontWeight:800, color:"#1A1A1A", margin:"0 0 3px" }}>Invoices</h1><p style={{ color:"#AAA", fontSize:13, margin:0 }}>Create, manage and track invoices</p></div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginBottom:20 }}>
        {[{ l:"Outstanding", v:totals.outstanding, c:"#2563EB" },{ l:"Overdue", v:totals.overdue, c:"#DC2626" },{ l:"Paid (all time)", v:totals.paid, c:"#16A34A" }].map(s=>(
          <div key={s.l} style={{ background:"#fff", borderRadius:12, padding:"15px 17px", border:"1px solid #EBEBEB" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>{s.l}</div>
            <div style={{ fontSize:18, fontWeight:800, color:s.c }}>£{s.v.toLocaleString("en-GB",{minimumFractionDigits:2})}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <div style={{ flex:1, position:"relative" }}>
          <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#AAA" }}><Icons.Search /></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoices…"
            style={{ width:"100%", padding:"9px 12px 9px 32px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", background:"#fff", boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", gap:2, background:"#F0F0F0", padding:3, borderRadius:8 }}>
          {FILTERS.map(f=><button key={f} onClick={()=>setFilter(f)} style={{ padding:"5px 10px", borderRadius:6, border:"none", background:filter===f?"#1A1A1A":"transparent", color:filter===f?"#fff":"#888", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:ff }}>{f}</button>)}
        </div>
        <Btn onClick={()=>{ setEditing(null); setView("new"); }} variant="accent" icon={<Icons.Plus />}>New Invoice</Btn>
      </div>
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:"#FAFAFA", borderBottom:"1px solid #F0F0F0" }}>
            {["Invoice #","Customer","Issue Date","Due Date","Amount","Status",""].map(h=><th key={h} style={{ padding:"8px 16px", textAlign:h==="Amount"?"right":"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</th>)}
          </tr></thead>
          <tbody>{filtered.map(inv=>(
            <tr key={inv.id} style={{ borderBottom:"1px solid #F7F7F7" }}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{ padding:"11px 16px", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{inv.invoice_number}</td>
              <td style={{ padding:"11px 16px", fontSize:13, color:"#444" }}>{inv.customer_name}</td>
              <td style={{ padding:"11px 16px", fontSize:13, color:"#888" }}>{fmtDate(inv.issue_date)}</td>
              <td style={{ padding:"11px 16px", fontSize:13, color:new Date(inv.due_date)<new Date()&&inv.status!=="Paid"?"#DC2626":"#888" }}>{fmtDate(inv.due_date)}</td>
              <td style={{ padding:"11px 16px", fontSize:13, fontWeight:700, color:"#1A1A1A", textAlign:"right" }}>{fmt("£",inv.total)}</td>
              <td style={{ padding:"11px 16px" }}><Tag color={STATUS_COLORS[inv.status]}>{inv.status}</Tag></td>
              <td style={{ padding:"11px 16px" }}><Btn onClick={()=>{ setEditing(inv); setView("edit"); }} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn></td>
            </tr>
          ))}
          {filtered.length===0&&<tr><td colSpan={7} style={{ padding:"40px 16px", textAlign:"center", color:"#CCC", fontSize:13 }}>No invoices match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── QUOTE FORM ───────────────────────────────────────────────────────────────
function QuoteForm({ existing, quotes, onSave, onCancel }) {
  const { orgSettings, catalogItems, customers } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const [quoteNumber, setQuoteNumber] = useState(existing?.quote_number||nextNum("QUO",quotes.map(q=>q.quote_number)));
  const [customer, setCustomer] = useState(existing ? (customers||[]).find(c=>c.id===existing.customer_id)||null : null);
  const [issueDate, setIssueDate] = useState(existing?.issue_date||todayStr());
  const [expiryDate, setExpiryDate] = useState(existing?.expiry_date||addDays(todayStr(),30));
  const [currency, setCurrency] = useState(existing?.currency||"GBP");
  const [status, setStatus] = useState(existing?.status||"Draft");
  const [items, setItems] = useState(existing?.line_items?.length?existing.line_items:[newLine(0)]);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [notes, setNotes] = useState(existing?.notes||"");
  const [terms, setTerms] = useState(existing?.terms||DEFAULT_QUOTE_TERMS);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(()=>{
    if(!isVat) setItems(p=>p.map(i=>({ ...i, tax_rate:0 })));
  },[isVat]);

  const currSymbol=CUR_SYM[currency]||"£";
  const subtotal=items.reduce((s,i)=>s+Number(i.amount),0);
  const discountAmount=discountType==="percent"?subtotal*(Number(discountValue)/100):Math.min(Number(discountValue),subtotal);
  const taxBreakdown=isVat?TAX_RATES.filter(r=>r>0).map(rate=>({ rate, amount:items.filter(i=>Number(i.tax_rate)===rate).reduce((s,i)=>s+i.amount*(rate/100),0) })).filter(tb=>tb.amount>0):[];
  const taxTotal=taxBreakdown.reduce((s,tb)=>s+tb.amount,0);
  const cisDeduction = items.reduce((s,it)=>{
    const ci = catalogItems?.find(c=>c.name===it.description);
    if(!ci?.cisApplicable) return s;
    const rate = ci?.cisLabourRate ? parseFloat(ci.cisLabourRate)/100 : 0.2;
    return s + it.amount * rate;
  }, 0);
  const totalBeforeCIS=(subtotal-discountAmount)+Number(shipping)+taxTotal;
  const total=totalBeforeCIS-cisDeduction;

  const doSave = async (forceStatus) => {
    setSaving(true);
    const finalStatus = forceStatus !== undefined ? forceStatus : status;
    const payload={ quote_number:quoteNumber, customer_id:customer?.id||null, customer_name:customer?.name||"", issue_date:issueDate, expiry_date:expiryDate, status:finalStatus, currency, subtotal, discount_type:discountType, discount_value:Number(discountValue), discount_amount:discountAmount, shipping:Number(shipping), tax_total:taxTotal, cis_deduction:cisDeduction, total, notes, terms };
    try { if(existing?.id) await sbFetch("PATCH",`quotes?id=eq.${existing.id}`,payload); else await sbFetch("POST","quotes",payload); } catch {}
    setSaveMsg("Saved!");
    onSave({ ...payload, id:existing?.id||crypto.randomUUID(), line_items:items });
    setSaving(false); setTimeout(()=>setSaveMsg(""),2000);
  };

  const previewData={ docNumber:quoteNumber, customer, issueDate, dueDate:expiryDate, currency, status, items, subtotal, discountAmount, shipping, taxBreakdown, cisDeduction, total, notes, terms };

  return (
    <div style={{ padding:"clamp(12px,3vw,24px) clamp(12px,4vw,30px)", maxWidth:860, fontFamily:ff }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div><h1 style={{ fontSize:22, fontWeight:800, color:"#1A1A1A", margin:"0 0 2px" }}>{existing?"Edit "+quoteNumber:"New Quote"}</h1><p style={{ color:"#AAA", fontSize:12, margin:0 }}>Fill in the details below</p></div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {saveMsg && <span style={{ fontSize:12, color:"#16A34A", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}><Icons.Check />{saveMsg}</span>}
          <Btn onClick={onCancel} variant="outline">Cancel</Btn>
          <Btn onClick={()=>setShowPreview(true)} variant="outline" icon={<Icons.Eye />}>Preview</Btn>
          <Btn onClick={()=>doSave()} variant="outline" disabled={saving} icon={<Icons.Save />}>Save</Btn>
          <Btn onClick={()=>doSave("Sent")} variant="accent" disabled={saving} icon={<Icons.Send />}>{saving?"Saving…":"Save & Send"}</Btn>
        </div>
      </div>
      <SectionCard title="Quote Details">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <Field label="Quote Number" required><Input value={quoteNumber} onChange={setQuoteNumber} /></Field>
          <Field label="Issue Date" required><Input value={issueDate} onChange={setIssueDate} type="date" /></Field>
          <Field label="Expiry Date" required><Input value={expiryDate} onChange={setExpiryDate} type="date" /></Field>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:10 }}>
          <Field label="Status"><Select value={status} onChange={setStatus} options={QUOTE_STATUSES} /></Field>
          <Field label="Currency"><Select value={currency} onChange={setCurrency} options={Object.keys(CUR_SYM).map(k=>({ value:k, label:`${k} (${CUR_SYM[k]})` }))} /></Field>
        </div>
      </SectionCard>
      <SectionCard title="Quote For">
        <Select value={customer?.id||""} onChange={id=>setCustomer(((customers)||[]).find(c=>c.id===id)||null)} options={((customers)||[]).map(c=>({ value:c.id, label:c.name }))} placeholder="Select a customer…" />
        {customer && <div style={{ marginTop:9, padding:"9px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{customer.name}</div>
          <div style={{ fontSize:12, color:"#888", marginTop:1 }}>{customer.email}</div>
        </div>}
      </SectionCard>
      <SectionCard title="Line Items">
        <LineItemsTable items={items} onChange={setItems} currSymbol={currSymbol} catalogItems={catalogItems} isVat={isVat} />
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16 }}>
          <TotalsBlock subtotal={subtotal} discountType={discountType} discountValue={discountValue} setDiscountType={setDiscountType} setDiscountValue={setDiscountValue} shipping={shipping} setShipping={setShipping} taxBreakdown={taxBreakdown} total={total} currSymbol={currSymbol} isVat={isVat} cisDeduction={cisDeduction} />
        </div>
      </SectionCard>
      <SectionCard title="Notes & Terms">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Field label="Customer Notes"><Textarea value={notes} onChange={setNotes} placeholder="Visible to the customer…" rows={3} /></Field>
          <Field label="Terms & Conditions"><Textarea value={terms} onChange={setTerms} rows={3} /></Field>
        </div>
      </SectionCard>
      {showPreview && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:24 }}>
          <div style={{ background:"#fff", borderRadius:16, maxWidth:680, width:"100%", maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 22px", borderBottom:"1px solid #F0F0F0" }}>
              <span style={{ fontSize:15, fontWeight:800, color:"#1A1A1A" }}>Quote Preview</span>
              <div style={{ display:"flex", gap:8 }}>
               <Btn onClick={()=>{
                  const el = document.getElementById("quote-preview-content");
                  if(!el){ window.print(); return; }
                  const w = window.open("","_blank","width=900,height=700");
                  w.document.write(`<!DOCTYPE html><html><head><title>Quote ${quoteNumber||""}</title><style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}body{background:#fff;font-family:'Instrument Sans','DM Sans','Helvetica Neue',sans-serif}@page{size:A4;margin:10mm}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}</style></head><body>${el.outerHTML}</body></html>`);
                  w.document.close();
                  setTimeout(()=>{ w.focus(); w.print(); },400);
                }} variant="outline" size="sm" icon={<Icons.Download />}>Download PDF</Btn>
                <button onClick={()=>setShowPreview(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA" }}><Icons.X /></button>
              </div>
            </div>
            <div id="quote-preview-content" style={{ overflowY:"auto", padding:22 }}>
              <DocPreview data={previewData} currSymbol={currSymbol} docType="Quote" isVat={isVat} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUOTES PAGE ──────────────────────────────────────────────────────────────
function QuotesPage({ onNavigate }) {
  const { quotes, setQuotes, invoices, setInvoices } = useContext(AppCtx);
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [convertMsg, setConvertMsg] = useState("");
  const FILTERS=["All",...QUOTE_STATUSES];
  const onSave=q=>{ setQuotes(p=>upsert(p,q)); setView("list"); setEditing(null); };
  const onCancel=()=>{ setView("list"); setEditing(null); };
  const onClone=q=>setQuotes(p=>[{ ...q, id:crypto.randomUUID(), quote_number:nextNum("QUO",[...p.map(x=>x.quote_number),q.quote_number]), status:"Draft", issue_date:todayStr(), expiry_date:addDays(todayStr(),30) },...p]);
  const onConvertToInvoice=q=>{
    const newInvNum = nextNum("INV", invoices.map(i=>i.invoice_number));
    const newInv = {
      id: crypto.randomUUID(),
      invoice_number: newInvNum,
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      issue_date: todayStr(),
      due_date: addDays(todayStr(), 30),
      payment_terms: "Net 30",
      status: "Draft",
      currency: q.currency,
      subtotal: q.subtotal,
      discount_type: q.discount_type||"percent",
      discount_value: q.discount_value||0,
      discount_amount: q.discount_amount||0,
      shipping: q.shipping||0,
      tax_total: q.tax_total||0,
      cis_deduction: q.cis_deduction||0,
      total: q.total,
      notes: q.notes||"",
      terms: DEFAULT_INV_TERMS,
      line_items: q.line_items||[],
      from_quote: q.quote_number,
    };
    setInvoices(p=>[newInv,...p]);
    setQuotes(p=>upsert(p,{...q, status:"Accepted", converted_to_invoice:newInvNum}));
    setConvertMsg(`Converted → ${newInvNum}`);
    setTimeout(()=>setConvertMsg(""),4000);
  };
  if(view!=="list") return <QuoteForm existing={editing} quotes={quotes} onSave={onSave} onCancel={onCancel} />;
  const filtered=quotes.filter(q=>(q.quote_number?.toLowerCase().includes(search.toLowerCase())||q.customer_name?.toLowerCase().includes(search.toLowerCase()))&&(filter==="All"||q.status===filter));
  return (
    <div style={{ padding:"clamp(16px,4vw,28px) clamp(12px,4vw,30px)", maxWidth:1200, fontFamily:ff }}>
      <div style={{ marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div><h1 style={{ fontSize:"clamp(18px,4vw,24px)", fontWeight:800, color:"#1A1A1A", margin:"0 0 3px" }}>Quotes</h1><p style={{ color:"#AAA", fontSize:13, margin:0 }}>Create, manage and send quotes to customers</p></div>
        {convertMsg && <div style={{ display:"flex", alignItems:"center", gap:6, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:8, padding:"8px 14px", fontSize:13, color:"#16A34A", fontWeight:700 }}><Icons.Check />{convertMsg} — <button onClick={()=>onNavigate?.("invoices")} style={{ background:"none", border:"none", cursor:"pointer", color:"#16A34A", fontWeight:800, textDecoration:"underline", fontFamily:ff, fontSize:13 }}>View Invoices →</button></div>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
        {[{ l:"Accepted Value", v:quotes.filter(q=>q.status==="Accepted").reduce((a,b)=>a+(b.total||0),0), c:"#16A34A" },{ l:"Awaiting Response", v:quotes.filter(q=>q.status==="Sent").reduce((a,b)=>a+(b.total||0),0), c:"#2563EB" },{ l:"Total Quotes", v:quotes.length, c:"#6B7280", isCount:true }].map(s=>(
          <div key={s.l} style={{ background:"#fff", borderRadius:12, padding:"15px 17px", border:"1px solid #EBEBEB" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>{s.l}</div>
            <div style={{ fontSize:18, fontWeight:800, color:s.c }}>{s.isCount?s.v:`£${s.v.toLocaleString("en-GB",{minimumFractionDigits:2})}`}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:160, position:"relative" }}>
          <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#AAA" }}><Icons.Search /></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quotes…"
            style={{ width:"100%", padding:"9px 12px 9px 32px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", background:"#fff", boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", gap:2, background:"#F0F0F0", padding:3, borderRadius:8, flexWrap:"wrap" }}>
          {FILTERS.map(f=><button key={f} onClick={()=>setFilter(f)} style={{ padding:"5px 10px", borderRadius:6, border:"none", background:filter===f?"#1A1A1A":"transparent", color:filter===f?"#fff":"#888", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:ff }}>{f}</button>)}
        </div>
        <Btn onClick={()=>{ setEditing(null); setView("new"); }} variant="accent" icon={<Icons.Plus />}>New Quote</Btn>
      </div>
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
          <thead><tr style={{ background:"#FAFAFA", borderBottom:"1px solid #F0F0F0" }}>
            {["Quote #","Customer","Issue Date","Expiry Date","Amount","Status",""].map(h=><th key={h} style={{ padding:"8px 16px", textAlign:h==="Amount"?"right":"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h}</th>)}
          </tr></thead>
          <tbody>{filtered.map(q=>{
            const expired=q.expiry_date&&new Date(q.expiry_date)<new Date()&&q.status!=="Accepted";
            const alreadyConverted=!!q.converted_to_invoice;
            return (
              <tr key={q.id} style={{ borderBottom:"1px solid #F7F7F7" }}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{ padding:"11px 16px", fontSize:13, fontWeight:700, color:"#1A1A1A", whiteSpace:"nowrap" }}>
                  {q.quote_number}
                  {q.converted_to_invoice && <div style={{ fontSize:10, color:"#16A34A", fontWeight:600, marginTop:2 }}>→ {q.converted_to_invoice}</div>}
                </td>
                <td style={{ padding:"11px 16px", fontSize:13, color:"#444" }}>{q.customer_name}</td>
                <td style={{ padding:"11px 16px", fontSize:13, color:"#888", whiteSpace:"nowrap" }}>{fmtDate(q.issue_date)}</td>
                <td style={{ padding:"11px 16px", fontSize:13, color:expired?"#DC2626":"#888", whiteSpace:"nowrap" }}>{fmtDate(q.expiry_date)}</td>
                <td style={{ padding:"11px 16px", fontSize:13, fontWeight:700, color:"#1A1A1A", textAlign:"right", whiteSpace:"nowrap" }}>{fmt("£",q.total||0)}</td>
                <td style={{ padding:"11px 16px" }}><Tag color={STATUS_COLORS[q.status]}>{q.status}</Tag></td>
                <td style={{ padding:"11px 16px" }}>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    <Btn onClick={()=>{ setEditing(q); setView("edit"); }} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
                    <Btn onClick={()=>onClone(q)} variant="ghost" size="sm">Clone</Btn>
                    {(q.status==="Accepted"||q.status==="Sent") && !alreadyConverted && (
                      <Btn onClick={()=>onConvertToInvoice(q)} variant="outline" size="sm" icon={<Icons.Invoices />} style={{ color:"#16A34A", borderColor:"#BBF7D0", background:"#F0FDF4" }}>→ Invoice</Btn>
                    )}
                    {alreadyConverted && <span style={{ fontSize:11, color:"#16A34A", fontWeight:600, display:"flex", alignItems:"center", gap:3 }}><Icons.Check />Invoiced</span>}
                  </div>
                </td>
              </tr>
            );
          })}
          {filtered.length===0&&<tr><td colSpan={7} style={{ padding:"40px 16px", textAlign:"center", color:"#CCC", fontSize:13 }}>No quotes yet. Click "New Quote" to get started.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage({ onOrgSetup, pdfTemplate, setPdfTemplate }) {
  const { orgSettings } = useContext(AppCtx);
  const [previewTpl, setPreviewTpl] = useState(null);
  const [tplAccent, setTplAccent] = useState(PDF_TEMPLATES.find(t=>t.id===pdfTemplate)?.defaultAccent||"#1A1A1A");
  const [tplLogo, setTplLogo] = useState(null); // base64 or null
  const [tplShowBankDetails, setTplShowBankDetails] = useState(true);
  const [tplShowPayTerms, setTplShowPayTerms] = useState(true);
  const [tplShowQR, setTplShowQR] = useState(false);
  const [tplNotes, setTplNotes] = useState("Thank you for your business!");
  const [tplFooterText, setTplFooterText] = useState("");

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => setTplLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const SAMPLE_INV = {
    docNumber:"INV-0042",
    customer:{ name:"Acme Corporation", email:"billing@acme.com", companyName:"Acme Corporation",
      billingAddress:{ street:"123 High Street", city:"London", postcode:"EC1A 1BB", country:"United Kingdom" } },
    issueDate:"2026-03-08", dueDate:"2026-04-15", paymentTerms:"Net 30", status:"Sent",
    items:[{ id:"1", description:"Web Design Package", quantity:1, rate:1200, tax_rate:20, amount:1200 },{ id:"2", description:"Consulting — 8hrs", quantity:8, rate:95, tax_rate:20, amount:760 }],
    subtotal:1960, discountAmount:0, shipping:0,
    taxBreakdown:[{ rate:20, amount:392 }], cisDeduction:0, total:2352,
    notes: tplNotes,
    terms:tplShowPayTerms?"Payment is due within the agreed payment terms. Late payments may incur interest charges.":""
  };

  const TplPreview = ({ tpl }) => {
    const sym="£";
    if(tpl==="classic") return (
      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #EBEBEB", overflow:"hidden", fontFamily:ff }}>
        <div style={{ padding:"22px 28px", borderBottom:"2px solid #1A1A1A", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div><div style={{ fontSize:18, fontWeight:900, color:"#1A1A1A", letterSpacing:"-0.02em" }}>AI INVOICE</div><div style={{ fontSize:11, color:"#888", marginTop:2 }}>123 Business Road, London</div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:22, fontWeight:900, color:"#1A1A1A" }}>INVOICE</div><div style={{ fontSize:13, color:"#888", marginTop:2 }}>#{SAMPLE_INV.docNumber}</div><div style={{ marginTop:5 }}><Tag color={STATUS_COLORS[SAMPLE_INV.status]}>{SAMPLE_INV.status}</Tag></div></div>
        </div>
        <div style={{ padding:"16px 28px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, borderBottom:"1px solid #F0F0F0" }}>
          <div><div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:5 }}>Bill To</div><div style={{ fontSize:13, fontWeight:700 }}>{SAMPLE_INV.customer.name}</div><div style={{ fontSize:12, color:"#888" }}>{SAMPLE_INV.customer.email}</div><div style={{ fontSize:12, color:"#888" }}>{SAMPLE_INV.customer.address}</div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:5 }}>Details</div><div style={{ fontSize:12, color:"#555" }}>Due: <strong>{fmtDate(SAMPLE_INV.dueDate)}</strong></div></div>
        </div>
        <InvItemsTable items={SAMPLE_INV.items} sym={sym} />
        <InvTotals data={SAMPLE_INV} sym={sym} />
      </div>
    );
    if(tpl==="modern") return (
      <div style={{ background:"#fff", borderRadius:10, overflow:"hidden", fontFamily:ff }}>
        <div style={{ background:"#1A1A1A", padding:"24px 28px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><div style={{ fontSize:13, fontWeight:800, color:"rgba(255,255,255,0.4)", letterSpacing:"0.12em", textTransform:"uppercase" }}>AI Invoice</div><div style={{ fontSize:22, fontWeight:900, color:"#fff", marginTop:3 }}>INVOICE</div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:14, fontWeight:700, color:"#E86C4A" }}>{SAMPLE_INV.docNumber}</div><Tag color={STATUS_COLORS[SAMPLE_INV.status]}>{SAMPLE_INV.status}</Tag></div>
        </div>
        <div style={{ background:"#F7F7F5", padding:"14px 28px 14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div><div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:4 }}>Bill To</div><div style={{ fontSize:13, fontWeight:800 }}>{SAMPLE_INV.customer.name}</div><div style={{ fontSize:12, color:"#666" }}>{SAMPLE_INV.customer.email}</div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:4 }}>Due Date</div><div style={{ fontSize:13, fontWeight:800 }}>{fmtDate(SAMPLE_INV.dueDate)}</div></div>
        </div>
        <div style={{ padding:"0 28px" }}><InvItemsTable items={SAMPLE_INV.items} sym={sym} /></div>
        <div style={{ padding:"0 28px" }}><InvTotals data={SAMPLE_INV} sym={sym} /></div>
      </div>
    );
    if(tpl==="minimal") return (
      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E8E8E8", padding:"28px", fontFamily:ff }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
          <div><div style={{ fontSize:13, fontWeight:700, color:"#333" }}>AI Invoice</div><div style={{ fontSize:11, color:"#AAA" }}>123 Business Road</div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:15, fontWeight:700, color:"#1A1A1A" }}>Invoice {SAMPLE_INV.docNumber}</div><div style={{ fontSize:12, color:"#AAA" }}>Due {fmtDate(SAMPLE_INV.dueDate)}</div></div>
        </div>
        <div style={{ borderTop:"1px solid #E8E8E8", borderBottom:"1px solid #E8E8E8", padding:"10px 0", marginBottom:14 }}>
          <div style={{ fontSize:12, color:"#333" }}>Bill to: <strong>{SAMPLE_INV.customer.name}</strong> · {SAMPLE_INV.customer.email}</div>
        </div>
        <InvItemsTable items={SAMPLE_INV.items} sym={sym} minimal />
        <InvTotals data={SAMPLE_INV} sym={sym} />
      </div>
    );
    if(tpl==="branded") return (
      <div style={{ background:"#fff", borderRadius:10, overflow:"hidden", fontFamily:ff }}>
        <div style={{ background:"linear-gradient(135deg,#1A1A1A 60%,#E86C4A)", padding:"28px", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div><div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:6 }}>AI Invoice</div><div style={{ fontSize:24, fontWeight:900, color:"#fff", letterSpacing:"-0.02em" }}>INVOICE</div><div style={{ fontSize:13, color:"#E86C4A", fontWeight:700, marginTop:4 }}>{SAMPLE_INV.docNumber}</div></div>
          <div style={{ textAlign:"right" }}><Tag color={STATUS_COLORS[SAMPLE_INV.status]}>{SAMPLE_INV.status}</Tag><div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginTop:6 }}>Due {fmtDate(SAMPLE_INV.dueDate)}</div></div>
        </div>
        <div style={{ padding:"16px 28px", background:"#F9F9F9", borderBottom:"3px solid #E86C4A", display:"grid", gridTemplateColumns:"1fr 1fr" }}>
          <div><div style={{ fontSize:10, fontWeight:700, color:"#E86C4A", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:3 }}>Bill To</div><div style={{ fontSize:13, fontWeight:800 }}>{SAMPLE_INV.customer.name}</div><div style={{ fontSize:12, color:"#666" }}>{SAMPLE_INV.customer.email}</div></div>
        </div>
        <div style={{ padding:"0 28px" }}><InvItemsTable items={SAMPLE_INV.items} sym={sym} /></div>
        <div style={{ padding:"0 28px" }}><InvTotals data={SAMPLE_INV} sym={sym} /></div>
      </div>
    );
    return null;
  };

  const InvItemsTable = ({ items, sym, minimal }) => (
    <table style={{ width:"100%", borderCollapse:"collapse", margin:"14px 0" }}>
      <thead><tr style={{ borderBottom:`${minimal?"1px":"2px"} solid ${minimal?"#E8E8E8":"#EBEBEB"}` }}>
        {["Description","Qty","Rate","Amount"].map(h=><th key={h} style={{ padding:"5px 0 8px", textAlign:h==="Description"?"left":"right", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>)}
      </tr></thead>
      <tbody>{items.map(it=>(
        <tr key={it.id} style={{ borderBottom:"1px solid #F7F7F7" }}>
          <td style={{ padding:"7px 0", fontSize:12, color:"#1A1A1A" }}>{it.description}</td>
          <td style={{ padding:"7px 0", fontSize:12, color:"#666", textAlign:"right" }}>{it.quantity}</td>
          <td style={{ padding:"7px 0", fontSize:12, color:"#666", textAlign:"right" }}>{fmt(sym,it.rate)}</td>
          <td style={{ padding:"7px 0", fontSize:12, fontWeight:700, color:"#1A1A1A", textAlign:"right" }}>{fmt(sym,it.amount)}</td>
        </tr>
      ))}</tbody>
    </table>
  );
  const InvTotals = ({ data, sym }) => (
    <div style={{ display:"flex", justifyContent:"flex-end", paddingBottom:18 }}>
      <div style={{ minWidth:200 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:24, padding:"3px 0" }}><span style={{ fontSize:12, color:"#888" }}>Subtotal</span><span style={{ fontSize:12, color:"#555" }}>{fmt(sym,data.subtotal)}</span></div>
        {data.taxBreakdown.map(tb=><div key={tb.rate} style={{ display:"flex", justifyContent:"space-between", gap:24, padding:"3px 0" }}><span style={{ fontSize:12, color:"#888" }}>VAT {tb.rate}%</span><span style={{ fontSize:12, color:"#555" }}>{fmt(sym,tb.amount)}</span></div>)}
        <div style={{ display:"flex", justifyContent:"space-between", gap:24, padding:"8px 0 2px", borderTop:"2px solid #1A1A1A", marginTop:4 }}><span style={{ fontSize:13, fontWeight:800 }}>Total</span><span style={{ fontSize:14, fontWeight:800 }}>{fmt(sym,data.total)}</span></div>
      </div>
    </div>
  );

  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:900, fontFamily:ff }}>
      <h1 style={{ fontSize:24, fontWeight:800, color:"#1A1A1A", marginBottom:20 }}>Settings</h1>

      {/* Organisation */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Organisation</div>
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"15px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:34, height:34, background:"#F4F4F4", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", color:"#666" }}><Icons.Building /></div>
            <div><div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>Organization Setup</div><div style={{ fontSize:12, color:"#AAA", marginTop:1 }}>Edit org details, VAT, CIS, industry and preferences</div></div>
          </div>
          <Btn onClick={onOrgSetup} variant="outline" size="sm">Edit</Btn>
        </div>
      </div>

      {/* PDF Template */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>PDF Print Template</div>
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"18px 20px" }}>
          <p style={{ fontSize:13, color:"#555", margin:"0 0 14px", lineHeight:1.6 }}>Select a template and click <strong>Preview / Edit</strong> to see exactly how your invoices and quotes will look when printed or exported as PDF.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:14 }}>
            {PDF_TEMPLATES.map(t=>(
              <button key={t.id} onClick={()=>setPdfTemplate(t.id)}
                style={{ padding:"12px 10px", borderRadius:10, border:`2px solid ${pdfTemplate===t.id?"#1A1A1A":"#E0E0E0"}`, background:pdfTemplate===t.id?"#1A1A1A":"#FAFAFA", cursor:"pointer", textAlign:"center", transition:"all 0.18s", fontFamily:ff, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                {/* Mini visual */}
                <div style={{ width:"100%", height:52, borderRadius:6, overflow:"hidden", background:pdfTemplate===t.id?"rgba(255,255,255,0.1)":"#F0F0F0", display:"flex", flexDirection:"column", gap:3, padding:"7px 8px" }}>
                  {t.id==="classic" && <><div style={{ height:7, borderRadius:2, background:pdfTemplate===t.id?"rgba(255,255,255,0.5)":"#CCC", width:"60%" }} /><div style={{ height:1, background:pdfTemplate===t.id?"rgba(255,255,255,0.3)":"#DDD", marginTop:2 }} /><div style={{ height:4, borderRadius:2, background:pdfTemplate===t.id?"rgba(255,255,255,0.2)":"#E0E0E0", width:"90%" }} /><div style={{ height:4, borderRadius:2, background:pdfTemplate===t.id?"rgba(255,255,255,0.2)":"#E0E0E0", width:"70%" }} /></>}
                  {t.id==="modern" && <><div style={{ height:12, borderRadius:2, background:pdfTemplate===t.id?"rgba(255,255,255,0.35)":"#C0C0C0", width:"100%" }} /><div style={{ height:4, borderRadius:2, background:pdfTemplate===t.id?"rgba(255,255,255,0.2)":"#E0E0E0", width:"70%", marginTop:4 }} /><div style={{ height:4, borderRadius:2, background:pdfTemplate===t.id?"rgba(255,255,255,0.2)":"#E0E0E0", width:"90%" }} /></>}
                  {t.id==="minimal" && <><div style={{ height:4, borderRadius:2, background:pdfTemplate===t.id?"rgba(255,255,255,0.4)":"#CCC", width:"40%" }} /><div style={{ height:1, background:pdfTemplate===t.id?"rgba(255,255,255,0.2)":"#DDD", margin:"5px 0" }} /><div style={{ height:3, borderRadius:2, background:pdfTemplate===t.id?"rgba(255,255,255,0.2)":"#E0E0E0", width:"80%" }} /><div style={{ height:3, borderRadius:2, background:pdfTemplate===t.id?"rgba(255,255,255,0.2)":"#E0E0E0", width:"60%" }} /></>}
                  {t.id==="branded" && <><div style={{ height:14, borderRadius:2, background:"linear-gradient(90deg,rgba(255,255,255,0.3),#E86C4A50)", width:"100%" }} /><div style={{ height:3, background:"#E86C4A", width:"100%", marginTop:2 }} /><div style={{ height:3, borderRadius:2, background:pdfTemplate===t.id?"rgba(255,255,255,0.2)":"#E0E0E0", width:"70%", marginTop:4 }} /></>}
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:pdfTemplate===t.id?"#fff":"#1A1A1A" }}>{t.name}</span>
                <span style={{ fontSize:10, color:pdfTemplate===t.id?"rgba(255,255,255,0.5)":"#AAA", lineHeight:1.3 }}>{t.desc}</span>
                {pdfTemplate===t.id && <span style={{ color:"#E86C4A" }}><Icons.Check /></span>}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#F9F9F9", borderRadius:9, padding:"10px 14px", border:"1px solid #EBEBEB" }}>
            <span style={{ fontSize:13, color:"#555" }}>Active: <strong style={{ color:"#1A1A1A" }}>{PDF_TEMPLATES.find(t=>t.id===pdfTemplate)?.name}</strong> — {PDF_TEMPLATES.find(t=>t.id===pdfTemplate)?.desc}</span>
            <Btn onClick={()=>setPreviewTpl(pdfTemplate)} variant="outline" size="sm" icon={<Icons.Eye />}>Preview / Edit</Btn>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Integrations</div>
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"15px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:34, height:34, background:"#F4F4F4", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", color:"#666" }}><Icons.Drive /></div>
            <div><div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>Google Drive</div><div style={{ fontSize:12, color:"#AAA", marginTop:1 }}>Export and store invoices as PDFs in your Drive</div></div>
          </div>
          <Btn variant="outline" size="sm">Connect</Btn>
        </div>
      </div>

      {/* Users */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Users & Permissions</div>
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"15px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:34, height:34, background:"#F4F4F4", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", color:"#666" }}><Icons.User /></div>
            <div><div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>Team Members</div><div style={{ fontSize:12, color:"#AAA", marginTop:1 }}>Manage who has access to this organisation</div></div>
          </div>
          <Btn variant="outline" size="sm">Manage</Btn>
        </div>
      </div>

      {/* Template Preview Modal */}
      {previewTpl && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:3000, padding:16, overflowY:"auto" }}>
          <div style={{ background:"#F7F7F5", borderRadius:16, width:"100%", maxWidth:920, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,0.22)", maxHeight:"96vh" }}>
            {/* Modal header */}
            <div style={{ background:"#fff", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid #F0F0F0", flexShrink:0 }}>
              <div>
                <span style={{ fontSize:15, fontWeight:800, color:"#1A1A1A" }}>PDF Template — {PDF_TEMPLATES.find(t=>t.id===previewTpl)?.name}</span>
                <p style={{ margin:"2px 0 0", fontSize:12, color:"#AAA" }}>Live preview with your settings</p>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {PDF_TEMPLATES.map(t=>(
                  <button key={t.id} onClick={()=>{ setPdfTemplate(t.id); setPreviewTpl(t.id); setTplAccent(t.defaultAccent); }}
                    style={{ padding:"5px 11px", borderRadius:6, border:`1.5px solid ${previewTpl===t.id?"#1A1A1A":"#E0E0E0"}`, background:previewTpl===t.id?"#1A1A1A":"#fff", color:previewTpl===t.id?"#fff":"#666", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:ff }}>
                    {t.name}
                  </button>
                ))}
                <button onClick={()=>setPreviewTpl(null)} style={{ marginLeft:4, background:"none", border:"none", cursor:"pointer", color:"#AAA", display:"flex" }}><Icons.X /></button>
              </div>
            </div>
            {/* Two-column: settings + preview */}
            <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", flex:1, overflow:"hidden" }}>
              {/* Left: customisation */}
              <div style={{ background:"#fff", borderRight:"1px solid #F0F0F0", padding:"18px 16px", overflowY:"auto", display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.08em" }}>Customisation</div>
                {/* Logo */}
                <Field label="Company Logo">
                  <div style={{ border:"1.5px dashed #DDD", borderRadius:8, padding:"10px", textAlign:"center", background:"#FAFAFA" }}>
                    {tplLogo ? (
                      <div style={{ position:"relative", display:"inline-block" }}>
                        <img src={tplLogo} alt="logo" style={{ maxHeight:52, maxWidth:180, objectFit:"contain", display:"block" }} />
                        <button onClick={()=>setTplLogo(null)}
                          style={{ position:"absolute", top:-6, right:-6, width:18, height:18, borderRadius:"50%", background:"#DC2626", border:"none", color:"#fff", cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                      </div>
                    ) : (
                      <label style={{ cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <div style={{ color:"#CCC" }}><Icons.Plus /></div>
                        <span style={{ fontSize:11, color:"#AAA" }}>Click to upload</span>
                        <span style={{ fontSize:10, color:"#CCC" }}>PNG, JPG, SVG</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display:"none" }} />
                      </label>
                    )}
                  </div>
                </Field>
                {/* Accent colour */}
                <Field label="Accent Colour">
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {["#1A1A1A","#E86C4A","#2563EB","#16A34A","#9333EA","#DC2626","#0891B2","#D97706"].map(c=>(
                      <button key={c} onClick={()=>setTplAccent(c)}
                        style={{ width:30, height:30, borderRadius:"50%", background:c, cursor:"pointer", border:`3px solid ${tplAccent===c?"#1A1A1A":"transparent"}`, boxShadow:tplAccent===c?"0 0 0 1px #fff inset":"none", outline:"none" }} />
                    ))}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
                    <span style={{ fontSize:11, color:"#888" }}>Custom:</span>
                    <input type="color" value={tplAccent} onChange={e=>setTplAccent(e.target.value)}
                      style={{ width:32, height:28, borderRadius:6, border:"1.5px solid #E0E0E0", padding:2, cursor:"pointer" }} />
                    <span style={{ fontSize:11, color:"#AAA", fontFamily:"monospace" }}>{tplAccent}</span>
                  </div>
                </Field>
                {/* Toggle fields */}
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    ["Show Payment Terms", tplShowPayTerms, setTplShowPayTerms],
                    ["Show Bank Details", tplShowBankDetails, setTplShowBankDetails],
                    ["Show Payment QR Code", tplShowQR, setTplShowQR],
                  ].map(([label, val, setter])=>(
                    <div key={label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #F4F4F4" }}>
                      <span style={{ fontSize:12, color:"#555" }}>{label}</span>
                      <Switch checked={val} onChange={setter} />
                    </div>
                  ))}
                </div>
                {/* Editable Notes */}
                <Field label="Default Notes (on invoices)">
                  <textarea value={tplNotes} onChange={e=>setTplNotes(e.target.value)} rows={3} placeholder="e.g. Thank you for your business!"
                    style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:12, fontFamily:ff, color:"#1A1A1A", background:"#FAFAFA", outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.5 }}
                    onFocus={e=>e.target.style.borderColor="#1A1A1A"} onBlur={e=>e.target.style.borderColor="#E0E0E0"} />
                </Field>
                {/* Editable Footer */}
                <Field label="Footer Text (bottom of page)">
                  <textarea value={tplFooterText} onChange={e=>setTplFooterText(e.target.value)} rows={2} placeholder="e.g. Bank: Barclays · Sort: 20-00-00 · Acc: 12345678"
                    style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:12, fontFamily:ff, color:"#1A1A1A", background:"#FAFAFA", outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.5 }}
                    onFocus={e=>e.target.style.borderColor="#1A1A1A"} onBlur={e=>e.target.style.borderColor="#E0E0E0"} />
                  <div style={{ fontSize:10, color:"#AAA", marginTop:3 }}>Appears in the footer of every invoice (bank details, registration numbers, etc.)</div>
                </Field>
              </div>
              {/* Right: A4 preview */}
              <div style={{ overflowY:"auto", padding:"20px 16px", background:"#E8E8E8", display:"flex", justifyContent:"center" }}>
                <div style={{ width:"100%", maxWidth:595, background:"#fff", boxShadow:"0 4px 20px rgba(0,0,0,0.15)" }}>
                  <A4InvoiceDoc
                    data={{...SAMPLE_INV, notes:tplNotes, terms: tplShowPayTerms?"Payment is due within 30 days of invoice date.":""}}
                    currSymbol="£"
                    isVat={true}
                    orgSettings={{ ...orgSettings, logo:tplLogo }}
                    accentColor={tplAccent}
                    template={previewTpl}
                    footerText={tplFooterText}
                  />
                </div>
              </div>
            </div>
            {/* Footer */}
            <div style={{ padding:"12px 20px", borderTop:"1px solid #F0F0F0", background:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
              <span style={{ fontSize:12, color:"#AAA" }}>Active: <strong style={{ color:"#1A1A1A" }}>{PDF_TEMPLATES.find(t=>t.id===previewTpl)?.name}</strong></span>
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={()=>setPreviewTpl(null)} variant="outline">Close</Btn>
                <Btn onClick={()=>{ setPdfTemplate(previewTpl); setPreviewTpl(null); }} variant="primary">Apply Template</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAYMENTS PAGE ────────────────────────────────────────────────────────────
function PaymentModal({ existing, onClose, onSave }) {
  const { invoices, customers, customPayMethods, setCustomPayMethods } = useContext(AppCtx);
  const allMethods = [...PAYMENT_METHODS, ...customPayMethods];
  const unpaidInvoices = invoices.filter(i=>i.status!=="Paid"&&i.status!=="Void");
  const [linkedInvoice, setLinkedInvoice] = useState(existing?.invoice_id||"");
  const [independent, setIndependent] = useState(existing ? !existing.invoice_id : false);
  const [customer, setCustomer] = useState(existing?.customer_id||"");
  const [amount, setAmount] = useState(existing?.amount||"");
  const [currency, setCurrency] = useState(existing?.currency||"GBP");
  const [date, setDate] = useState(existing?.date||todayStr());
  const [method, setMethod] = useState(existing?.method||"Bank Transfer");
  const [reference, setReference] = useState(existing?.reference||"");
  const [notes, setNotes] = useState(existing?.notes||"");
  const [addingMethod, setAddingMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");

  // Auto-fill from invoice
  useEffect(()=>{
    if(linkedInvoice && !independent) {
      const inv = invoices.find(i=>i.id===linkedInvoice);
      if(inv) {
        setCustomer(inv.customer_id||"");
        setCurrency(inv.currency||"GBP");
        const alreadyPaid = Number(inv.amount_paid||0);
        setAmount(String(Math.max(0,(inv.total||0)-alreadyPaid)));
      }
    }
  },[linkedInvoice]);

  const selInv = invoices.find(i=>i.id===linkedInvoice);
  const selCust = customers.find(c=>c.id===customer);
  const amountNum = Number(amount)||0;
  const invTotal = selInv?.total||0;
  const invPaid = selInv?.amount_paid||0;
  const invOutstanding = invTotal - invPaid;
  const isOverpay = !independent && selInv && amountNum > invOutstanding;
  const isPartial = !independent && selInv && amountNum < invOutstanding && amountNum > 0;
  const isFull = !independent && selInv && amountNum >= invOutstanding && amountNum > 0;

  const handleSave = () => {
    if(!amountNum || amountNum <= 0) return;
    const inv = !independent && invoices.find(i=>i.id===linkedInvoice);
    const custName = inv?.customer_name || customers.find(c=>c.id===customer)?.name || "";
    onSave({
      id: existing?.id||crypto.randomUUID(),
      payment_number: existing?.payment_number||"",
      invoice_id: independent ? null : (linkedInvoice||null),
      invoice_number: independent ? null : (inv?.invoice_number||null),
      customer_id: independent ? customer : (inv?.customer_id||customer),
      customer_name: independent ? (customers.find(c=>c.id===customer)?.name||"") : custName,
      amount: amountNum, currency, date, method, reference, notes,
      status: independent ? "Unlinked" : (isFull ? "Reconciled" : isPartial ? "Partial" : "Reconciled"),
    }, inv, isFull||isOverpay);
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, maxHeight:"94vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.18)", fontFamily:ff, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 22px 14px", borderBottom:"1px solid #F0F0F0", flexShrink:0 }}>
          <div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:"#1A1A1A" }}>{existing?"Edit Payment":"Record Payment"}</h2>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#AAA" }}>Fill in the payment details below</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA", display:"flex" }}><Icons.X /></button>
        </div>

        <div style={{ overflowY:"auto", padding:"18px 22px", display:"flex", flexDirection:"column", gap:14 }}>
          {/* Toggle: linked vs independent — locked if editing a linked payment */}
          {existing?.invoice_id ? (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", background:"#F0FDF4", borderRadius:8, border:"1px solid #BBF7D0" }}>
              <Icons.Link />
              <span style={{ fontSize:12, fontWeight:700, color:"#16A34A" }}>Linked to {existing.invoice_number}</span>
              <span style={{ fontSize:11, color:"#888", marginLeft:4 }}>— invoice link cannot be changed when editing</span>
            </div>
          ) : (
            <div style={{ display:"flex", gap:3, background:"#F0F0F0", padding:3, borderRadius:8 }}>
              {[["linked","Link to Invoice"],["independent","Standalone Payment"]].map(([v,l])=>(
                <button key={v} onClick={()=>{ setIndependent(v==="independent"); setLinkedInvoice(""); }}
                  style={{ flex:1, padding:"7px 10px", borderRadius:6, border:"none", background:((independent&&v==="independent")||(!independent&&v==="linked"))?"#1A1A1A":"transparent", color:((independent&&v==="independent")||(!independent&&v==="linked"))?"#fff":"#888", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:ff }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {!independent && (
            <Field label="Invoice" required>
              {existing?.invoice_id ? (
                /* Read-only when editing a linked payment */
                <div style={{ padding:"9px 11px", background:"#F5F5F5", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, color:"#555", display:"flex", alignItems:"center", gap:8 }}>
                  <Icons.Receipt />
                  <span style={{ fontWeight:700, color:"#1A1A1A" }}>{selInv?.invoice_number||existing.invoice_number}</span>
                  {selInv && <span style={{ color:"#888" }}>— {selInv.customer_name} · {fmt(CUR_SYM[selInv.currency]||"£", selInv.total)}</span>}
                </div>
              ) : (
                <Select value={linkedInvoice} onChange={setLinkedInvoice}
                  options={[...unpaidInvoices.map(i=>({ value:i.id, label:`${i.invoice_number} — ${i.customer_name} (${fmt(CUR_SYM[i.currency]||"£", i.total)})` }))]}
                  placeholder="Select invoice to link…" />
              )}
              {selInv && (
                <div style={{ marginTop:8, padding:"10px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#1A1A1A" }}>{selInv.invoice_number}</span>
                    <Tag color={STATUS_COLORS[selInv.status]}>{selInv.status}</Tag>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                    {[["Invoice Total", fmt(CUR_SYM[selInv.currency]||"£", selInv.total)],
                      ["Already Paid", fmt(CUR_SYM[selInv.currency]||"£", invPaid)],
                      ["Outstanding", fmt(CUR_SYM[selInv.currency]||"£", invOutstanding)]
                    ].map(([l,v])=>(
                      <div key={l} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:10, color:"#AAA", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
                        <div style={{ fontSize:13, fontWeight:800, color:"#1A1A1A", marginTop:2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Field>
          )}

          {independent && (
            <Field label="Customer">
              <Select value={customer} onChange={setCustomer}
                options={[...(customers||[]).map(c=>({ value:c.id, label:c.name }))]}
                placeholder="Select customer (optional)…" />
            </Field>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Amount" required>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#888", fontWeight:600 }}>{CUR_SYM[currency]||"£"}</span>
                <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="0.00"
                  style={{ width:"100%", padding:"9px 10px 9px 24px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
              </div>
              {!independent && selInv && amountNum>0 && (
                <div style={{ marginTop:5, fontSize:11, color: isOverpay?"#DC2626":isPartial?"#D97706":"#16A34A", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                  {isOverpay && <><Icons.Alert /> Overpayment of {fmt(CUR_SYM[selInv.currency]||"£", amountNum-invOutstanding)}</>}
                  {isPartial && <><Icons.Info /> Partial — {fmt(CUR_SYM[selInv.currency]||"£", invOutstanding-amountNum)} still outstanding</>}
                  {isFull && <><Icons.Check /> Full payment — invoice will be marked Paid</>}
                </div>
              )}
            </Field>
            <Field label="Currency">
              <Select value={currency} onChange={setCurrency} options={Object.keys(CUR_SYM).map(k=>({ value:k, label:`${k} (${CUR_SYM[k]})` }))} />
            </Field>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Payment Date" required><input value={date} onChange={e=>setDate(e.target.value)} type="date" style={{ width:"100%", padding:"9px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} /></Field>
            <Field label="Payment Method">
              {addingMethod ? (
                <div style={{ display:"flex", gap:6 }}>
                  <input autoFocus value={newMethodName} onChange={e=>setNewMethodName(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&newMethodName.trim()){ const m=newMethodName.trim(); setCustomPayMethods(p=>[...p.filter(x=>x!==m),m]); setMethod(m); setAddingMethod(false); setNewMethodName(""); } if(e.key==="Escape"){ setAddingMethod(false); setNewMethodName(""); } }}
                    placeholder="Method name…"
                    style={{ flex:1, padding:"9px 10px", border:"1.5px solid #E86C4A", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none" }} />
                  <button onClick={()=>{ if(newMethodName.trim()){ const m=newMethodName.trim(); setCustomPayMethods(p=>[...p.filter(x=>x!==m),m]); setMethod(m); } setAddingMethod(false); setNewMethodName(""); }}
                    style={{ padding:"9px 12px", background:"#1A1A1A", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:ff }}>Add</button>
                </div>
              ) : (
                <div style={{ display:"flex", gap:6 }}>
                  <div style={{ flex:1 }}><Select value={method} onChange={setMethod} options={allMethods} /></div>
                  <button onClick={()=>setAddingMethod(true)} title="Add custom method"
                    style={{ padding:"9px 10px", background:"#F4F4F4", border:"1.5px solid #E0E0E0", borderRadius:8, cursor:"pointer", color:"#666", display:"flex", alignItems:"center" }}><Icons.Plus /></button>
                </div>
              )}
              {customPayMethods.length>0 && !addingMethod && (
                <div style={{ marginTop:6, display:"flex", flexWrap:"wrap", gap:4 }}>
                  {customPayMethods.map(m=>(
                    <div key={m} style={{ display:"flex", alignItems:"center", gap:3, background:"#F4F4F4", borderRadius:20, padding:"2px 8px 2px 10px", fontSize:11, color:"#555" }}>
                      {m}
                      <button onClick={()=>{ setCustomPayMethods(p=>p.filter(x=>x!==m)); if(method===m) setMethod("Bank Transfer"); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", padding:"0 2px", display:"flex", lineHeight:1 }}><Icons.X /></button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
          </div>

          <Field label="Reference / Transaction ID">
            <Input value={reference} onChange={setReference} placeholder="e.g. BACS ref, Stripe charge ID…" />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={setNotes} rows={2} placeholder="Internal notes about this payment…" />
          </Field>
        </div>

        <div style={{ padding:"14px 22px", borderTop:"1px solid #F0F0F0", display:"flex", justifyContent:"flex-end", gap:8, flexShrink:0 }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!amountNum||amountNum<=0} icon={<Icons.Check />}>
            {existing?"Update Payment":"Record Payment"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function PaymentsPage({ onNavigate }) {
  const { payments, setPayments, invoices, setInvoices, customers, customPayMethods } = useContext(AppCtx);
  const allMethods = [...PAYMENT_METHODS, ...customPayMethods];
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState("list"); // "list" | "reports"

  const onSave = (payment, invoice, shouldMarkPaid) => {
    if(!payment.payment_number) {
      const nums = payments.map(p=>parseInt((p.payment_number||"").replace(/\D/g,""),10)).filter(Boolean);
      payment.payment_number = `PAY-${String(nums.length?Math.max(...nums)+1:1).padStart(4,"0")}`;
    }
    setPayments(p=>upsert(p,payment));
    if(invoice && shouldMarkPaid) {
      setInvoices(p=>upsert(p,{...invoice, status:"Paid", amount_paid:invoice.total}));
    } else if(invoice && payment.amount>0) {
      const prev = Number(invoice.amount_paid||0);
      const newPaid = prev + Number(payment.amount);
      setInvoices(p=>upsert(p,{...invoice, amount_paid:newPaid, status: newPaid>=invoice.total?"Paid":"Sent"}));
    }
  };

  const onDelete = (pay) => {
    setPayments(p=>p.filter(x=>x.id!==pay.id));
    if(pay.invoice_id) {
      const inv = invoices.find(i=>i.id===pay.invoice_id);
      if(inv) {
        const newPaid = Math.max(0, Number(inv.amount_paid||0)-Number(pay.amount));
        setInvoices(p=>upsert(p,{...inv, amount_paid:newPaid, status:newPaid>=inv.total?"Paid":inv.status==="Paid"?"Sent":inv.status}));
      }
    }
    setDeleteConfirm(null);
  };

  // CSV export
  const exportCSV = (rows) => {
    const headers = ["Payment #","Date","Customer","Invoice","Method","Amount","Currency","Reference","Status","Notes"];
    const lines = [headers.join(","), ...rows.map(p=>[
      p.payment_number, p.date, `"${p.customer_name||""}"`, p.invoice_number||"",
      p.method, p.amount, p.currency, `"${p.reference||""}"`, p.status, `"${p.notes||""}"`
    ].join(","))];
    const blob = new Blob([lines.join("\n")], {type:"text/csv"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`payments-${todayStr()}.csv`; a.click();
  };

  // Filtering
  const now = new Date();
  const filtered = payments.filter(pay=>{
    const matchSearch = !search || pay.payment_number?.toLowerCase().includes(search.toLowerCase()) || pay.customer_name?.toLowerCase().includes(search.toLowerCase()) || pay.invoice_number?.toLowerCase().includes(search.toLowerCase()) || pay.reference?.toLowerCase().includes(search.toLowerCase());
    const matchMethod = methodFilter==="All" || pay.method===methodFilter;
    let matchDate = true;
    if(dateFilter==="today") matchDate = pay.date===todayStr();
    else if(dateFilter==="week") { const w=new Date(now); w.setDate(now.getDate()-7); matchDate=new Date(pay.date)>=w; }
    else if(dateFilter==="month") matchDate = pay.date?.startsWith(now.toISOString().slice(0,7));
    else if(dateFilter==="year") matchDate = pay.date?.startsWith(String(now.getFullYear()));
    return matchSearch && matchMethod && matchDate;
  });

  // Stats
  const totalReceived = payments.reduce((s,p)=>s+Number(p.amount),0);
  const thisMonth = payments.filter(p=>p.date?.startsWith(now.toISOString().slice(0,7))).reduce((s,p)=>s+Number(p.amount),0);
  const reconciled = payments.filter(p=>p.status==="Reconciled").length;
  const partial = payments.filter(p=>p.status==="Partial").length;
  const methodTotals = allMethods.map(m=>({ method:m, total:payments.filter(p=>p.method===m).reduce((s,p)=>s+Number(p.amount),0) })).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);

  // Reports data
  const last6Months = Array.from({length:6},(_,i)=>{ const d=new Date(now); d.setMonth(d.getMonth()-i); return d.toISOString().slice(0,7); }).reverse();
  const monthlyData = last6Months.map(ym=>({
    label: new Date(ym+"-01").toLocaleDateString("en-GB",{month:"short",year:"2-digit"}),
    total: payments.filter(p=>p.date?.startsWith(ym)).reduce((s,p)=>s+Number(p.amount),0),
    count: payments.filter(p=>p.date?.startsWith(ym)).length,
  }));
  const maxMonthly = Math.max(...monthlyData.map(m=>m.total),1);

  const customerTotals = customers.map(c=>({ name:c.name, total:payments.filter(p=>p.customer_id===c.id).reduce((s,p)=>s+Number(p.amount),0), count:payments.filter(p=>p.customer_id===c.id).length })).filter(x=>x.total>0).sort((a,b)=>b.total-a.total).slice(0,6);

  const PAYSTATUS_COLOR = { Reconciled:"#16A34A", Partial:"#D97706", Unlinked:"#6B7280" };

  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1200, fontFamily:ff }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:"clamp(18px,4vw,24px)", fontWeight:800, color:"#1A1A1A", margin:"0 0 3px" }}>Payments Received</h1>
          <p style={{ color:"#AAA", fontSize:13, margin:0 }}>Record and reconcile incoming payments</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {payments.length>0 && <Btn onClick={()=>exportCSV(filtered)} variant="outline" icon={<Icons.Download />}>Export CSV</Btn>}
          <Btn onClick={()=>setModal({ mode:"new" })} variant="primary" icon={<Icons.Plus />}>Record Payment</Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"Total Received", value:fmt("£",totalReceived), color:"#16A34A", icon:<Icons.Payments /> },
          { label:"This Month", value:fmt("£",thisMonth), color:"#2563EB", icon:<Icons.Receipt /> },
          { label:"Reconciled", value:reconciled, color:"#16A34A", isCount:true, icon:<Icons.Check /> },
          { label:"Partial Payments", value:partial, color:"#D97706", isCount:true, icon:<Icons.Info /> },
        ].map(s=>(
          <div key={s.label} style={{ background:"#fff", borderRadius:12, padding:"14px 16px", border:"1px solid #EBEBEB" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
              <div style={{ color:s.color, opacity:0.7 }}>{s.icon}</div>
              <div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
            </div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:3, background:"#F0F0F0", padding:3, borderRadius:8, marginBottom:16, width:"fit-content" }}>
        {[["list","Payments List"],["reports","Reports & Analytics"]].map(([t,l])=>(
          <button key={t} onClick={()=>setActiveTab(t)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:6, border:"none", background:activeTab===t?"#1A1A1A":"transparent", color:activeTab===t?"#fff":"#888", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:ff }}>
            {t==="list"?<Icons.Receipt />:<Icons.Filter />}{l}
          </button>
        ))}
      </div>

      {activeTab==="reports" ? (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Monthly bar chart */}
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"18px 22px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#1A1A1A" }}>Monthly Revenue</div>
              <Btn onClick={()=>exportCSV(payments)} variant="outline" size="sm" icon={<Icons.Download />}>Export All CSV</Btn>
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:140 }}>
              {monthlyData.map(m=>(
                <div key={m.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#888" }}>{m.total>0?fmt("£",m.total):""}</div>
                  <div style={{ width:"100%", background:m.total>0?"#1A1A1A":"#F0F0F0", borderRadius:"4px 4px 0 0", height:`${Math.max(4,(m.total/maxMonthly)*100)}px`, transition:"height 0.3s", position:"relative", minHeight:4 }}>
                    {m.count>0 && <div style={{ position:"absolute", top:-20, left:"50%", transform:"translateX(-50%)", fontSize:10, color:"#AAA", whiteSpace:"nowrap" }}>{m.count} pay</div>}
                  </div>
                  <div style={{ fontSize:11, color:"#AAA", fontWeight:600 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16 }}>
            {/* Method breakdown */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"18px 22px" }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#1A1A1A", marginBottom:14 }}>By Payment Method</div>
              {methodTotals.length===0 ? <div style={{ color:"#CCC", fontSize:13 }}>No data yet</div> : methodTotals.map(({ method:m, total:t })=>{
                const pct = totalReceived>0?Math.round((t/totalReceived)*100):0;
                return (
                  <div key={m} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:"#555" }}>{m}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:"#1A1A1A" }}>{fmt("£",t)} <span style={{ color:"#AAA", fontWeight:400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height:6, background:"#F0F0F0", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:"#1A1A1A", borderRadius:3, transition:"width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top customers */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"18px 22px" }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#1A1A1A", marginBottom:14 }}>Top Customers</div>
              {customerTotals.length===0 ? <div style={{ color:"#CCC", fontSize:13 }}>No data yet</div> : customerTotals.map((c,i)=>(
                <div key={c.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:i<customerTotals.length-1?"1px solid #F7F7F7":"none" }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"#F0F0F0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#555", flexShrink:0 }}>{c.name[0]}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#1A1A1A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                    <div style={{ fontSize:11, color:"#AAA" }}>{c.count} payment{c.count!==1?"s":""}</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#E86C4A" }}>{fmt("£",c.total)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Reconciliation status */}
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"18px 22px" }}>
            <div style={{ fontSize:14, fontWeight:800, color:"#1A1A1A", marginBottom:14 }}>Invoice Reconciliation Status</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
              {[
                { label:"Fully Paid Invoices", value:invoices.filter(i=>i.status==="Paid").length, color:"#16A34A", sub:`${fmt("£",invoices.filter(i=>i.status==="Paid").reduce((s,i)=>s+i.total,0))} collected` },
                { label:"Outstanding Invoices", value:invoices.filter(i=>i.status==="Sent"||i.status==="Overdue").length, color:"#D97706", sub:`${fmt("£",invoices.filter(i=>i.status==="Sent"||i.status==="Overdue").reduce((s,i)=>s+(i.total-(i.amount_paid||0)),0))} outstanding` },
                { label:"Partial Payments", value:payments.filter(p=>p.status==="Partial").length, color:"#2563EB", sub:"awaiting balance" },
                { label:"Unlinked Payments", value:payments.filter(p=>p.status==="Unlinked").length, color:"#6B7280", sub:"not tied to invoice" },
              ].map(s=>(
                <div key={s.label} style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 16px", border:"1px solid #EBEBEB" }}>
                  <div style={{ fontSize:22, fontWeight:900, color:s.color, marginBottom:4 }}>{s.value}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#1A1A1A" }}>{s.label}</div>
                  <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Method breakdown strip */}
          {methodTotals.length>0 && (
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"14px 18px", marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>By Payment Method</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                {methodTotals.map(({ method:m, total:t })=>{
                  const pct = totalReceived>0 ? Math.round((t/totalReceived)*100) : 0;
                  return (
                    <div key={m} style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 14px", background:"#F7F7F5", borderRadius:9, border:"1px solid #EBEBEB", flex:"1 1 140px", cursor:"pointer" }}
                      onClick={()=>setMethodFilter(methodFilter===m?"All":m)}>
                      <div style={{ width:32, height:32, borderRadius:8, background:methodFilter===m?"#E86C4A":"#1A1A1A", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", flexShrink:0 }}><Icons.Bank /></div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#1A1A1A" }}>{m}</div>
                        <div style={{ fontSize:13, fontWeight:800, color:"#E86C4A" }}>{fmt("£",t)}</div>
                      </div>
                      <div style={{ marginLeft:"auto", fontSize:11, color:"#AAA", fontWeight:700 }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:160, position:"relative" }}>
              <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#AAA" }}><Icons.Search /></div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by invoice, customer, reference…"
                style={{ width:"100%", padding:"9px 12px 9px 32px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", background:"#fff", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:2, background:"#F0F0F0", padding:3, borderRadius:8 }}>
              {[["all","All Time"],["month","This Month"],["week","This Week"],["today","Today"]].map(([v,l])=>(
                <button key={v} onClick={()=>setDateFilter(v)} style={{ padding:"5px 10px", borderRadius:6, border:"none", background:dateFilter===v?"#1A1A1A":"transparent", color:dateFilter===v?"#fff":"#888", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:ff }}>{l}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:2, background:"#F0F0F0", padding:3, borderRadius:8, flexWrap:"wrap" }}>
              {["All",...allMethods.slice(0,6)].map(m=>(
                <button key={m} onClick={()=>setMethodFilter(m)} style={{ padding:"5px 10px", borderRadius:6, border:"none", background:methodFilter===m?"#1A1A1A":"transparent", color:methodFilter===m?"#fff":"#888", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:ff }}>{m}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:620 }}>
              <thead>
                <tr style={{ background:"#FAFAFA", borderBottom:"1px solid #F0F0F0" }}>
                  {["Payment #","Date","Customer","Invoice","Method","Amount","Status",""].map(h=>(
                    <th key={h} style={{ padding:"9px 16px", textAlign:h==="Amount"?"right":"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(pay=>{
                  const inv = invoices.find(i=>i.id===pay.invoice_id);
                  return (
                    <tr key={pay.id} style={{ borderBottom:"1px solid #F7F7F7" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", color:"#16A34A", flexShrink:0 }}><Icons.Receipt /></div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{pay.payment_number}</div>
                            {pay.reference && <div style={{ fontSize:11, color:"#AAA" }}>Ref: {pay.reference}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"12px 16px", fontSize:13, color:"#555", whiteSpace:"nowrap" }}>{fmtDate(pay.date)}</td>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>{pay.customer_name||"—"}</div>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        {pay.invoice_number ? (
                          <div>
                            <button onClick={()=>onNavigate?.("invoices")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:"#2563EB", fontFamily:ff, padding:0, display:"flex", alignItems:"center", gap:4 }}>
                              <Icons.Link />{pay.invoice_number}
                            </button>
                            {inv && <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>Due: {fmt(CUR_SYM[inv.currency]||"£", inv.total)}</div>}
                          </div>
                        ) : (
                          <span style={{ fontSize:12, color:"#CCC", display:"flex", alignItems:"center", gap:4 }}><Icons.Unlink />Standalone</span>
                        )}
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:24, height:24, borderRadius:6, background:"#F4F4F4", display:"flex", alignItems:"center", justifyContent:"center", color:"#555" }}><Icons.Bank /></div>
                          <span style={{ fontSize:13, color:"#555" }}>{pay.method}</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 16px", textAlign:"right" }}>
                        <div style={{ fontSize:14, fontWeight:800, color:"#1A1A1A" }}>{fmt(CUR_SYM[pay.currency]||"£", pay.amount)}</div>
                        {pay.status==="Partial" && inv && (
                          <div style={{ fontSize:11, color:"#D97706" }}>+{fmt(CUR_SYM[inv.currency]||"£", Math.max(0,inv.total-(inv.amount_paid||0)))} due</div>
                        )}
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <Tag color={PAYSTATUS_COLOR[pay.status]||"#6B7280"}>{pay.status}</Tag>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", gap:4 }}>
                          <Btn onClick={()=>setModal({ mode:"edit", payment:pay })} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
                          <Btn onClick={()=>setDeleteConfirm(pay)} variant="ghost" size="sm" icon={<Icons.Trash />} style={{ color:"#DC2626" }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0 && (
                  <tr><td colSpan={8} style={{ padding:"52px 20px", textAlign:"center" }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, color:"#CCC" }}>
                      <Icons.Payments />
                      <p style={{ fontSize:14, color:"#BBB", margin:0 }}>{payments.length===0?"No payments recorded yet.":"No payments match your filters."}</p>
                      {payments.length===0 && <Btn onClick={()=>setModal({ mode:"new" })} variant="outline" icon={<Icons.Plus />}>Record your first payment</Btn>}
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length>0 && (
            <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 4px 0", flexWrap:"wrap", gap:8 }}>
              <span style={{ fontSize:12, color:"#AAA" }}>{filtered.length} payment{filtered.length!==1?"s":""} shown</span>
              <div style={{ display:"flex", gap:16 }}>
                <span style={{ fontSize:12, color:"#AAA" }}>Reconciled: <strong style={{ color:"#16A34A" }}>{filtered.filter(p=>p.status==="Reconciled").length}</strong></span>
                <span style={{ fontSize:12, color:"#AAA" }}>Partial: <strong style={{ color:"#D97706" }}>{filtered.filter(p=>p.status==="Partial").length}</strong></span>
                <span style={{ fontSize:13, fontWeight:800, color:"#1A1A1A" }}>Total: {fmt("£", filtered.reduce((s,p)=>s+Number(p.amount),0))}</span>
              </div>
            </div>
          )}
        </>
      )}

      {modal && <PaymentModal existing={modal.mode==="edit"?modal.payment:null} onClose={()=>setModal(null)} onSave={onSave} />}

      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:"28px 24px", maxWidth:380, width:"100%", textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.18)", fontFamily:ff }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:"#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", color:"#DC2626", margin:"0 auto 14px" }}><Icons.Trash /></div>
            <h3 style={{ margin:"0 0 8px", fontSize:16, fontWeight:800, color:"#1A1A1A" }}>Delete {deleteConfirm.payment_number}?</h3>
            <p style={{ margin:"0 0 20px", fontSize:13, color:"#888", lineHeight:1.6 }}>
              This will remove the payment record{deleteConfirm.invoice_id ? " and reverse the reconciliation on the linked invoice." : "."}
            </p>
            <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
              <Btn onClick={()=>setDeleteConfirm(null)} variant="outline">Cancel</Btn>
              <Btn onClick={()=>onDelete(deleteConfirm)} variant="accent" icon={<Icons.Trash />}>Delete Payment</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("auth"); // auth | setup | app
  const [activePage, setActivePage] = useState("home");
  const [orgSettings, setOrgSettings] = useState(null);
  const [user, setUser] = useState({ name:"Alex Morgan", role:"Admin", email:"alex@example.com" });
  const [showUserEdit, setShowUserEdit] = useState(false);
  const [pdfTemplate, setPdfTemplate] = useState("classic");
  const [catalogItems, setCatalogItems] = useState(MOCK_ITEMS_INIT);
  const [customers, setCustomers] = useState(MOCK_CUSTOMERS);
  const [invoices, setInvoices] = useState(MOCK_INV_LIST);
  const [quotes, setQuotes] = useState(MOCK_QUOTES_LIST);
  const [payments, setPayments] = useState(MOCK_PAYMENTS);
  const [customPayMethods, setCustomPayMethods] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [appTheme, setAppTheme] = useState({ type:"solid", color:"#1A1A1A", color2:"#E86C4A", accent:"#E86C4A" });
  const [userAvatar, setUserAvatar] = useState(null); // base64 photo

  if(screen==="auth") return <AuthPage onAuth={(u)=>{ setUser(u); setScreen("setup"); }} />;
  if(screen==="setup") return <OrgSetupPage onComplete={data=>{ setOrgSettings(data); setScreen("app"); }} initialData={orgSettings} />;

  const ctx = { orgSettings, catalogItems, setCatalogItems, customers, setCustomers, invoices, setInvoices, quotes, setQuotes, payments, setPayments, customPayMethods, setCustomPayMethods, appTheme, setAppTheme, userAvatar, setUserAvatar, sidebarPinned, setSidebarPinned, pdfTemplate, setPdfTemplate };

  const renderPage = () => {
    switch(activePage) {
      case "home":      return <HomePage user={user} onNavigate={setActivePage} />;
      case "customers": return <CustomersPage />;
      case "items":     return <ItemsPage />;
      case "quotes":    return <QuotesPage onNavigate={setActivePage} />;
      case "invoices":  return <InvoicesPage />;
      case "payments":  return <PaymentsPage onNavigate={setActivePage} />;
      case "settings":  return <SettingsPage onOrgSetup={()=>setScreen("setup")} pdfTemplate={pdfTemplate} setPdfTemplate={setPdfTemplate} />;
      default:          return <HomePage user={user} />;
    }
  };

  const sidebarBg = appTheme.type==="gradient"
    ? `linear-gradient(160deg, ${appTheme.color} 0%, ${appTheme.color2} 100%)`
    : appTheme.color;
  const sidebarW = sidebarPinned ? SIDEBAR_FULL : SIDEBAR_ICON;

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{ display:"flex", minHeight:"100vh", background:"#F7F7F5" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Instrument+Sans:wght@400;500;600;700;800&display=swap');
          *{box-sizing:border-box} body{margin:0}
          @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
          ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#DDD;border-radius:10px}
          @media(max-width:768px){
            .sidebar-desktop{display:none!important}
            .mobile-topbar{display:flex!important}
            .mobile-bottom-nav{display:flex!important}
            .main-content{margin-left:0!important;padding-top:52px!important;padding-bottom:68px!important}
          }
          @media(min-width:769px){
            .mobile-topbar{display:none!important}
            .mobile-bottom-nav{display:none!important}
          }
        `}</style>

        {/* Desktop sidebar — always visible, icon-only when unpinned */}
        <div className="sidebar-desktop" style={{ width:sidebarW, minHeight:"100vh", position:"fixed", top:0, left:0, bottom:0, zIndex:100, transition:"width 0.22s cubic-bezier(.4,0,.2,1)" }}>
          <Sidebar active={activePage} setActive={setActivePage}
            user={user} onEditUser={()=>setShowUserEdit(true)}
            setMobileOpen={setMobileOpen}
            sidebarBg={sidebarBg} accent={appTheme.accent}
            pinned={sidebarPinned} onTogglePin={()=>setSidebarPinned(p=>!p)}
            userAvatar={userAvatar}
            collapsed={!sidebarPinned} />
        </div>

        {/* Mobile overlay sidebar */}
        {mobileOpen && (
          <div style={{ position:"fixed", inset:0, zIndex:500 }}>
            <div onClick={()=>setMobileOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
            <div style={{ position:"absolute", top:0, left:0, bottom:0, width:SIDEBAR_FULL, zIndex:501 }}>
              <Sidebar active={activePage} setActive={v=>{ setActivePage(v); setMobileOpen(false); }}
                user={user} onEditUser={()=>{ setShowUserEdit(true); setMobileOpen(false); }}
                setMobileOpen={setMobileOpen}
                sidebarBg={sidebarBg} accent={appTheme.accent}
                pinned={true} onTogglePin={()=>{}} userAvatar={userAvatar} collapsed={false} />
            </div>
          </div>
        )}

        <MobileTopBar activePage={activePage} onMenuOpen={()=>setMobileOpen(true)} onNavigate={setActivePage} sidebarBg={sidebarBg} />
        <main className="main-content" style={{ marginLeft:sidebarW, flex:1, overflowY:"auto", transition:"margin-left 0.22s cubic-bezier(.4,0,.2,1)" }}>{renderPage()}</main>
        <MobileBottomNav active={activePage} setActive={setActivePage} />
        {showUserEdit && (
          <UserEditModal user={user} onClose={()=>setShowUserEdit(false)} onSave={u=>setUser(u)}
            userAvatar={userAvatar} setUserAvatar={setUserAvatar}
            appTheme={appTheme} setAppTheme={setAppTheme}
            sidebarPinned={sidebarPinned} setSidebarPinned={setSidebarPinned} />
        )}
      </div>
    </AppCtx.Provider>
  );
}
