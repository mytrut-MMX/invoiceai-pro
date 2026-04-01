import { useState, useRef, useEffect, useContext } from "react";
import { ff, TAX_RATES, CUR_SYM, PDF_TEMPLATES, PAYMENT_METHODS, STATUS_COLORS } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Field, Input, Select, Btn, Tag } from "../atoms";
import { fmt, fmtDate, newLine, todayStr, formatPhoneNumber } from "../../utils/helpers";
import { DEFAULT_TEMPLATE, getDefaultTemplate, getTemplateById } from "../../utils/InvoiceTemplateSchema";

const FONT_MAP = {
  inter: "'Inter', 'Lato', 'DM Sans', 'Helvetica Neue', sans-serif",
  mono: "'Courier New', monospace",
  serif: "'Georgia', serif",
};

const FIELD_LABELS = {
  companyName: "Company",
  contactName: "Contact",
  address: "Address",
  city: "City",
  country: "Country",
  phone: "Phone",
  email: "Email",
  vatNumber: "VAT",
  registrationNumber: "Reg. No.",
  website: "Website",
  accountName: "Account Name",
  bankName: "Bank",
  accountNumber: "Account",
  sortCode: "Sort Code",
  iban: "IBAN",
  swift: "SWIFT",
  routingNumber: "Routing",
};

const sortVisibleEntries = (fields = {}) =>
  Object.entries(fields)
    .filter(([, cfg]) => cfg?.visible !== false)
    .sort((a, b) => (a?.[1]?.order ?? 999) - (b?.[1]?.order ?? 999));

const buildActiveTemplate = (templateInput) => ({
  ...DEFAULT_TEMPLATE,
  ...(templateInput || {}),
  layout: { ...DEFAULT_TEMPLATE.layout, ...(templateInput?.layout || {}) },
  sections: { ...DEFAULT_TEMPLATE.sections, ...(templateInput?.sections || {}) },
  fromFields: { ...DEFAULT_TEMPLATE.fromFields, ...(templateInput?.fromFields || {}) },
  toFields: { ...DEFAULT_TEMPLATE.toFields, ...(templateInput?.toFields || {}) },
  lineItemColumns: { ...DEFAULT_TEMPLATE.lineItemColumns, ...(templateInput?.lineItemColumns || {}) },
  totalsBlock: { ...DEFAULT_TEMPLATE.totalsBlock, ...(templateInput?.totalsBlock || {}) },
  bankFields: { ...DEFAULT_TEMPLATE.bankFields, ...(templateInput?.bankFields || {}) },
  customText: { ...DEFAULT_TEMPLATE.customText, ...(templateInput?.customText || {}) },
});

// ─── CUSTOMER PICKER ──────────────────────────────────────────────────────────
export function CustomerPicker({ customers = [], value, onChange, onClear }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // close on outside click
  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = c => {
    onChange(c);
    setSearch("");
    setOpen(false);
  };

  const handleClear = e => {
    e.stopPropagation();
    onClear?.();
    setSearch("");
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleToggle = () => {
    if (value) return; // if customer selected, toggle clears
    setOpen(o => !o);
    if (!open) setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* Main control */}
      <div
        onClick={handleToggle}
        style={{
          display: "flex", alignItems: "center",
          border: `1.5px solid ${open ? "#1e6be0" : value ? "#1a1a2e" : "#E0E0E0"}`,
          borderRadius: 8, background: "#fff", cursor: value ? "default" : "pointer",
          boxShadow: open ? "0 0 0 3px rgba(30,107,224,0.10)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          minHeight: 42,
        }}>
        {value ? (
          /* ── Selected customer ── */
          <>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E86C4A22", color: "#E86C4A", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10 }}>
              {value.name?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0, padding: "0 8px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value.name}</div>
              {value.email && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value.email}</div>}
            </div>
            <button onClick={handleClear}
              title="Remove customer"
              style={{ padding: "0 12px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", fontSize: 16, flexShrink: 0, alignSelf: "stretch" }}>
              ×
            </button>
          </>
        ) : (
          /* ── Search / placeholder ── */
          <>
            <span style={{ display: "flex", alignItems: "center", paddingLeft: 10, color: "#9ca3af", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/><path d="M13.5 13.5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </span>
            <input
              ref={inputRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onClick={e => e.stopPropagation()}
              placeholder="Select or add a customer"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: ff, padding: "0 8px", background: "transparent", color: "#1a1a2e", lineHeight: "42px" }}
            />
            {/* Chevron toggle */}
            <span style={{ padding: "0 12px", display: "flex", alignItems: "center", color: "#9ca3af", flexShrink: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 512 512"
                style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}>
                <path d="M2.157 159.57c0 13.773 5.401 27.542 16.195 38.02l198.975 192.867c21.411 20.725 55.94 20.725 77.34 0L493.63 197.59c21.508-20.846 21.637-54.778.269-75.773-21.35-20.994-56.104-21.098-77.612-.26L256.004 276.93 95.721 121.562c-21.528-20.833-56.268-20.734-77.637.26C7.472 132.261 2.157 145.923 2.157 159.57z" fill="currentColor"/>
              </svg>
            </span>
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && !value && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1.5px solid #E0E0E0", borderRadius: 9,
          boxShadow: "0 8px 28px rgba(0,0,0,0.12)", zIndex: 400, maxHeight: 240, overflowY: "auto",
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>No customers found</div>
          ) : filtered.map(c => (
            <button key={c.id}
              onMouseDown={e => { e.preventDefault(); handleSelect(c); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: ff, textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f4f5f7"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E86C4A22", color: "#E86C4A", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {c.name?.[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{c.name}</div>
                {c.email && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{c.email}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LINE ITEMS TABLE ─────────────────────────────────────────────────────────
export function LineItemsTable({ items, onChange, currSymbol, catalogItems, isVat, onAddNewItem, isCISInvoice }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerQty, setPickerQty] = useState({});

  const upd = (id, f, v) => onChange(items.map(it => {
    if(it.id!==id) return it;
    const u = {...it, [f]:v};
    if (f !== 'cisApplicable') u.amount = Number(u.quantity) * Number(u.rate);
    return u;
  }));

  const addBlank = () => onChange([...items, { ...newLine(items.length), cisApplicable: !!isCISInvoice }]);
  const del = id => items.length>1 && onChange(items.filter(i=>i.id!==id));

  const activeItems = (catalogItems||[]).filter(i=>i.active);
  const filteredCat = activeItems.filter(i =>
    !pickerSearch ||
    i.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    (i.description||"").toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const cols = isVat
    ? (isCISInvoice ? "1fr 68px 84px 76px 74px 44px 28px" : "1fr 68px 84px 76px 74px 28px")
    : (isCISInvoice ? "1fr 68px 90px 80px 44px 28px"      : "1fr 68px 90px 80px 28px");
  const headers = isVat
    ? [["Description","left"],["Qty","center"],[`Rate (${currSymbol})`,"right"],["VAT","center"],["Amount","right"],...(isCISInvoice?[["CIS","center"]]:[]),["",""]]
    : [["Description","left"],["Qty","center"],[`Rate (${currSymbol})`,"right"],["Amount","right"],...(isCISInvoice?[["CIS","center"]]:[]),["",""]];

  return (
    <div>
      {/* Catalogue picker dropdown */}
      {activeItems.length > 0 && (
        <div style={{ position:"relative", marginBottom:10 }}>
          <div style={{ padding:"9px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:"#888" }}>Quick-add from items catalogue</span>
            <Btn onClick={()=>{ setPickerOpen(o=>!o); setPickerSearch(""); }} variant="outline" size="sm" icon={<Icons.Items />}>Browse Items</Btn>
          </div>
          {pickerOpen && (
            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#fff", border:"1.5px solid #1A1A1A", borderRadius:10, padding:12, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", zIndex:400 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#1A1A1A" }}>Select Item to Add</span>
                <button onClick={()=>setPickerOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA" }}><Icons.X /></button>
              </div>
              <input value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)} placeholder="Search items…" autoFocus
                style={{ width:"100%", padding:"7px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, outline:"none", marginBottom:8, boxSizing:"border-box" }} />
              <div style={{ maxHeight:220, overflowY:"auto" }}>
                {filteredCat.length===0 && <div style={{ padding:"14px 0", textAlign:"center", color:"#CCC", fontSize:13 }}>No matching items</div>}
                {filteredCat.map(ci=>{
                  const qty = Number(pickerQty[ci.id] || 1);
                  return (
                  <div key={ci.id}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 10px", borderRadius:7, fontFamily:ff }}
                    onMouseEnter={e=>e.currentTarget.style.background="#F5F5F5"}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>{ci.name}</div>
                      {ci.description && <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>{ci.description}</div>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:12 }}>
                      <input type="number" min="1" value={pickerQty[ci.id] || 1}
                        onChange={e=>setPickerQty(prev=>({ ...prev, [ci.id]: e.target.value }))}
                        style={{ width:64, padding:"6px 8px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:12, fontFamily:ff, background:"#fff", MozAppearance:"textfield" }} />
                      <button onClick={()=>{
                        const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
                        const newItem = { id:crypto.randomUUID(), name:ci.name, description:ci.description||"", quantity:safeQty, rate:ci.rate, tax_rate:isVat?(ci.taxRate||20):0, amount:ci.rate*safeQty, cisApplicable: isCISInvoice ? (ci.cisApplicable !== false) : !!ci.cisApplicable, sort_order:items.length };
                        onChange([...items, newItem]);
                        setPickerOpen(false); setPickerSearch("");
                      }}
                        style={{ padding:"6px 10px", border:"1px solid #1A1A1A", background:"#1A1A1A", color:"#fff", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                        Add
                      </button>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{fmt(currSymbol, ci.rate)}</div>
                        <div style={{ fontSize:11, color:"#AAA" }}>{ci.unit}{isVat?` · ${ci.taxRate}% VAT`:""}</div>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table headers */}
      <div style={{ display:"grid", gridTemplateColumns:cols, gap:6, paddingBottom:8, borderBottom:"1.5px solid #EBEBEB", marginBottom:8 }}>
        {headers.map(([h,a])=><div key={h} style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", textAlign:a }}>{h}</div>)}
      </div>

      {/* Rows */}
      {items.map((it,idx)=>(
        <div key={it.id} style={{ display:"grid", gridTemplateColumns:cols, gap:6, marginBottom:6, alignItems:"center" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:6 }}>
            <Input value={it.name||""} onChange={v=>upd(it.id,"name",v)} placeholder={`Item ${idx+1} name…`} />
            <Input value={it.description||""} onChange={v=>upd(it.id,"description",v)} placeholder="Description (optional)" />
          </div>
          <Input value={it.quantity} onChange={v=>upd(it.id,"quantity",v)} type="number" align="center" style={{ MozAppearance:"textfield" }} />
          <Input value={it.rate} onChange={v=>upd(it.id,"rate",v)} type="number" align="right" style={{ MozAppearance:"textfield" }} />
          {isVat && (
            <select value={it.tax_rate} onChange={e=>upd(it.id,"tax_rate",Number(e.target.value))}
              style={{ padding:"8px 4px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, background:"#FAFAFA", outline:"none", appearance:"none", textAlign:"center", cursor:"pointer", width:"100%" }}>
              {TAX_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
            </select>
          )}
          <div style={{ textAlign:"right", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{fmt(currSymbol, it.amount)}</div>
          {isCISInvoice && (
            <div style={{ display:"flex", justifyContent:"center" }}>
              <button
                onClick={() => upd(it.id, "cisApplicable", !it.cisApplicable)}
                title={it.cisApplicable ? "CIS applies — click to exclude" : "Click to apply CIS deduction"}
                style={{
                  width: 36, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                  background: it.cisApplicable ? "#D97706" : "#E5E7EB",
                  position: "relative", transition: "background 0.15s", flexShrink: 0,
                }}>
                <span style={{
                  position: "absolute", top: 2, left: it.cisApplicable ? 16 : 2,
                  width: 18, height: 18, borderRadius: "50%", background: "#fff",
                  transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
          )}
          <button onClick={()=>del(it.id)} disabled={items.length===1}
            style={{ width:26, height:26, border:"none", background:"none", cursor:items.length===1?"not-allowed":"pointer", color:"#DDD", display:"flex", alignItems:"center", justifyContent:"center" }}
            onMouseEnter={e=>{ if(items.length>1) e.currentTarget.style.color="#DC2626"; }}
            onMouseLeave={e=>e.currentTarget.style.color="#DDD"}>
            <Icons.Trash />
          </button>
        </div>
      ))}

      {/* Add line item buttons */}
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <Btn onClick={addBlank} variant="ghost" size="sm" icon={<Icons.Plus />} style={{ color:"#E86C4A" }}>Add Line Item</Btn>
        {onAddNewItem && (
          <Btn onClick={onAddNewItem} variant="ghost" size="sm" icon={<Icons.Items />} style={{ color:"#4F46E5" }}>Create New Item</Btn>
        )}
      </div>
    </div>
  );
}

// ─── TOTALS BLOCK ─────────────────────────────────────────────────────────────
export function TotalsBlock({ subtotal, discountType, discountValue, setDiscountType, setDiscountValue, shipping, setShipping, taxBreakdown, total, currSymbol, isVat, cisDeduction, showShipping = true }) {
  const discAmt = discountType==="percent" ? subtotal*(Number(discountValue)/100) : Math.min(Number(discountValue), subtotal);
  const R = ({ label, value, color }) => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0" }}>
      <span style={{ fontSize:13, color:color||"#666" }}>{label}</span>
      <span style={{ fontSize:13, color:color||"#444", fontWeight:500 }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background:"#FAFAFA", borderRadius:10, border:"1px solid #EBEBEB", padding:"14px 16px", minWidth:260 }}>
      <R label="Subtotal" value={fmt(currSymbol, subtotal)} />
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
      {discAmt>0 && <R label="" value={`− ${fmt(currSymbol, discAmt)}`} color="#E86C4A" />}
      {showShipping && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0" }}>
          <span style={{ fontSize:13, color:"#666" }}>Shipping</span>
          <input value={shipping} onChange={e=>setShipping(e.target.value)} type="number" min="0" placeholder="0.00" inputMode="decimal"
            style={{ width:86, padding:"4px 6px", border:"1.5px solid #E0E0E0", borderRadius:6, fontSize:13, textAlign:"right", fontFamily:ff, background:"#fff", outline:"none" }} />
        </div>
      )}
      {isVat && taxBreakdown.map(tb=><R key={tb.rate} label={`VAT ${tb.rate}%`} value={fmt(currSymbol, tb.amount)} />)}
      {cisDeduction>0 && <R label="CIS Deduction" value={`− ${fmt(currSymbol, cisDeduction)}`} color="#D97706" />}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0 2px", borderTop:"2px solid #1A1A1A", marginTop:6 }}>
        <span style={{ fontSize:14, fontWeight:800, color:"#1A1A1A" }}>Total Due</span>
        <span style={{ fontSize:16, fontWeight:800, color:"#1A1A1A" }}>{fmt(currSymbol, total)}</span>
      </div>
      {cisDeduction>0 && (
        <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", marginTop:2 }}>
          <span style={{ fontSize:11, color:"#AAA" }}>Gross (before CIS)</span>
          <span style={{ fontSize:11, color:"#AAA" }}>{fmt(currSymbol, total+cisDeduction)}</span>
        </div>
      )}
    </div>
  );
}

// ─── SAVE SPLIT BUTTON ────────────────────────────────────────────────────────
export function SaveSplitBtn({ onSave, onSaveAndSend, onSaveAndPrint, saving }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    const h = e=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return ()=>document.removeEventListener("mousedown", h);
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
            { label:"Save",         icon:<Icons.Save />,    action:onSave },
            { label:"Save & Send",  icon:<Icons.Send />,    action:onSaveAndSend },
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
export function PaidConfirmModal({ invoice, onConfirm, onCancel }) {
  const { customPayMethods } = useContext(AppCtx);
  const allMethods = [...PAYMENT_METHODS, ...(customPayMethods||[])];
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

// ─── A4 INVOICE DOCUMENT ──────────────────────────────────────────────────────
export function A4InvoiceDoc({ data, currSymbol, isVat, orgSettings, accentColor, template = "classic", footerText = "", templateConfig, invoiceTemplate }) {
  const { docNumber, customer, issueDate, dueDate, paymentTerms, items, subtotal, discountAmount, shipping, taxBreakdown, cisDeduction, total, notes, terms, docType } = data;
  const isQuote = docType === "quote";
  const docLabel = isQuote ? "Quote" : "Invoice";
  const docLabelUpper = docLabel.toUpperCase();
  const sym = currSymbol||"£";
  const org = orgSettings||{};
  const tplDef = PDF_TEMPLATES.find(t=>t.id===template)||PDF_TEMPLATES[0];
  const activeSchemaTemplate = buildActiveTemplate(invoiceTemplate || getDefaultTemplate());
  const accent = accentColor || activeSchemaTemplate.layout?.accentColor || templateConfig?.accentColor || tplDef.defaultAccent;
  const fontFamily = FONT_MAP[activeSchemaTemplate.layout?.fontFamily] || FONT_MAP.inter;
  const fromEntries = sortVisibleEntries(activeSchemaTemplate.fromFields);
  const toEntries = sortVisibleEntries(activeSchemaTemplate.toFields);
  const bankEntries = sortVisibleEntries(activeSchemaTemplate.bankFields);
  const visibleLineColumns = sortVisibleEntries(activeSchemaTemplate.lineItemColumns);

  const fromData = {
    companyName: org.orgName || "",
    address: org.street || "",
    city: org.city || "",
    country: org.country || "",
    phone: org.phone || "",
    email: org.email || "",
    vatNumber: org.vatNum || "",
    registrationNumber: org.crn || "",
    website: org.website || "",
  };

  const toData = {
    companyName: customer?.companyName || customer?.name || "",
    contactName: customer?.name || "",
    address: customer?.billingAddress?.street || "",
    city: customer?.billingAddress?.city || "",
    country: customer?.billingAddress?.country || "",
    email: customer?.email || "",
    vatNumber: customer?.vatNumber || "",
    phone: customer?.phone || "",
  };

  const bankData = {
    bankName: org.bankName || "",
    accountName: org.accountName || org.orgName || "",
    accountNumber: org.bankAcc || "",
    sortCode: org.bankSort || "",
    iban: org.bankIban || "",
    swift: org.bankSwift || "",
    routingNumber: org.routingNumber || "",
  };

  const OrgBlock = ({ dark=false }) => (
    <div>
      {org.logo && <img src={org.logo} alt="logo" style={{ maxHeight:(templateConfig?.logoSize||org.logoSize||52), maxWidth:200, objectFit:"contain", display:"block", marginBottom:5, marginLeft:(templateConfig?.logoPosition||"left")==="right"?"auto":0, marginRight:(templateConfig?.logoPosition||"left")==="center"?"auto":0 }} />}
      {(activeSchemaTemplate.sections?.fromBlock ? fromEntries : [["companyName"]]).map(([fieldKey]) => (
        <div key={fieldKey} style={{ fontSize: fieldKey === "companyName" ? "15pt" : "7.5pt", fontWeight: fieldKey === "companyName" ? 900 : 500, color:dark?"#fff":(fieldKey === "companyName" ? accent : "#666"), letterSpacing:fieldKey === "companyName" ? "-0.01em" : "normal", marginTop: fieldKey === "companyName" ? 0 : 2 }}>
          {fieldKey === "companyName" ? (fromData[fieldKey] || "Your Company") : <><strong>{FIELD_LABELS[fieldKey] || fieldKey}:</strong> {fromData[fieldKey] || "—"}</>}
        </div>
      ))}
    </div>
  );

  const InvoiceMetaBlock = ({ dark=false }) => (
    <div>
      <div style={{ fontSize:"7pt", fontWeight:700, color:dark?"rgba(255,255,255,0.5)":"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"3mm" }}>{docLabel} Details</div>
      {[[`${docLabel} No`, docNumber||"INV-0001"],["Issue Date", fmtDate(issueDate)],[isQuote ? "Valid Until" : "Due Date", fmtDate(dueDate)],[isQuote ? "Validity" : "Payment Terms", paymentTerms||(isQuote ? "Valid 30 days" : "Net 30")]].map(([l,v])=>(
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
      {customer ? toEntries.map(([fieldKey]) => (
        <div key={fieldKey} style={{ fontSize:"8.5pt", color:dark?"rgba(255,255,255,0.7)":"#555", marginTop:2 }}>
          <strong>{FIELD_LABELS[fieldKey] || fieldKey}:</strong>{" "}
          {fieldKey === "phone" ? formatPhoneNumber(toData[fieldKey] || "") : (toData[fieldKey] || "—")}
        </div>
      )) : <div style={{ fontSize:"9pt", color:"#CCC", fontStyle:"italic" }}>No customer selected</div>}
    </div>
  );

  const ItemsTable = ({ headerBg=accent, headerColor="#fff", stripeBg="#FAFAFA" }) => (
    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"5mm" }}>
      <thead>
        <tr style={{ background:headerBg }}>
          {visibleLineColumns.map(([colKey, colCfg], i)=>(
            <th key={colKey} style={{ padding:"2.5mm 3mm", textAlign:i>0?"right":"left", fontSize:"7.5pt", fontWeight:700, color:headerColor, letterSpacing:"0.04em" }}>{colCfg?.label || colKey}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(items||[]).filter(it=>(it.name||it.description)||it.amount>0).map((it,idx)=>(
          <tr key={it.id||idx} style={{ background:idx%2===0?stripeBg:"#fff" }}>
            {visibleLineColumns.map(([colKey], i) => {
              const isDesc = i === 0;
              const cellStyle = { padding:"2.5mm 3mm", fontSize:"9pt", textAlign:isDesc?"left":"right", color:isDesc?"#1A1A1A":"#666" };
              if (colKey === "description") return <td key={colKey} style={cellStyle}><div style={{ fontWeight:700 }}>{it.name||`Item ${idx+1}`}</div>{it.description && <div style={{ fontSize:"8pt", color:"#666", marginTop:1 }}>{it.description}</div>}</td>;
              if (colKey === "quantity") return <td key={colKey} style={cellStyle}>{it.quantity}</td>;
              if (colKey === "unitPrice") return <td key={colKey} style={cellStyle}>{fmt(sym,it.rate)}</td>;
              if (colKey === "tax") return <td key={colKey} style={cellStyle}>{isVat ? `${it.tax_rate}%` : "—"}</td>;
              if (colKey === "discount") return <td key={colKey} style={cellStyle}>{fmt(sym,it.discount || 0)}</td>;
              return <td key={colKey} style={{ ...cellStyle, fontWeight:700 }}>{fmt(sym,it.amount)}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const TotalsSection = () => (
    <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"5mm" }}>
      <div style={{ minWidth:"62mm" }}>
        {[["Subtotal",fmt(sym,subtotal||0)],
          ...((discountAmount||0)>0?[["Discount",`− ${fmt(sym,discountAmount)}`,"#E86C4A"]]:[]),
          ...(Number(shipping)>0?[["Shipping",fmt(sym,shipping)]]:[]),
          ...(isVat?(taxBreakdown||[]).map(tb=>[`VAT ${tb.rate}%`,fmt(sym,tb.amount)]):[]),
          ...((cisDeduction||0)>0?[["CIS Deduction",`− ${fmt(sym,cisDeduction)}`,"#D97706"]]:[]),
        ].map(([l,v,c])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", gap:"8mm", padding:"1.5mm 0", borderBottom:"1px solid #F4F4F4" }}>
            <span style={{ fontSize:"8.5pt", color:"#888" }}>{l}</span>
            <span style={{ fontSize:"8.5pt", color:c||"#555" }}>{v}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", gap:"8mm", padding:"3mm 4mm 2mm", background:accent, borderRadius:4, marginTop:2 }}>
          <span style={{ fontSize:"10pt", fontWeight:800, color:"#fff" }}>{isQuote ? "Quote Total" : "Total Due"}</span>
          <span style={{ fontSize:"11pt", fontWeight:900, color:"#fff" }}>{fmt(sym,total||0)}</span>
        </div>
      </div>
    </div>
  );

  const NotesSection = () => (templateConfig?.showNotesField===false?false:(notes||terms)) ? (
    <div style={{ borderTop:"1px solid #EBEBEB", paddingTop:"4mm", display:"grid", gridTemplateColumns:notes&&terms?"1fr 1fr":"1fr", gap:"6mm" }}>
      {notes && <div><div style={{ fontSize:"7pt", fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"2mm" }}>Notes</div><p style={{ fontSize:"8pt", color:"#555", margin:0, lineHeight:1.7 }}>{notes}</p></div>}
      {terms && <div><div style={{ fontSize:"7pt", fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"2mm" }}>Payment Terms</div><p style={{ fontSize:"8pt", color:"#555", margin:0, lineHeight:1.7 }}>{terms}</p></div>}
    </div>
  ) : null;

  const FooterBar = () => (
    <div style={{ position:"absolute", bottom:"10mm", left:"18mm", right:"18mm", borderTop:"1px solid #EBEBEB", paddingTop:"2.5mm" }}>
      {(activeSchemaTemplate.customText?.footerNote || footerText)
        ? <div style={{ fontSize:"7pt", color:"#888", textAlign:"center", lineHeight:1.6 }}>{activeSchemaTemplate.customText?.footerNote || footerText}</div>
        : <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:"7pt", color:"#CCC" }}>{org.orgName||""}{org.vatNum?` · VAT ${org.vatNum}`:""}{org.crn?` · CRN ${org.crn}`:""}</span>
            <span style={{ fontSize:"7pt", color:"#CCC" }}>{org.email||""}</span>
          </div>
      }
    </div>
  );

  const base = { width:"210mm", minHeight:"297mm", background:"#fff", fontFamily, boxSizing:"border-box", fontSize:"10pt", color:"#1A1A1A", position:"relative" };

  const FromBlock = ({ dark = false }) => (
    <div>
      <div style={{ fontSize:"7pt", fontWeight:700, color:dark?"rgba(255,255,255,0.5)":"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"3mm" }}>From</div>
      {fromEntries.map(([fieldKey]) => (
        <div key={fieldKey} style={{ fontSize:"8.5pt", color:dark?"rgba(255,255,255,0.7)":"#555", marginTop:2 }}>
          <strong>{FIELD_LABELS[fieldKey] || fieldKey}:</strong> {fromData[fieldKey] || "—"}
        </div>
      ))}
    </div>
  );

  const BankDetailsBlock = () => activeSchemaTemplate.sections?.bankDetails && bankEntries.length > 0 ? (
    <div style={{ borderTop:"1px solid #EBEBEB", marginTop:"3mm", paddingTop:"3mm" }}>
      <div style={{ fontSize:"7pt", fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"2mm" }}>Bank Details</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"2mm 6mm" }}>
        {bankEntries.map(([fieldKey]) => (
          <div key={fieldKey} style={{ fontSize:"8pt", color:"#666" }}>
            <strong>{FIELD_LABELS[fieldKey] || fieldKey}:</strong> {bankData[fieldKey] || "—"}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  if(template==="modern") return (
    <div id="a4-invoice-doc" style={{ ...base, display:"flex", flexDirection:"column", padding:0 }}>
      <div style={{ display:"grid", gridTemplateColumns:"42% 58%" }}>
        <div style={{ background:accent, padding:"14mm 12mm 10mm 14mm", minHeight:"62mm" }}>
          <OrgBlock dark /><div style={{ marginTop:"8mm" }}><BillToBlock dark /></div>
        </div>
        <div style={{ padding:"14mm 14mm 10mm 12mm", background:"#fff" }}>
          <div style={{ fontSize:"28pt", fontWeight:900, color:accent, letterSpacing:"-0.02em", lineHeight:1 }}>{docLabelUpper}</div>
          <div style={{ fontSize:"12pt", fontWeight:700, color:"#555", marginTop:3, marginBottom:"6mm" }}>{docNumber||"INV-0001"}</div>
          <InvoiceMetaBlock />
        </div>
      </div>
      <div style={{ padding:"8mm 14mm 14mm" }}>
        <ItemsTable headerBg={`${accent}18`} headerColor={accent} stripeBg="#F0F7FF" />
        <TotalsSection /><NotesSection /><BankDetailsBlock />
      </div>
      <FooterBar />
    </div>
  );

  if(template==="minimal") return (
    <div id="a4-invoice-doc" style={{ ...base, padding:"14mm 18mm 16mm" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8mm" }}>
        <OrgBlock />
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"10pt", fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.14em" }}>{docLabel}</div>
          <div style={{ fontSize:"18pt", fontWeight:900, color:accent, marginTop:1 }}>{docNumber||"INV-0001"}</div>
        </div>
      </div>
      <div style={{ height:2, background:`linear-gradient(90deg,${accent},${accent}44)`, marginBottom:"7mm", borderRadius:1 }} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8mm", marginBottom:"7mm" }}>
        <BillToBlock /><InvoiceMetaBlock />
      </div>
      <ItemsTable headerBg={`${accent}15`} headerColor={accent} stripeBg="#FAFAFA" />
      <TotalsSection /><NotesSection /><BankDetailsBlock /><FooterBar />
    </div>
  );

  if(template==="branded") return (
    <div id="a4-invoice-doc" style={{ ...base, padding:0 }}>
      <div style={{ background:`linear-gradient(135deg,${accent} 0%,${accent}BB 100%)`, padding:"12mm 18mm 8mm", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative" }}>
          <OrgBlock dark />
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"24pt", fontWeight:900, color:"#fff" }}>{docLabelUpper}</div>
            <div style={{ fontSize:"12pt", fontWeight:700, color:"rgba(255,255,255,0.75)", marginTop:2 }}>{docNumber||"INV-0001"}</div>
          </div>
        </div>
      </div>
      <div style={{ background:tplDef.defaultBg||"#FFF7F4", padding:"6mm 18mm 5mm", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10mm", borderBottom:`3px solid ${accent}` }}>
        <BillToBlock /><InvoiceMetaBlock />
      </div>
      <div style={{ padding:"7mm 18mm 14mm" }}>
        <ItemsTable headerBg={`${accent}22`} headerColor={accent} stripeBg="#FFFAF8" />
        <TotalsSection /><NotesSection /><BankDetailsBlock />
      </div>
      <FooterBar />
    </div>
  );

  // default: classic
  return (
    <div id="a4-invoice-doc" style={{ ...base }}>
      <div style={{ background:accent, padding:"14mm 18mm 10mm", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <OrgBlock dark />
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"22pt", fontWeight:900, color:"#fff", letterSpacing:"0.04em" }}>{docLabelUpper}</div>
          <div style={{ fontSize:"12pt", color:"rgba(255,255,255,0.8)", fontWeight:700, marginTop:2 }}>{docNumber||"INV-0001"}</div>
        </div>
      </div>
      <div style={{ padding:"8mm 18mm 14mm" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8mm", marginBottom:"8mm", paddingBottom:"6mm", borderBottom:`2px solid ${accent}` }}>
          <div>
            {activeSchemaTemplate.sections?.fromBlock && <FromBlock />}
            {activeSchemaTemplate.sections?.toBlock && <div style={{ marginTop:"4mm" }}><BillToBlock /></div>}
          </div>
          <InvoiceMetaBlock />
        </div>
        <ItemsTable headerBg={accent} headerColor="#fff" stripeBg="#F8F8F8" />
        <TotalsSection /><NotesSection /><BankDetailsBlock />
      </div>
      <FooterBar />
    </div>
  );
}

// ─── A4 PRINT MODAL ───────────────────────────────────────────────────────────
export function A4PrintModal({ data, currSymbol, isVat, onClose, _overrideTemplate, _overrideAccent }) {
  const { orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText, invoiceTemplateConfig } = useContext(AppCtx);
  const selectedInvoiceTemplate = getTemplateById(data?.templateId) || getDefaultTemplate();
  const startTpl = _overrideTemplate || pdfTemplate || "classic";
  const resolvedPrintStyle = selectedInvoiceTemplate?.layout?.colorScheme || startTpl;
  const tplDef = PDF_TEMPLATES.find(t=>t.id===resolvedPrintStyle)||PDF_TEMPLATES[0];
  const [accentColor, setAccentColor] = useState(_overrideAccent || tplDef.defaultAccent);
  const [activeTemplate, setActiveTemplate] = useState(resolvedPrintStyle);
  const [previewLogoSize, setPreviewLogoSize] = useState(Number(selectedInvoiceTemplate?.layout?.logoSize === "large" ? 80 : selectedInvoiceTemplate?.layout?.logoSize === "small" ? 36 : (invoiceTemplateConfig?.logoSize || companyLogoSize || 52)));
  
  const switchTemplate = (id) => {
    setActiveTemplate(id);
    setAccentColor(PDF_TEMPLATES.find(t=>t.id===id)?.defaultAccent||"#1A1A1A");
  };

  const handlePrint = () => {
    const el = document.getElementById("a4-invoice-doc");
    if(!el) return;
    // SEC-007: Sanitize cloned DOM before writing to new window — prevent XSS
    // via stored invoice content (e.g. malicious client names, notes)
    const clone = el.cloneNode(true);
    clone.querySelectorAll('script').forEach(s => s.remove());
    clone.querySelectorAll('*').forEach(node => {
      Array.from(node.attributes).forEach(attr => {
        if (/^on[a-z]/i.test(attr.name)) node.removeAttribute(attr.name);
      });
    });
    const safeHTML = clone.outerHTML;
    const safeTitle = (data.docNumber || "").replace(/[<>"'&]/g, "");
    const w = window.open("","_blank","width=900,height=700");
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${safeTitle}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{background:#fff;font-family:'Lato','DM Sans','Helvetica Neue',sans-serif}@page{size:A4;margin:0}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}</style>
    </head><body>${safeHTML}</body></html>`);
    w.document.close();
    setTimeout(()=>{ w.focus(); w.print(); }, 400);
  };

  return (
   <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:4000, overscrollBehaviorY:"contain", touchAction:"pan-y" }}>
      <div style={{ width:"100%", height:"100%", overflowY:"auto", WebkitOverflowScrolling:"touch", display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 16px 40px" }}>
      <div style={{ width:"100%", maxWidth:820, background:"#1A1A1A", borderRadius:"12px 12px 0 0", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Print Preview — A4</span>
          <div style={{ display:"flex", gap:5 }}>
            {PDF_TEMPLATES.map(t=>(
              <button key={t.id} onClick={()=>switchTemplate(t.id)}
                style={{ padding:"4px 10px", borderRadius:6, border:`1.5px solid ${activeTemplate===t.id?"#E86C4A":"rgba(255,255,255,0.2)"}`, background:"transparent", color:activeTemplate===t.id?"#E86C4A":"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:ff }}>
                {t.name}
              </button>
            ))}
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, color:"rgba(255,255,255,0.8)", fontSize:11, fontWeight:600 }}>
            Logo size: {previewLogoSize}px
            <input
              type="range"
              min={24}
              max={110}
              value={previewLogoSize}
              onChange={e=>setPreviewLogoSize(Number(e.target.value))}
              style={{ accentColor:"#E86C4A" }}
            />
          </label>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={onClose}
            style={{ padding:"7px 14px", borderRadius:8, border:"1.5px solid rgba(255,255,255,0.3)", background:"transparent", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:ff }}>
            Close
          </button>
          <button onClick={handlePrint}
            style={{ padding:"7px 16px", borderRadius:8, border:"none", background:"#E86C4A", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:ff, display:"flex", alignItems:"center", gap:7 }}>
            <Icons.Receipt /> Print / Save PDF
          </button>
        </div>
      </div>
      <div style={{ width:"100%", maxWidth:820, background:"#fff", boxShadow:"0 8px 40px rgba(0,0,0,0.35)", overflow:"hidden" }}>
        <A4InvoiceDoc data={data} currSymbol={currSymbol} isVat={isVat}
          orgSettings={{...orgSettings, logo:companyLogo, logoSize:previewLogoSize}}
          accentColor={accentColor} template={activeTemplate} footerText={footerText||""} templateConfig={{ ...(invoiceTemplateConfig||{}), logoSize: previewLogoSize }} invoiceTemplate={selectedInvoiceTemplate} />
      </div>
      </div>
    </div>
  );
}
