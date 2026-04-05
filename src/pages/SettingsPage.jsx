import { useState, useContext, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { ff, PDF_TEMPLATES, PAYMENT_METHODS, CURRENCIES_LIST, TIMEZONES, INDUSTRIES, COUNTRIES, CIS_RATES, CIS_DEDUCTION_RATES, CIS_DEFAULT_SETTINGS, normalizeCurrencyCode } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Btn, SlideToggle } from "../components/atoms";
import { A4PrintModal } from "../components/shared";
import { validateUkCrn, formatPhoneNumber, stripPhoneForStorage, formatSortCode, stripSortCode } from "../utils/helpers";
import { validateImageDataUrl } from "../utils/security";
import { loadBusinessData } from "../lib/businessData";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", marginBottom:18, overflow:"hidden" }}>
      <div style={{ padding:"14px 22px 12px", borderBottom:"1px solid #f0f0f4" }}>
        <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#1a1a2e" }}>{title}</h3>
      </div>
      <div style={{ padding:"18px 22px" }}>{children}</div>
    </div>
  );
}

function ChipToggle({ value, onChange, options }) {
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      {options.map(option=>{
        const selected = value===option;
        return (
          <button
            key={option}
            type="button"
            onClick={()=>onChange(option)}
            style={{
              border: `1px solid ${selected?"#1e6be0":"#e8e8ec"}`,
              background: selected?"#1e6be0":"#fff",
              color: selected?"#fff":"#374151",
              borderRadius:999,
              padding:"7px 12px",
              fontSize:13,
              fontWeight:700,
              display:"inline-flex",
              alignItems:"center",
              gap:6,
              cursor:"pointer",
              transition:"all 0.15s ease",
            }}
          >
            {selected && <Icons.Check />}
            <span>{option}</span>
          </button>
        );
      })}
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
export default function SettingsPage() {
  const navigate = useNavigate();
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

  // Always fetch fresh data on mount so Settings never shows stale data
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    loadBusinessData(user.id).then(({ data }) => {
      if (cancelled || !data?.org_settings) return;
      setOrgSettings(data.org_settings);
    });
    return () => { cancelled = true; };
  }, [user?.id, setOrgSettings]);

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
  const [currency,     setCurrency]     = useState(normalizeCurrencyCode(org.currency||"GBP"));
  const [timezone,     setTimezone]     = useState(org.timezone||"(UTC+00:00) London");
  const [industry,     setIndustry]     = useState(org.industry||"");
  const [vatReg,       setVatReg]       = useState(org.vatReg||"No");
  const [vatNum,       setVatNum]       = useState(org.vatNum||"");
  const [cisRole,      setCisRole]      = useState(org.cisRole||"Contractor");
  const [cisRegistrationStatus, setCisRegistrationStatus] = useState(org.cisRegistrationStatus||"Net");
  const [cisEnabled,        setCisEnabled]        = useState(org.cis?.enabled ?? CIS_DEFAULT_SETTINGS.enabled);
  const [cisContractorName, setCisContractorName] = useState(org.cis?.contractorName ?? CIS_DEFAULT_SETTINGS.contractorName);
  const [cisContractorUTR,  setCisContractorUTR]  = useState(org.cis?.contractorUTR ?? org.cisUtrNo ?? CIS_DEFAULT_SETTINGS.contractorUTR);
  const [cisEmployerRef,    setCisEmployerRef]    = useState(org.cis?.employerRef ?? CIS_DEFAULT_SETTINGS.employerRef);
  const [cisDefaultRate,    setCisDefaultRate]    = useState(org.cis?.defaultRate ?? org.cisRate ?? CIS_DEFAULT_SETTINGS.defaultRate);
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
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState("org");
  const [vatNumberLocked, setVatNumberLocked] = useState(Boolean(org.vatNum));
  const crnError = crn && !validateUkCrn(crn) ? "CRN must be 8 digits or 2 letters followed by 6 digits (e.g. 12345678, SC123456)." : "";

  useEffect(() => {
    if (!orgSettings) return;
    const org = orgSettings;
    setOrgName(org.orgName || "");
    setEmail(org.email || "");
    setPhone(formatPhoneNumber(org.phone || ""));
    setWebsite(org.website || "");
    setStreet(org.street || "");
    setCity(org.city || "");
    setPostcode(org.postcode || "");
    setCountry(org.country || "United Kingdom");
    setCurrency(normalizeCurrencyCode(org.currency || "GBP"));
    setTimezone(org.timezone || "(UTC+00:00) London");
    setIndustry(org.industry || "");
    setVatReg(org.vatReg || "No");
    setVatNum(org.vatNum || "");
    setCisEnabled(org.cis?.enabled ?? (org.cisReg === "Yes"));
    setCisContractorName(org.cis?.contractorName || "");
    setCisContractorUTR(org.cis?.contractorUTR || org.cisUtrNo || "");
    setCisEmployerRef(org.cis?.employerRef || "");
    setCisDefaultRate(org.cis?.defaultRate || org.cisRate || CIS_DEFAULT_SETTINGS.defaultRate);
    // Auto-populate contractor name from org name if not already set
    if (!org.cis?.contractorName && org.orgName) setCisContractorName(org.orgName);
    setCrn(org.crn || "");
    setBankName(org.bankName || "");
    setBankSort(formatSortCode(org.bankSort || ""));
    setBankAcc(org.bankAcc || "");
    setBankIban(org.bankIban || "");
    setBankSwift(org.bankSwift || "");
  }, [orgSettings]);

  // When CIS is enabled and contractor name is blank, default it to the org name
  useEffect(() => {
    if (cisEnabled && !cisContractorName && orgName) {
      setCisContractorName(orgName);
    }
  }, [cisEnabled]);

  const settingTabs = [
    { id:"org", label:"Organization Details" },
    { id:"tax", label:"Tax Details" },
    { id:"bank", label:"Bank Details" },
    { id:"templates", label:"Templates" },
    { id:"appearance", label:"Appearance" },
    { id:"payments", label:"Payment Methods" },
    { id:"ledger", label:"General Ledger" },
  ];

  const buildOrgSettings = () => ({
    orgName, email, phone: stripPhoneForStorage(phone), website,
    street, city, postcode, country,
    currency: normalizeCurrencyCode(currency), timezone, industry,
    vatReg, vatNum,
    cisReg: cisEnabled ? "Yes" : "No",
    cisRole, cisRate: cisDefaultRate, cisUtrNo: cisContractorUTR, cisRegistrationStatus, crn,
    bankName, bankSort: stripSortCode(bankSort), bankAcc, bankIban, bankSwift,
    cis: {
      enabled: cisEnabled,
      contractorName: cisContractorName,
      contractorUTR: cisContractorUTR,
      employerRef: cisEmployerRef,
      defaultRate: cisDefaultRate,
    },
  });

  const handleSaveOrg = () => {
    if (crn && !validateUkCrn(crn)) {
      setSaveError("Please enter a valid UK CRN (8 digits or 2 letters + 6 digits).");
      return;
    }
    if (cisEnabled) {
      const utr = cisContractorUTR.replace(/\D/g, "");
      if (utr.length > 0 && utr.length !== 10) {
        setSaveError("Please enter a valid UTR number (10 digits).");
        return;
      }
    }
    setSaveError("");
    try {
      const newSettings = buildOrgSettings();
      setOrgSettings(newSettings);
      setVatNumberLocked(Boolean(vatNum));
      setPdfTemplate(selectedTpl);
      setCompanyLogoSize(logoSize);
      setFooterText(footer);
      setAppTheme({ type:themeType, color:themeColor, color2:themeColor2, accent:accentColor });
      setSaved(true);
      setTimeout(()=>setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    // XSS-004: Validate MIME type is an image — prevents data:text/html XSS via img src
    if(!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target.result;
      if (validateImageDataUrl(result)) {
        setCompanyLogo(result);
      } else {
        setSaveError('Invalid image format. Please upload a PNG, JPEG, or WebP file under 2MB.');
      }
    };
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

  const SaveActions = ({ label = "Save settings" }) => (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, marginTop:16 }}>
      {saveError && (
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#dc2626", fontWeight:600 }}>
          <Icons.Alert /> {saveError}
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {saved && (
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#16A34A", fontWeight:600 }}>
            <Icons.Check /> Organisation details saved.
          </div>
        )}
        <Btn onClick={handleSaveOrg} variant="primary" icon={<Icons.Save />} style={{ background:saved?"#059669":"#1e6be0", color:"#fff" }}>
          {label}
        </Btn>
      </div>
    </div>
  );

  const requestTaxNumberEdit = (unlockField) => {
    const shouldUnlock = window.confirm("Are you sure this is the correct number?");
    if (shouldUnlock) unlockField(false);
  };

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
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:860, background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>
      <h1 style={{ fontSize:20, fontWeight:700, color:"#1a1a2e", margin:"0 0 12px" }}>Settings</h1>
      <div style={{ display:"flex", gap:18, flexWrap:"wrap", borderBottom:"1px solid #E5E7EB", marginBottom:18 }}>
        {settingTabs.map(tab=>{
          const isActive = activeTab===tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={()=>setActiveTab(tab.id)}
              style={{
                border:"none",
                background:"transparent",
                padding:"4px 0 10px",
                marginBottom:-1,
                borderBottom:`2px solid ${isActive?"#1e6be0":"transparent"}`,
                color:isActive?"#1e6be0":"#6b7280",
                fontSize:13,
                fontWeight:isActive?700:600,
                cursor:"pointer",
                fontFamily:ff,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Organisation */}
      {activeTab === "org" && (<Section title="Organisation Details">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="Company / Trading Name" required>
            <Input value={orgName} onChange={setOrgName} placeholder="Your Company Ltd" />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={setEmail} type="email" placeholder="hello@company.com" />
          </Field>
          <Field label="Phone">
            <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} onBlur={()=>setPhone(formatPhoneNumber(phone))} placeholder="+44 …"
              style={{ width:"100%", padding:"9px 11px", border:"1px solid #e8e8ec", borderRadius:5, fontSize:15, fontFamily:ff, color:"#1A1A1A", background:"#fff", outline:"none", boxSizing:"border-box", transition:"border 0.15s" }}
              onFocus={e=>e.target.style.borderColor="#1e6be0"} />
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
            <Select value={currency} onChange={setCurrency} options={CURRENCIES_LIST.map(c => ({ value: normalizeCurrencyCode(c), label: c }))} />
          </Field>
          <Field label="Timezone">
            <Select value={timezone} onChange={setTimezone} options={TIMEZONES} />
          </Field>
          <Field label="Industry">
            <Select value={industry} onChange={setIndustry} options={["", ...INDUSTRIES]} />
          </Field>
          <Field label="Company Reg No (CRN)" hint="Format: 12345678 or SC123456" error={crnError}>
            <Input value={crn} onChange={v=>setCrn(v.toUpperCase())} placeholder="Optional" error={!!crnError} />
          </Field>
          <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid #f0f0f4" }}>
  <div style={{ fontSize:13, color:"#64748B", marginBottom:8 }}>Want to go through the setup wizard again?</div>
  <Btn variant="outline" onClick={() => {
    localStorage.removeItem("ai_invoice_onboarding_done");
    navigate(ROUTES.ONBOARDING, { replace: true });
  }}>
    Restart onboarding
  </Btn>
</div>
        </div>
      </Section>)}
      {activeTab === "org" && <SaveActions label="Save organisation settings" />}

      {/* Tax */}
     {activeTab === "tax" && (<Section title="Tax Registration">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="VAT Registered">
            <ChipToggle value={vatReg} onChange={setVatReg} options={["No", "Yes"]} />
          </Field>
          {vatReg==="Yes" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <Field label="VAT Number">
                <Input value={vatNum} onChange={setVatNum} placeholder="GB123456789" readOnly={vatNumberLocked} />
              </Field>
              {vatNumberLocked && (
                <Btn type="button" variant="outline" onClick={()=>requestTaxNumberEdit(setVatNumberLocked)}>
                  Edit Tax no
                </Btn>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop:14, paddingTop:16, borderTop:"1px solid #f0f0f4" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom: cisEnabled ? 20 : 0 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>Enable CIS</div>
              <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>
                Activates Construction Industry Scheme deductions on invoices.
              </div>
            </div>
            <SlideToggle value={cisEnabled} onChange={setCisEnabled} />
          </div>

          {cisEnabled && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, padding:"16px 0 0", borderTop:"1px solid #f3f4f6" }}>
              <Field label="Contractor Name">
                <Input value={cisContractorName} onChange={setCisContractorName} placeholder="Your company name" />
              </Field>

              <Field label="CIS Role">
                <Select value={cisRole} onChange={setCisRole} options={["Contractor","Subcontractor","Both"]} />
              </Field>

              <Field label="UTR Number" error={cisContractorUTR && cisContractorUTR.replace(/\D/g,"").length !== 10 ? "UTR must be 10 digits" : ""}>
                <Input value={cisContractorUTR} onChange={setCisContractorUTR} placeholder="10-digit UTR number" maxLength={10} />
              </Field>

              <Field label="CIS Registration Status">
                <Select value={cisRegistrationStatus} onChange={setCisRegistrationStatus} options={["Gross","Net"]} />
              </Field>

              <Field label="Employer's PAYE Reference">
                <Input value={cisEmployerRef} onChange={setCisEmployerRef} placeholder="e.g. 123/AB456" />
              </Field>

              <Field label="Default Deduction Rate">
                <Select
                  value={String(cisDefaultRate)}
                  onChange={v=>setCisDefaultRate(Number(v))}
                  options={CIS_DEDUCTION_RATES}
                />
              </Field>

            </div>
          )}
        </div>
       </Section>)}
      {activeTab === "tax" && <SaveActions label="Save tax settings" />}
      
      {/* Bank */}
      {activeTab === "bank" && (<Section title="Bank Details (shown on invoices)">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="Bank Name"><Input value={bankName} onChange={setBankName} placeholder="e.g. Barclays" /></Field>
          <Field label="Sort Code" error={bankSort && stripSortCode(bankSort).length !== 6 && stripSortCode(bankSort).length > 0 ? "Sort code must be exactly 6 digits." : ""}>
            <input type="text" value={bankSort} onChange={e=>setBankSort(e.target.value.replace(/[^0-9-]/g, ""))} onBlur={()=>setBankSort(formatSortCode(bankSort))} placeholder="00-00-00" maxLength={8}
              style={{ width:"100%", padding:"9px 11px", border:`1px solid ${bankSort && stripSortCode(bankSort).length !== 6 && stripSortCode(bankSort).length > 0 ? "#fca5a5" : "#e8e8ec"}`, borderRadius:5, fontSize:15, fontFamily:ff, color:"#1A1A1A", background:"#fff", outline:"none", boxSizing:"border-box", transition:"border 0.15s" }}
              onFocus={e=>e.target.style.borderColor="#1e6be0"} />
          </Field>
          <Field label="Account Number"><Input value={bankAcc} onChange={setBankAcc} placeholder="12345678" /></Field>
          <Field label="IBAN (optional)"><Input value={bankIban} onChange={setBankIban} /></Field>
          <Field label="SWIFT / BIC (optional)"><Input value={bankSwift} onChange={setBankSwift} /></Field>
        </div>
      </Section>)}
      {activeTab === "bank" && <SaveActions label="Save bank settings" />}

      {/* PDF Templates */}
      {activeTab === "templates" && (<Section title="PDF Invoice Templates">
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <Btn onClick={() => navigate(ROUTES.SETTINGS_TEMPLATES)} variant="outline" icon={<Icons.Pen />}>Open dedicated template page</Btn>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:16 }}>
          {PDF_TEMPLATES.map(tpl=>{
            const sel = selectedTpl===tpl.id;
            return (
              <div key={tpl.id}
                onClick={()=>setSelectedTpl(tpl.id)}
                style={{ border:`2px solid ${sel?"#1e6be0":"#e8e8ec"}`, borderRadius:12, overflow:"hidden", cursor:"pointer", transition:"all 0.15s", background:sel?"#eff6ff":"#fff" }}>
                {/* Mini preview swatch */}
                <div style={{ height:80, background:tpl.defaultBg, borderBottom:`3px solid ${tpl.defaultAccent}`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <div style={{ width:60, height:8, background:tpl.defaultAccent, borderRadius:4, opacity:0.8 }} />
                  <div style={{ position:"absolute", bottom:8, left:10, right:10 }}>
                    {[1,2,3].map(i=><div key={i} style={{ height:4, background:tpl.defaultAccent, borderRadius:2, opacity:0.15+(i*0.1), marginBottom:3, width:`${80-i*15}%` }} />)}
                  </div>
                </div>
                <div style={{ padding:"10px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{tpl.name}</div>
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
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"#1e6be0" }} />
                    <span style={{ fontSize:11, color:"#1e6be0", fontWeight:700 }}>Selected</span>
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
                <img src={companyLogo} alt="logo" style={{ maxHeight:40, maxWidth:120, objectFit:"contain", borderRadius:4, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }} />
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
      </Section>)}
      {activeTab === "templates" && <SaveActions label="Save template settings" />}

      {/* Sidebar theme */}
      {activeTab === "appearance" && (<Section title="Sidebar Appearance">
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Style</div>
          <div style={{ display:"flex", gap:8 }}>
            {["solid","gradient"].map(t=>(
              <button key={t} onClick={()=>setThemeType(t)}
                style={{ padding:"7px 16px", borderRadius:8, border:`1.5px solid ${themeType===t?"#1e6be0":"#e8e8ec"}`, background:themeType===t?"#eff6ff":"#fff", color:themeType===t?"#1e6be0":"#374151", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff, textTransform:"capitalize" }}>
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
                  style={{ width:28, height:28, borderRadius:"50%", background:p.color, border:`2px solid ${themeColor===p.color?"#1e6be0":"transparent"}`, cursor:"pointer", outline:"none", boxShadow:p.color==="#FFFFFF"?"inset 0 0 0 1px #E0E0E0":"none" }} />
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
                    style={{ width:24, height:24, borderRadius:"50%", background:c, border:`2px solid ${accentColor===c?"#1e6be0":"transparent"}`, cursor:"pointer", outline:"none" }} />
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
          <span style={{ color:"#fff", fontSize:12, fontWeight:800, letterSpacing:"0.06em", textShadow:"0 1px 2px rgba(0,0,0,0.3)" }}>InvoSaga</span>
          <div style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", background:accentColor }} />
        </div>
      </Section>)}
      {activeTab === "appearance" && <SaveActions label="Save appearance settings" />}

      {/* Payment Methods */}
      {activeTab === "payments" && (<Section title="Custom Payment Methods">
        <p style={{ margin:"0 0 12px", fontSize:13, color:"#888" }}>Add extra payment methods beyond the built-in options.</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
          {customPayMethods.map(m=>(
            <div key={m} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"#f3f4f6", border:"1px solid #e8e8ec", borderRadius:20, fontSize:12, fontWeight:600, color:"#444" }}>
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
      </Section>)}
      {activeTab === "payments" && <SaveActions label="Save payment settings" />}

      {/* General Ledger */}
      {activeTab === "ledger" && (<Section title="General Ledger">
        <div style={{ display:"flex", alignItems:"flex-start", gap:18, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:220 }}>
            <p style={{ margin:"0 0 8px", fontSize:13, color:"#374151", lineHeight:1.6 }}>
              The General Ledger provides a complete double-entry accounting view of your business —
              journal entries, chart of accounts, and a profit &amp; loss statement, all derived automatically
              from your invoices, payments, and expenses.
            </p>
            <ul style={{ margin:"0 0 16px", paddingLeft:18, fontSize:13, color:"#6b7280", lineHeight:1.8 }}>
              <li>Journal — all posted entries with expandable lines</li>
              <li>Chart of Accounts — live balances per account</li>
              <li>P&amp;L — period profit &amp; loss from ledger data</li>
            </ul>
            <Btn variant="primary" icon={<Icons.Bank />} onClick={() => navigate(ROUTES.LEDGER_JOURNAL)}>
              Open General Ledger
            </Btn>
          </div>
          <div style={{ width:56, height:56, background:"#1a1a2e", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", flexShrink:0 }}>
            <Icons.Bank />
          </div>
        </div>
      </Section>)}

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
