import { useState, useContext, useRef } from "react";
import { ff, PAYMENT_METHODS, PDF_TEMPLATES, CURRENCIES_LIST, TIMEZONES, INDUSTRIES, CIS_RATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Textarea, Toggle, Switch, SlideToggle, Btn, InfoBox } from "../components/atoms";
import { validateVatNumber } from "../utils/helpers";

const TABS = [
  { id:"org",        label:"Organisation" },
  { id:"invoice",    label:"Invoices & Quotes" },
  { id:"payments",   label:"Payment Methods" },
  { id:"pdf",        label:"PDF & Branding" },
  { id:"integrations",label:"Integrations" },
];

export default function SettingsPage() {
  const {
    orgSettings, setOrgSettings,
    customPayMethods, setCustomPayMethods,
    pdfTemplate, setPdfTemplate,
    companyLogo, setCompanyLogo,
    companyLogoSize, setCompanyLogoSize,
    invoicePrefix, setInvoicePrefix,
    quotePrefix, setQuotePrefix,
    invoiceStartNum, setInvoiceStartNum,
    quoteStartNum, setQuoteStartNum,
    defaultInvTerms, setDefaultInvTerms,
    defaultQuoteTerms, setDefaultQuoteTerms,
    defaultPaymentTerms, setDefaultPaymentTerms,
    footerText, setFooterText,
    supabaseUrl, setSupabaseUrl,
    supabaseKey, setSupabaseKey,
    googleDriveEnabled, setGoogleDriveEnabled,
    emailEnabled, setEmailEnabled,
    emailProvider, setEmailProvider,
    emailFrom, setEmailFrom,
  } = useContext(AppCtx);

  const org = orgSettings||{};
  const [tab, setTab] = useState("org");
  const [saved, setSaved] = useState(false);
  const logoRef = useRef(null);

  // org fields
  const [orgName, setOrgName] = useState(org.orgName||"");
  const [industry, setIndustry] = useState(org.industry||"");
  const [email, setEmail] = useState(org.email||"");
  const [phone, setPhone] = useState(org.phone||"");
  const [website, setWebsite] = useState(org.website||"");
  const [street, setStreet] = useState(org.street||"");
  const [city, setCity] = useState(org.city||"");
  const [postcode, setPostcode] = useState(org.postcode||"");
  const [country, setCountry] = useState(org.country||"United Kingdom");
  const [currency, setCurrency] = useState(org.currency||"GBP");
  const [timezone, setTimezone] = useState(org.timezone||"(UTC+00:00) London");
  const [vatReg, setVatReg] = useState(org.vatReg==="Yes");
  const [vatNum, setVatNum] = useState(org.vatNum||"");
  const [flatRate, setFlatRate] = useState(org.flatRate||false);
  const [flatRatePct, setFlatRatePct] = useState(org.flatRatePct||"");
  const [cisReg, setCisReg] = useState(org.cisReg==="Yes");
  const [cisContractor, setCisContractor] = useState(org.cisContractor||false);
  const [cisSub, setCisSub] = useState(org.cisSub||false);
  const [cisRate, setCisRate] = useState(org.cisRate||"20%");
  const [cisUtr, setCisUtr] = useState(org.cisUtr||"");
  const [bType, setBType] = useState(org.bType||"Sole Trader / Freelancer");
  const [crn, setCrn] = useState(org.crn||"");

  // custom payment methods
  const [newMethod, setNewMethod] = useState("");

  const vatNumValid = validateVatNumber(vatNum);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCompanyLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setOrgSettings({
      orgName, industry, email, phone, website,
      street, city, postcode, country, currency, timezone, bType, crn,
      vatReg: vatReg?"Yes":"No", vatNum, flatRate, flatRatePct,
      cisReg: cisReg?"Yes":"No", cisContractor, cisSub, cisRate, cisUtr
    });
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const addPaymentMethod = () => {
    if(!newMethod.trim()) return;
    setCustomPayMethods(p=>[...p, newMethod.trim()]);
    setNewMethod("");
  };

  const removePaymentMethod = (m) => setCustomPayMethods(p=>p.filter(x=>x!==m));

  const allPayMethods = [...PAYMENT_METHODS, ...(customPayMethods||[])];

  const S = ({ title, children }) => (
    <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"16px 20px", marginBottom:14 }}>
      {title && <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:14, paddingBottom:10, borderBottom:"1px solid #F0F0F0" }}>{title}</div>}
      {children}
    </div>
  );

  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:900, fontFamily:ff }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#1A1A1A", margin:"0 0 3px" }}>Settings</h1>
          <p style={{ color:"#AAA", fontSize:13, margin:0 }}>Manage your organisation and preferences</p>
        </div>
        <Btn onClick={handleSave} variant="primary" icon={saved?<Icons.Check />:<Icons.Save />}>
          {saved?"Saved!":"Save Changes"}
        </Btn>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", background:"#fff", border:"1px solid #EBEBEB", borderRadius:10, overflow:"auto", marginBottom:16 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"10px 18px", border:"none", borderBottom:`2px solid ${tab===t.id?"#1A1A1A":"transparent"}`, background:"none", fontSize:13, fontWeight:tab===t.id?700:400, color:tab===t.id?"#1A1A1A":"#888", cursor:"pointer", fontFamily:ff, whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Organisation ─────────────────────────────────────────── */}
      {tab==="org" && (<>
        <S title="Business Details">
          <Field label="Business Type"><Toggle value={bType} onChange={setBType} options={["Sole Trader / Freelancer","Limited Company"]} /></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Organisation Name" required><Input value={orgName} onChange={setOrgName} /></Field>
            {bType==="Limited Company" && <Field label="CRN"><Input value={crn} onChange={setCrn} placeholder="12345678" /></Field>}
            <Field label="Industry"><Select value={industry} onChange={setIndustry} options={INDUSTRIES} /></Field>
            <Field label="Email"><Input value={email} onChange={setEmail} type="email" /></Field>
            <Field label="Phone"><Input value={phone} onChange={setPhone} /></Field>
            <Field label="Website"><Input value={website} onChange={setWebsite} /></Field>
          </div>
        </S>
        <S title="Address">
          <Field label="Street"><Input value={street} onChange={setStreet} /></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="City"><Input value={city} onChange={setCity} /></Field>
            <Field label="Postcode"><Input value={postcode} onChange={setPostcode} /></Field>
          </div>
          <Field label="Country"><Input value={country} onChange={setCountry} /></Field>
        </S>
        <S title="Currency & Time">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Currency"><Select value={currency} onChange={setCurrency} options={CURRENCIES_LIST} /></Field>
            <Field label="Time Zone"><Select value={timezone} onChange={setTimezone} options={TIMEZONES} /></Field>
          </div>
        </S>
        <S title="VAT Settings">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:vatReg?14:0 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>VAT Registered</div>
              <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Are you registered to charge VAT?</div>
            </div>
            <SlideToggle value={vatReg} onChange={setVatReg} />
          </div>
          {vatReg && (<>
            <Field label="VAT Registration Number">
              <Input value={vatNum} onChange={setVatNum} placeholder="GB123456789" />
            </Field>
            {vatNum && (
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600, marginBottom:10, color:vatNumValid?"#16A34A":"#DC2626" }}>
                {vatNumValid?<Icons.Check />:<Icons.Alert />} {vatNumValid?"VAT number valid":"Invalid format"}
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>Flat Rate Scheme</div>
              <Switch checked={flatRate} onChange={setFlatRate} />
            </div>
            {flatRate && <Field label="Flat Rate %" style={{ marginTop:10 }}><Input value={flatRatePct} onChange={setFlatRatePct} type="number" placeholder="e.g. 12.5" /></Field>}
          </>)}
        </S>
        {industry==="Construction" && (
          <S title="CIS — Construction Industry Scheme">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:cisReg?14:0 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>CIS Registered</div>
                <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Are you registered for CIS?</div>
              </div>
              <SlideToggle value={cisReg} onChange={setCisReg} />
            </div>
            {cisReg && (<>
              <Field label="UTR Number"><Input value={cisUtr} onChange={setCisUtr} placeholder="1234567890" /></Field>
              <div style={{ display:"flex", gap:20, margin:"8px 0 10px" }}>
                <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:13 }}>
                  <Switch checked={cisContractor} onChange={setCisContractor} /> Contractor
                </label>
                <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:13 }}>
                  <Switch checked={cisSub} onChange={setCisSub} /> Subcontractor
                </label>
              </div>
              {cisSub && <Field label="Default CIS Rate"><Select value={cisRate} onChange={setCisRate} options={CIS_RATES} /></Field>}
              <InfoBox>CIS will be applied automatically on invoices for CIS-registered customers.</InfoBox>
            </>)}
          </S>
        )}
      </>)}

      {/* ── Invoices & Quotes ─────────────────────────────────────── */}
      {tab==="invoice" && (<>
        <S title="Invoice Numbering">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Invoice Prefix" hint="e.g. INV-"><Input value={invoicePrefix} onChange={setInvoicePrefix} placeholder="INV-" /></Field>
            <Field label="Starting Number"><Input value={invoiceStartNum} onChange={setInvoiceStartNum} type="number" min="1" /></Field>
          </div>
        </S>
        <S title="Quote Numbering">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Quote Prefix" hint="e.g. QUO-"><Input value={quotePrefix} onChange={setQuotePrefix} placeholder="QUO-" /></Field>
            <Field label="Starting Number"><Input value={quoteStartNum} onChange={setQuoteStartNum} type="number" min="1" /></Field>
          </div>
        </S>
        <S title="Default Terms">
          <Field label="Default Payment Terms">
            <Select value={defaultPaymentTerms} onChange={setDefaultPaymentTerms} options={["Net 7","Net 14","Net 15","Net 30","Net 60","Net 90","Due on Receipt"]} />
          </Field>
          <Field label="Default Invoice Terms & Conditions">
            <Textarea value={defaultInvTerms} onChange={setDefaultInvTerms} rows={4} />
          </Field>
          <Field label="Default Quote Terms & Conditions">
            <Textarea value={defaultQuoteTerms} onChange={setDefaultQuoteTerms} rows={4} />
          </Field>
        </S>
      </>)}

      {/* ── Payment Methods ───────────────────────────────────────── */}
      {tab==="payments" && (
        <S title="Payment Methods">
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Default Methods</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {PAYMENT_METHODS.map(m=>(
                <div key={m} style={{ padding:"6px 12px", background:"#F0F0F0", borderRadius:20, fontSize:12, color:"#555", fontWeight:600 }}>{m}</div>
              ))}
            </div>
          </div>
          {customPayMethods?.length>0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Custom Methods</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {customPayMethods.map(m=>(
                  <div key={m} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", background:"#1A1A1A", borderRadius:20, fontSize:12, color:"#fff", fontWeight:600 }}>
                    {m}
                    <button onClick={()=>removePaymentMethod(m)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex", lineHeight:1 }}><Icons.X /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <Input value={newMethod} onChange={setNewMethod} placeholder="e.g. Revolut, Wise, BACS…" onKeyDown={e=>e.key==="Enter"&&addPaymentMethod()} />
            <Btn onClick={addPaymentMethod} variant="outline" icon={<Icons.Plus />}>Add</Btn>
          </div>
        </S>
      )}

      {/* ── PDF & Branding ────────────────────────────────────────── */}
      {tab==="pdf" && (<>
        <S title="Company Logo">
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:90, height:90, borderRadius:12, border:"2px dashed #DDD", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", background:"#FAFAFA" }}>
              {companyLogo
                ? <img src={companyLogo} alt="logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                : <div style={{ textAlign:"center", color:"#CCC", fontSize:11 }}>No logo</div>}
            </div>
            <div>
              <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display:"none" }} />
              <Btn onClick={()=>logoRef.current.click()} variant="outline" icon={<Icons.Drive />}>Upload Logo</Btn>
              {companyLogo && <Btn onClick={()=>setCompanyLogo(null)} variant="ghost" size="sm" style={{ marginTop:6 }}>Remove</Btn>}
              <div style={{ fontSize:11, color:"#AAA", marginTop:6 }}>PNG or SVG recommended · Max 2MB</div>
              {companyLogo && (
                <div style={{ marginTop:8 }}>
                  <Field label="Logo Height (px)">
                    <input value={companyLogoSize||52} onChange={e=>setCompanyLogoSize(Number(e.target.value))} type="range" min="28" max="100" style={{ width:"100%" }} />
                    <span style={{ fontSize:11, color:"#888" }}>{companyLogoSize||52}px</span>
                  </Field>
                </div>
              )}
            </div>
          </div>
        </S>
        <S title="PDF Template">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10 }}>
            {PDF_TEMPLATES.map(t=>(
              <button key={t.id} onClick={()=>setPdfTemplate(t.id)}
                style={{ padding:"12px 10px", border:`2px solid ${pdfTemplate===t.id?"#1A1A1A":"#EBEBEB"}`, borderRadius:10, background:"#fff", cursor:"pointer", textAlign:"left", fontFamily:ff }}>
                <div style={{ height:56, borderRadius:7, background:t.preview||"linear-gradient(135deg,#1A1A1A,#444)", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.1em" }}>Preview</span>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{t.name}</div>
                <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{t.description}</div>
                {pdfTemplate===t.id && <div style={{ fontSize:10, color:"#E86C4A", fontWeight:700, marginTop:4 }}>✓ Active</div>}
              </button>
            ))}
          </div>
        </S>
        <S title="Invoice Footer">
          <Field label="Footer Text" hint="Shown at the bottom of every invoice/quote">
            <Textarea value={footerText} onChange={setFooterText} rows={2} placeholder={`${orgSettings?.orgName||"Your Company"} · Registered in England · VAT No: GB...`} />
          </Field>
        </S>
      </>)}

      {/* ── Integrations ─────────────────────────────────────────── */}
      {tab==="integrations" && (<>
        <S title="Supabase (Cloud Sync)">
          <InfoBox>Connect Supabase to sync invoices, customers and payments across devices and users.</InfoBox>
          <Field label="Supabase URL"><Input value={supabaseUrl||""} onChange={setSupabaseUrl} placeholder="https://xxxx.supabase.co" /></Field>
          <Field label="Anon / Public Key"><Input value={supabaseKey||""} onChange={setSupabaseKey} placeholder="eyJhbGci…" /></Field>
          {supabaseUrl && supabaseKey && (
            <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:7, fontSize:12, color:"#16A34A", fontWeight:600 }}>
              <Icons.Check /> Credentials saved — connection will be attempted on next load
            </div>
          )}
        </S>
        <S title="Google Drive">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>Save PDFs to Google Drive</div>
              <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Auto-upload invoice PDFs to a Drive folder</div>
            </div>
            <SlideToggle value={googleDriveEnabled||false} onChange={setGoogleDriveEnabled} />
          </div>
          {googleDriveEnabled && <InfoBox color="#D97706" style={{ marginTop:10 }}>Requires OAuth — configure Google Cloud credentials in your .env file.</InfoBox>}
        </S>
        <S title="Email Sending">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:emailEnabled?14:0 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>Enable Email Sending</div>
              <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Send invoices and quotes directly via email</div>
            </div>
            <SlideToggle value={emailEnabled||false} onChange={setEmailEnabled} />
          </div>
          {emailEnabled && (<>
            <Field label="Email Provider"><Select value={emailProvider||"SMTP"} onChange={setEmailProvider} options={["SMTP","SendGrid","Mailgun","Resend"]} /></Field>
            <Field label="From Address"><Input value={emailFrom||""} onChange={setEmailFrom} type="email" placeholder="invoices@yourcompany.com" /></Field>
          </>)}
        </S>
      </>)}

      <div style={{ paddingBottom:40 }} />
    </div>
  );
}
