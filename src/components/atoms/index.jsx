import { useState } from "react";
import { ff } from "../../constants";
import { Icons } from "../icons";

export const Field = ({ label, children, required, hint, error }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:"block", fontSize:11, fontWeight:700, color:error?"#DC2626":"#666", marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase" }}>
      {label}{required && <span style={{ color:"#E86C4A", marginLeft:2 }}>*</span>}
    </label>}
    {children}
    {error && <div style={{ fontSize:11, color:"#DC2626", marginTop:4, display:"flex", alignItems:"center", gap:4 }}><Icons.Alert />{error}</div>}
    {!error && hint && <div style={{ fontSize:11, color:"#AAA", marginTop:3 }}>{hint}</div>}
  </div>
);

export const Input = ({ value, onChange, placeholder, type="text", style:sx={}, readOnly, align="left", error }) => (
  <input type={type} value={value??""} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly}
    style={{ width:"100%", padding:"9px 11px", border:`1px solid ${error?"#FCA5A5":"#DADADA"}`, borderRadius:5, fontSize:13, fontFamily:ff, color:"#1A1A1A", background:readOnly?"#F5F5F5":"#FAFAFA", outline:"none", boxSizing:"border-box", textAlign:align, transition:"border 0.15s", ...sx }}
    onFocus={e=>{ if(!readOnly) e.target.style.borderColor=error?"#DC2626":"#1A1A1A"; }}
    onBlur={e=>e.target.style.borderColor=error?"#FCA5A5":"#DADADA"} />
);

export const Textarea = ({ value, onChange, placeholder, rows=3 }) => (
  <textarea value={value??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ width:"100%", padding:"9px 11px", border:"1px solid #DADADA", borderRadius:5, fontSize:13, fontFamily:ff, color:"#1A1A1A", background:"#FAFAFA", outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.6, transition:"border 0.15s" }}
    onFocus={e=>e.target.style.borderColor="#1A1A1A"} onBlur={e=>e.target.style.borderColor="#E0E0E0"} />
);

export const Select = ({ value, onChange, options, placeholder, style:sx={} }) => (
  <div style={{ position:"relative" }}>
    <select value={value??""} onChange={e=>onChange(e.target.value)}
      style={{ width:"100%", padding:"9px 30px 9px 11px", border:"1px solid #DADADA", borderRadius:5, fontSize:13, fontFamily:ff, color:value?"#1A1A1A":"#999", background:"#FAFAFA", outline:"none", appearance:"none", cursor:"pointer", boxSizing:"border-box", ...sx }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <div style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"#AAA" }}><Icons.ChevDown /></div>
  </div>
);

export const Toggle = ({ value, onChange, options }) => (
  <div style={{ display:"flex", gap:5 }}>
    {options.map(o=>(
      <button key={o} onClick={()=>onChange(o)}
        style={{ flex:1, padding:"9px 0", border:`1px solid ${value===o?"#1A1A1A":"#DADADA"}`, borderRadius:5, background:value===o?"#1A1A1A":"#FAFAFA", color:value===o?"#fff":"#666", fontSize:13, fontWeight:value===o?700:400, cursor:"pointer", fontFamily:ff, transition:"all 0.18s" }}>
        {o}
      </button>
    ))}
  </div>
);

export const Switch = ({ checked, onChange }) => (
  <button onClick={()=>onChange(!checked)}
    style={{ width:40, height:22, borderRadius:11, border:"none", background:checked?"#1A1A1A":"#D1D5DB", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
    <div style={{ width:16, height:16, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:checked?21:3, transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
  </button>
);

export const SlideToggle = ({ value, onChange }) => (
  <div style={{ display:"flex", alignItems:"center", gap:9 }}>
    <span style={{ fontSize:12, fontWeight:700, color:value?"#AAA":"#DC2626", minWidth:24, textAlign:"right" }}>No</span>
    <button onClick={()=>onChange(!value)}
      style={{ width:48, height:26, borderRadius:13, border:"none", background:value?"#16A34A":"#D1D5DB", cursor:"pointer", position:"relative", transition:"background 0.25s", flexShrink:0 }}>
      <div style={{ width:20, height:20, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:value?25:3, transition:"left 0.25s", boxShadow:"0 1px 4px rgba(0,0,0,0.25)" }} />
    </button>
    <span style={{ fontSize:12, fontWeight:700, color:value?"#16A34A":"#AAA", minWidth:24 }}>Yes</span>
  </div>
);

export const Checkbox = ({ checked, onChange, label }) => (
  <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer", marginBottom:8 }}>
    <div onClick={()=>onChange(!checked)}
      style={{ width:18, height:18, minWidth:18, border:`2px solid ${checked?"#1A1A1A":"#CCC"}`, borderRadius:4, background:checked?"#1A1A1A":"#fff", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", marginTop:1 }}>
      {checked && <Icons.Check />}
    </div>
    <span style={{ fontSize:13, color:"#444", lineHeight:1.5 }}>{label}</span>
  </label>
);

export const Btn = ({ onClick, children, variant="primary", size="md", disabled, icon, style:sx={} }) => {
  const sizes = { sm:{padding:"6px 11px",fontSize:12}, md:{padding:"9px 16px",fontSize:13}, lg:{padding:"11px 22px",fontSize:14} };
  const variants = { primary:{background:"#1A1A1A",color:"#fff",border:"none"}, accent:{background:"#E86C4A",color:"#fff",border:"none"}, outline:{background:"#fff",color:"#1A1A1A",border:"1px solid #DADADA"}, ghost:{background:"transparent",color:"#555",border:"none"}, danger:{background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA"} };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", gap:7, borderRadius:6, cursor:disabled?"not-allowed":"pointer", fontFamily:ff, fontWeight:700, transition:"all 0.15s", opacity:disabled?0.5:1, whiteSpace:"nowrap", ...sizes[size], ...variants[variant], ...sx }}>
      {icon}{children}
    </button>
  );
};

export const Tag = ({ children, color="#1A1A1A" }) => (
  <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:color+"18", color }}>{children}</span>
);

export const SectionCard = ({ title, subtitle, children }) => (
  <div style={{ background:"#fff", borderRadius:10, border:"1px solid #EBEBEB", padding:"18px 20px", marginBottom:14 }}>
    {(title||subtitle) && <div style={{ marginBottom:14 }}>
      {title && <div style={{ fontSize:13, fontWeight:800, color:"#1A1A1A" }}>{title}</div>}
      {subtitle && <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{subtitle}</div>}
    </div>}
    {children}
  </div>
);

export const InfoBox = ({ children, color="#2563EB" }) => (
  <div style={{ display:"flex", gap:8, padding:"10px 12px", background:color+"10", borderRadius:6, border:`1px solid ${color}30`, marginTop:8 }}>
    <div style={{ color, marginTop:1, flexShrink:0 }}><Icons.Info /></div>
    <p style={{ margin:0, fontSize:12, color, lineHeight:1.6 }}>{children}</p>
  </div>
);

export const ExpandSection = ({ title, children, defaultOpen=false }) => {
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

export const AddressForm = ({ address={}, onChange, label }) => {
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
        <Field label="Country">
          <Select value={address.country} onChange={v=>u("country",v)} options={["United Kingdom","Australia","Austria","Belgium","Brazil","Canada","United States"]} placeholder="Select…" />
        </Field>
      </div>
    </div>
  );
};

export const PaymentTermsField = ({ value, onChange, customDays, onCustomDaysChange }) => {
  const PAYMENT_TERMS_OPTS = ["Due on Receipt","Net 7","Net 14","Net 30","Net 60","Net 90","Custom"];
  return (
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
};
