import { useState, useContext, useRef } from "react";
import { ff, PDF_TEMPLATES, PAYMENT_METHODS, CURRENCIES_LIST, TIMEZONES, INDUSTRIES, COUNTRIES, CIS_RATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Btn } from "../components/atoms";
import { A4PrintModal } from "../components/shared";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", marginBottom:18, overflow:"hidden" }}>
      <div style={{ padding:"14px 22px 12px", borderBottom:"1px solid #F5F5F5" }}>
        <h3 style={{ margin:0, fontSize:14, fontWeight:800, color:"#1A1A1A" }}>{title}</h3>
      </div>
      <div style={{ padding:"18px 22px" }}>{children}</div>
    </div>
  );
}

// ─── PDF Template Preview modal ───────────────────────────────────────────────
function TemplatePreviewModal({ templateId, orgSettings, companyLogo, companyLogoSize, footerText, onClose }) {
  const demoData = {
    docNumber: "INV-0001",
    customer: {
      name: "Sample Client Ltd",
      companyName: "Sample Client Ltd",
      email: "billing@sampleclient.com",
      phone: "+44 20 7946 0001",
      billingAddress: { street: "45 High Street", city: "London", postcode: "EC1A 1BB", country: "United Kingdom" }
    },
    issueDate: new Date().toISOString().slice(0,10),
    dueDate: new Date(Date.now()+30*864e5).toISOString().slice(0,10),
    paymentTerms: "Net 30",
    items: [
      { id:"1", description:"Web Design & Development", quantity:1, rate:2500, tax_rate:20, amount:2500 },
      { id:"2", description:"SEO Optimisation Package", quantity:3, rate:150, tax_rate:20, amount:450 },
      { id:"3", description:"Hosting Setup (annual)", quantity:1, rate:120, tax_rate:0, amount:120 },
    ],
    subtotal: 3070,
    discountAmount: 0,
    shipping: 0,
    taxBreakdown: [{ rate:20, amount:590 }],
    cisDeduction: 0,
    total: 3660,
    notes: "Thank you for your business! Payment by bank transfer preferred.",
    terms: "Payment due within 30 days. Late payments may incur 2% monthly interest.",
    status: "Draft",
  };

  const tplDef = PDF_TEMPLATES.find(t=>t.id===templateId)||PDF_TEMPLATES[0];

  return (
    <A4PrintModal
      data={demoData}
      currSymbol="£"
      isVat={true}
      onClose={onClose}
      _overrideTemplate={templateId}
      _overrideAccent={tplDef.defaultAccent}
    />
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
export default function SettingsPage({ onNavigate }) {
  const {
    orgSettings, setOrgSettings,
    pdfTemplate, setPdfTemplate,
    companyLogo, setCompanyLogo,
    companyLogoSize, setCompanyLogoSize,
    footerText, setFooterText,
    customPayMethods, setCustomPayMethods,
    appTheme, setAppTheme,
    user, setUser,
  } = useContext(AppCtx);

  const org = orgSettings||{};

  // Organisation form state
  const [orgName,      setOrgName]      = useState(org.orgName||"");
  const [email,        setEmail]        = useState(org.email||"");
  const [phone,        setPhone]        = useState(org.phone||"");
  const [website,      setWebsite]      = useState(org.website||"");
  const [street,       setStreet]       = useState(org.street||"");
  const [city,         setCity]         = useState(org.city||"");
  const [postcode,     setPostcode]     = useState(org.postcode||"");
  const [country,      setCountry]      = useState(org.country||"United Kingdom");
  const [currency,     setCurrency]     = useState(org.currency||"GBP");
  const [timezone,     setTimezone]     = useState(org.timezone||"(UTC+00:00) London");
  const [industry,     setIndustry]     = useState(org.industry||"");
  const [vatReg,       setVatReg]       = useState(org.vatReg||"No");
  const [vatNum,       setVatNum]       = useState(org.vatNum||"");
  const [cisReg,       setCisReg]       = useState(org.cisReg||"No");
  const [cisRole,      setCisRole]      = useState(org.cisRole||"Contractor");
  const [cisRate,      setCisRate]      = useState(org.cisRate||20);
  const [crn,          setCrn]          = useState(org.crn||"");
  const [bankName,     setBankName]     = useState(org.bankName||"");
  const [bankSort,     setBankSort]     = useState(org.bankSort||"");
  const [bankAcc,      setBankAcc]      = useState(org.bankAcc||"");
  const [bankIban,     setBankIban]     = useState(org.bankIban||"");
  const [bankSwift,    setBankSwift]    = useState(org.bankSwift||"");

  // PDF / branding
  const [selectedTpl,  setSelectedTpl]  = useState(pdfTemplate||"classic");
  const [previewTpl,   setPreviewTpl]   = useState(null); // template id when preview open
  const [logoSize,     setLogoSize]     = useState(companyLogoSize||52);
  const [footer,       setFooter]       = useState(footerText||"");

  // Payment methods
  const [newMethod,    setNewMethod]    = useState("");

  // Theme
  const [themeType,    setThemeType]    = useState(appTheme?.type||"solid");
  const [themeColor,   setThemeColor]   = useState(appTheme?.color||"#1A1A1A");
  const [themeColor2,  setThemeColor2]  = useState(appTheme?.color2||"#333");
  const [accentColor,  setAccentColor]  = useState(appTheme?.accent||"#E86C4A");

  const [saved, setSaved] = useState(false);

  const sectionRefs = {
    org: useRef(null),
    tax: useRef(null),
    bank: useRef(null),
    templates: useRef(null),
  };
  const jumpTo = (key) => sectionRefs[key]?.current?.scrollIntoView({ behavior:"smooth", block:"start" });

  const handleSaveOrg = () => {
    setOrgSettings({
      orgName, email, phone, website,
      street, city, postcode, country,
      currency, timezone, industry,
      vatReg, vatNum, cisReg, cisRole, cisRate, crn,
      bankName, bankSort, bankAcc, bankIban, bankSwift,
    });
    setPdfTemplate(selectedTpl);
    setCompanyLogoSize(logoSize);
    setFooterText(footer);
    setAppTheme({ type:themeType, color:themeColor, color2:themeColor2, accent:accentColor });
    setSaved(true);
    setTimeout(()=>setSaved(false), 2500);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCompanyLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const addPayMethod = () => {
    const m = newMethod.trim();
    if(m && !customPayMethods.includes(m)) {
      setCustomPayMethods(p=>[...p, m]);
      setNewMethod("");
    }
  };

  const removePayMethod = (m) => setCustomPayMethods(p=>p.filter(x=>x!==m));

  const ACCENT_PRESETS = ["#E86C4A","#2563EB","#16A34A","#D97706","#9333EA","#0891B2","#E11D48","#1A1A1A"];
  const SIDEBAR_PRESETS = [
    { label:"Dark",    color:"#1A1A1A" },
    { label:"Slate",   color:"#1E293B" },
    { label:"Navy",    color:"#1E3A5F" },
    { label:"Forest",  color:"#1A3A2A" },
    { label:"Plum",    color:"#2D1B3D" },
    { label:"White",   color:"#FFFFFF" },
  ];

  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:860, fontFamily:ff }}>
      <h1 style={{ fontSize:22, fontWeight:800, color:"#1A1A1A", margin:"0 0 12px" }}>Settings</h1>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        <Btn onClick={()=>jumpTo("org")} variant="outline" size="sm">Organization Details</Btn>
        <Btn onClick={()=>jumpTo("tax")} variant="outline" size="sm">Tax details</Btn>
        <Btn onClick={()=>jumpTo("bank")} variant="outline" size="sm">Bank Details</Btn>
        <Btn onClick={()=>jumpTo("templates")} variant="outline" size="sm">Templates</Btn>
      </div>

      {/* Organisation */}
      <div ref={sectionRefs.org}><Section title="Organisation Details">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="Company / Trading Name" required>
            <Input value={orgName} onChange={setOrgName} placeholder="Your Company Ltd" />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={setEmail} type="email" placeholder="hello@company.com" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={setPhone} placeholder="+44 …" />
          </Field>
          <Field label="Website">
            <Input value={website} onChange={setWebsite} placeholder="https://…" />
          </Field>
          <Field label="Street Address">
            <Input value={street} onChange={setStreet} />
          </Field>
          <Field label="City / Town">
            <Input value={city} onChange={setCity} />
          </Field>
          <Field label="Postcode">
            <Input value={postcode} onChange={setPostcode} />
          </Field>
          <Field label="Country">
            <Select value={country} onChange={setCountry} options={COUNTRIES} />
          </Field>
          <Field label="Currency">
            <Select value={currency} onChange={setCurrency} options={CURRENCIES_LIST} />
          </Field>
          <Field label="Timezone">
            <Select value={timezone} onChange={setTimezone} options={TIMEZONES} />
          </Field>
          <Field label="Industry">
            <Select value={industry} onChange={setIndustry} options={["", ...INDUSTRIES]} />
          </Field>
          <Field label="Company Reg No (CRN)">
            <Input value={crn} onChange={setCrn} placeholder="Optional" />
          </Field>
        </div>
      </Section></div>

      {/* Tax */}
      <div ref={sectionRefs.tax}><Section title="Tax Registration">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="VAT Registered">
            <Select value={vatReg} onChange={setVatReg} options={["No","Yes"]} />
          </Field>
          {vatReg==="Yes" && (
            <Field label="VAT Number">
              <Input value={vatNum} onChange={setVatNum} placeholder="GB123456789" />
            </Field>
          )}
          <Field label="CIS Registered">
            <Select value={cisReg} onChange={setCisReg} options={["No","Yes"]} />
          </Field>
          {cisReg==="Yes" && (
            <>
              <Field label="CIS Role">
                <Select value={cisRole} onChange={setCisRole} options={["Contractor","Subcontractor","Both"]} />
              </Field>
              <Field label="CIS Deduction Rate (%)">
                <Input value={cisRate} onChange={setCisRate} type="number" />
              </Field>
            </>
          )}
        </div>
      </Section></div>

      {/* Bank */}
      <div ref={sectionRefs.bank}><Section title="Bank Details (shown on invoices)">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="Bank Name"><Input value={bankName} onChange={setBankName} placeholder="e.g. Barclays" /></Field>
          <Field label="Sort Code"><Input value={bankSort} onChange={setBankSort} placeholder="00-00-00" /></Field>
          <Field label="Account Number"><Input value={bankAcc} onChange={setBankAcc} placeholder="12345678" /></Field>
          <Field label="IBAN (optional)"><Input value={bankIban} onChange={setBankIban} /></Field>
          <Field label="SWIFT / BIC (optional)"><Input value={bankSwift} onChange={setBankSwift} /></Field>
        </div>
      </Section></div>

      {/* PDF Templates */}
      <div ref={sectionRefs.templates}><Section title="PDF Invoice Templates">
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <Btn onClick={()=>onNavigate?.("templates")} variant="outline" icon={<Icons.Pen />}>Open dedicated template page</Btn>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:16 }}>
          {PDF_TEMPLATES.map(tpl=>{
            const sel = selectedTpl===tpl.id;
            return (
              <div key={tpl.id}
                onClick={()=>setSelectedTpl(tpl.id)}
                style={{ border:`2px solid ${sel?"#E86C4A":"#E0E0E0"}`, borderRadius:12, overflow:"hidden", cursor:"pointer", transition:"all 0.15s", background:sel?"#FFF7F4":"#fff" }}>
                {/* Mini preview swatch */}
                <div style={{ height:80, background:tpl.defaultBg, borderBottom:`3px solid ${tpl.defaultAccent}`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <div style={{ width:60, height:8, background:tpl.defaultAccent, borderRadius:4, opacity:0.8 }} />
                  <div style={{ position:"absolute", bottom:8, left:10, right:10 }}>
                    {[1,2,3].map(i=><div key={i} style={{ height:4, background:tpl.defaultAccent, borderRadius:2, opacity:0.15+(i*0.1), marginBottom:3, width:`${80-i*15}%` }} />)}
                  </div>
                </div>
                <div style={{ padding:"10px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{tpl.name}</div>
                    <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>{tpl.description}</div>
                  </div>
                  <button
                    onClick={e=>{ e.stopPropagation(); setPreviewTpl(tpl.id); }}
                    title="Preview template"
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#888", padding:4, display:"flex", borderRadius:6, transition:"color 0.15s" }}
                    onMouseEnter={e=>e.currentTarget.style.color="#E86C4A"}
                    onMouseLeave={e=>e.currentTarget.style.color="#888"}>
                    <Icons.Eye />
                  </button>
                </div>
                {sel && (
                  <div style={{ padding:"0 12px 10px", display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"#E86C4A" }} />
                    <span style={{ fontSize:11, color:"#E86C4A", fontWeight:700 }}>Selected</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Logo upload */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:6 }}>
          <Field label="Company Logo">
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {companyLogo && (
                <img src={companyLogo} alt="logo" style={{ maxHeight:40, maxWidth:120, objectFit:"contain", borderRadius:4, border:"1px solid #EBEBEB" }} />
              )}
              <label style={{ cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", background:"#F5F5F5", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:12, fontWeight:600, color:"#555", fontFamily:ff }}>
                <Icons.Items /> {companyLogo?"Change Logo":"Upload Logo"}
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={handleLogoUpload} />
              </label>
              {companyLogo && (
                <button onClick={()=>setCompanyLogo(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", padding:4 }}><Icons.X /></button>
              )}
            </div>
          </Field>
          <Field label={`Logo Size: ${logoSize}px`}>
            <input type="range" min={24} max={100} value={logoSize} onChange={e=>setLogoSize(Number(e.target.value))}
              style={{ width:"100%", accentColor:"#E86C4A" }} />
          </Field>
        </div>
        <Field label="Invoice Footer Text" style={{ marginTop:14 }}>
          <textarea value={footer} onChange={e=>setFooter(e.target.value)} rows={2} placeholder="e.g. Thank you for your business! Registered in England & Wales No. 12345678"
            style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
        </Field>
      </Section></div>

      {/* Sidebar theme */}
      <Section title="Sidebar Appearance">
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Style</div>
          <div style={{ display:"flex", gap:8 }}>
            {["solid","gradient"].map(t=>(
              <button key={t} onClick={()=>setThemeType(t)}
                style={{ padding:"7px 16px", borderRadius:8, border:`1.5px solid ${themeType===t?"#E86C4A":"#E0E0E0"}`, background:themeType===t?"#FFF7F4":"#fff", color:themeType===t?"#E86C4A":"#555", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff, textTransform:"capitalize" }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="Sidebar Presets">
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {SIDEBAR_PRESETS.map(p=>(
                <button key={p.color} onClick={()=>setThemeColor(p.color)} title={p.label}
                  style={{ width:28, height:28, borderRadius:"50%", background:p.color, border:`2px solid ${themeColor===p.color?"#E86C4A":"transparent"}`, cursor:"pointer", outline:"none", boxShadow:p.color==="#FFFFFF"?"inset 0 0 0 1px #E0E0E0":"none" }} />
              ))}
            </div>
          </Field>
          <Field label="Sidebar Colour">
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input type="color" value={themeColor} onChange={e=>setThemeColor(e.target.value)}
                style={{ width:36, height:36, border:"none", background:"none", cursor:"pointer", borderRadius:8 }} />
              <Input value={themeColor} onChange={setThemeColor} placeholder="#1A1A1A" style={{ flex:1 }} />
            </div>
          </Field>
          {themeType==="gradient" && (
            <Field label="Gradient End Colour">
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="color" value={themeColor2} onChange={e=>setThemeColor2(e.target.value)}
                  style={{ width:36, height:36, border:"none", background:"none", cursor:"pointer", borderRadius:8 }} />
                <Input value={themeColor2} onChange={setThemeColor2} placeholder="#333" style={{ flex:1 }} />
              </div>
            </Field>
          )}
          <Field label="Accent Colour">
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {ACCENT_PRESETS.map(c=>(
                  <button key={c} onClick={()=>setAccentColor(c)}
                    style={{ width:24, height:24, borderRadius:"50%", background:c, border:`2px solid ${accentColor===c?"#1A1A1A":"transparent"}`, cursor:"pointer", outline:"none" }} />
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="color" value={accentColor} onChange={e=>setAccentColor(e.target.value)}
                  style={{ width:36, height:36, border:"none", background:"none", cursor:"pointer", borderRadius:8 }} />
                <Input value={accentColor} onChange={setAccentColor} placeholder="#E86C4A" style={{ flex:1 }} />
              </div>
            </div>
          </Field>
        </div>
        {/* Preview strip */}
        <div style={{ marginTop:14, height:42, borderRadius:10, background: themeType==="gradient"?`linear-gradient(90deg,${themeColor},${themeColor2})`:themeColor, display:"flex", alignItems:"center", padding:"0 16px", gap:12 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:accentColor, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
          <span style={{ color:"#fff", fontSize:12, fontWeight:800, letterSpacing:"0.06em", textShadow:"0 1px 2px rgba(0,0,0,0.3)" }}>AI INVOICE</span>
          <div style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", background:accentColor }} />
        </div>
      </Section>

      {/* Payment Methods */}
      <Section title="Custom Payment Methods">
        <p style={{ margin:"0 0 12px", fontSize:13, color:"#888" }}>Add extra payment methods beyond the built-in options.</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
          {customPayMethods.map(m=>(
            <div key={m} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"#F5F5F5", border:"1px solid #E0E0E0", borderRadius:20, fontSize:12, fontWeight:600, color:"#444" }}>
              {m}
              <button onClick={()=>removePayMethod(m)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", padding:0, display:"flex" }}><Icons.X /></button>
            </div>
          ))}
          {customPayMethods.length===0 && <span style={{ fontSize:13, color:"#CCC" }}>No custom methods added yet.</span>}
        </div>
        <div style={{ display:"flex", gap:8, maxWidth:340 }}>
          <input value={newMethod} onChange={e=>setNewMethod(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPayMethod()} placeholder="e.g. Wise, Revolut…"
            style={{ flex:1, padding:"9px 11px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
          <Btn onClick={addPayMethod} variant="outline" icon={<Icons.Plus />}>Add</Btn>
        </div>
      </Section>

      {/* Save */}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:4 }}>
        {saved && (
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#16A34A", fontWeight:600 }}>
            <Icons.Check /> Settings saved!
          </div>
        )}
        <Btn onClick={handleSaveOrg} variant="primary" icon={<Icons.Save />}>Save Settings</Btn>
      </div>

      {/* Template Preview Modal */}
      {previewTpl && (
        <TemplatePreviewModal
          templateId={previewTpl}
          orgSettings={orgSettings}
          companyLogo={companyLogo}
          companyLogoSize={companyLogoSize}
          footerText={footerText}
          onClose={()=>setPreviewTpl(null)}
        />
      )}
    </div>
  );
}
