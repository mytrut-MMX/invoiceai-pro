import { useState, useContext, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { ff, PDF_TEMPLATES, PAYMENT_METHODS, CIS_RATES, CIS_DEDUCTION_RATES, CIS_DEFAULT_SETTINGS } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Btn, SlideToggle, InfoBox } from "../components/atoms";
import { A4PrintModal } from "../components/shared";
import { fmtDate } from "../utils/helpers";
import { validateImageDataUrl } from "../utils/security";
import { loadBusinessData } from "../lib/businessData";
import { supabase } from "../lib/supabase";
import SettingsOrganization from "./settings/SettingsOrganization";
import SettingsBank from "./settings/SettingsBank";

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

  // Tax / CIS form state (org + bank fields are now in sub-components)
  const [accountingBasis, setAccountingBasis] = useState(org.accountingBasis||"Accrual");
  const [vatReg,       setVatReg]       = useState(org.vatReg||"No");
  const [vatNum,       setVatNum]       = useState(org.vatNum||"");
  const [vatScheme,    setVatScheme]    = useState(org.vatScheme||"Standard");
  const [flatRatePct,  setFlatRatePct]  = useState(org.flatRatePct||"");
  const [cisRole,      setCisRole]      = useState(org.cisRole||"Contractor");
  const [cisRegistrationStatus, setCisRegistrationStatus] = useState(org.cisRegistrationStatus||"Net");
  const [cisEnabled,        setCisEnabled]        = useState(org.cis?.enabled ?? CIS_DEFAULT_SETTINGS.enabled);
  const [cisContractorName, setCisContractorName] = useState(org.cis?.contractorName ?? CIS_DEFAULT_SETTINGS.contractorName);
  const [cisContractorUTR,  setCisContractorUTR]  = useState(org.cis?.contractorUTR ?? org.cisUtrNo ?? CIS_DEFAULT_SETTINGS.contractorUTR);
  const [cisEmployerRef,    setCisEmployerRef]    = useState(org.cis?.employerRef ?? CIS_DEFAULT_SETTINGS.employerRef);
  const [cisDefaultRate,    setCisDefaultRate]    = useState(org.cis?.defaultRate ?? org.cisRate ?? CIS_DEFAULT_SETTINGS.defaultRate);

  // Payroll
  const [payeRef,              setPayeRef]              = useState(org.payeRef||"");
  const [accountsOfficeRef,    setAccountsOfficeRef]    = useState(org.accountsOfficeRef||"");
  const [taxOfficeNumber,      setTaxOfficeNumber]      = useState(org.taxOfficeNumber||"");
  const [pensionProvider,      setPensionProvider]      = useState(org.pensionProvider||"");
  const [defaultPensionEmployeePct, setDefaultPensionEmployeePct] = useState(org.defaultPensionEmployeePct??5);
  const [defaultPensionEmployerPct, setDefaultPensionEmployerPct] = useState(org.defaultPensionEmployerPct??3);
  const [autoEnrolmentStagingDate, setAutoEnrolmentStagingDate] = useState(org.autoEnrolmentStagingDate||"");
  const [defaultPayFrequency,  setDefaultPayFrequency]  = useState(org.defaultPayFrequency||"monthly");
  const [defaultPayDay,        setDefaultPayDay]        = useState(org.defaultPayDay||"last-friday");
  const [payeRefError,         setPayeRefError]         = useState("");

  // HMRC / MTD
  const [hmrcStatus,           setHmrcStatus]           = useState("loading");
  const [hmrcTokenInfo,        setHmrcTokenInfo]        = useState(null);
  const [hmrcLoadError,        setHmrcLoadError]        = useState("");
  const [hmrcBanner,           setHmrcBanner]           = useState("");
  const [vatStagger,           setVatStagger]           = useState(org.vatStagger||1);
  const [autoGenerateVatPeriods, setAutoGenerateVatPeriods] = useState(org.autoGenerateVatPeriods!==false);
  const [itsaQuarterlyReminders, setItsaQuarterlyReminders] = useState(org.itsaQuarterlyReminders!==false);

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

  useEffect(() => {
    if (!orgSettings) return;
    const org = orgSettings;
    setAccountingBasis(org.accountingBasis || "Accrual");
    setVatReg(org.vatReg || "No");
    setVatNum(org.vatNum || "");
    setVatScheme(org.vatScheme || "Standard");
    setFlatRatePct(org.flatRatePct || "");
    setCisEnabled(org.cis?.enabled ?? (org.cisReg === "Yes"));
    setCisContractorName(org.cis?.contractorName || "");
    setCisContractorUTR(org.cis?.contractorUTR || org.cisUtrNo || "");
    setCisEmployerRef(org.cis?.employerRef || "");
    setCisDefaultRate(org.cis?.defaultRate || org.cisRate || CIS_DEFAULT_SETTINGS.defaultRate);
    // Auto-populate contractor name from org name if not already set
    if (!org.cis?.contractorName && org.orgName) setCisContractorName(org.orgName);
    setPayeRef(org.payeRef || "");
    setAccountsOfficeRef(org.accountsOfficeRef || "");
    setTaxOfficeNumber(org.taxOfficeNumber || "");
    setPensionProvider(org.pensionProvider || "");
    setDefaultPensionEmployeePct(org.defaultPensionEmployeePct ?? 5);
    setDefaultPensionEmployerPct(org.defaultPensionEmployerPct ?? 3);
    setAutoEnrolmentStagingDate(org.autoEnrolmentStagingDate || "");
    setDefaultPayFrequency(org.defaultPayFrequency || "monthly");
    setDefaultPayDay(org.defaultPayDay || "last-friday");
    setVatStagger(org.vatStagger || 1);
    setAutoGenerateVatPeriods(org.autoGenerateVatPeriods !== false);
    setItsaQuarterlyReminders(org.itsaQuarterlyReminders !== false);
  }, [orgSettings]);

  // When CIS is enabled and contractor name is blank, default it to the org name
  useEffect(() => {
    if (cisEnabled && !cisContractorName && org.orgName) {
      setCisContractorName(org.orgName);
    }
  }, [cisEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // HMRC connection status loader
  const loadHMRCStatus = useCallback(async () => {
    if (!user?.id || !supabase) return;
    setHmrcStatus("loading");
    setHmrcLoadError("");
    try {
      const { data, error } = await supabase
        .from("hmrc_tokens")
        .select("vrn, expires_at, scope, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) { setHmrcTokenInfo(data); setHmrcStatus("connected"); }
      else { setHmrcStatus("disconnected"); }
    } catch (err) {
      setHmrcLoadError(err.message || "Failed to check HMRC status");
      setHmrcStatus("error");
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === "hmrc") loadHMRCStatus();
  }, [activeTab, loadHMRCStatus]);

  // Handle OAuth return redirect (?tab=hmrc&connected=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "hmrc") {
      setActiveTab("hmrc");
      if (params.get("connected") === "1") {
        setHmrcBanner("Successfully connected to HMRC");
        setTimeout(() => setHmrcBanner(""), 5000);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnectHMRC = () => { window.location.href = "/api/hmrc-auth?action=initiate"; };
  const handleDisconnectHMRC = async () => {
    if (!window.confirm("Disconnect from HMRC? You will need to reconnect before your next VAT or ITSA submission.")) return;
    if (supabase) await supabase.from("hmrc_tokens").delete().eq("user_id", user.id);
    setHmrcStatus("disconnected");
    setHmrcTokenInfo(null);
  };

  const settingTabs = [
    { id:"org", label:"Organization Details" },
    { id:"tax", label:"Tax Details" },
    { id:"bank", label:"Bank Details" },
    { id:"templates", label:"Templates" },
    { id:"appearance", label:"Appearance" },
    { id:"payments", label:"Payment Methods" },
    { id:"ledger", label:"General Ledger" },
    { id:"payroll", label:"Payroll" },
    { id:"hmrc", label:"HMRC / MTD" },
  ];

  const buildOrgSettings = () => ({
    ...orgSettings, // preserves org + bank fields saved by their sub-components
    accountingBasis,
    vatReg, vatNum, vatScheme, flatRatePct: vatScheme === "Flat Rate Scheme" ? flatRatePct : "",
    cisReg: cisEnabled ? "Yes" : "No",
    cisRole, cisRate: cisDefaultRate, cisUtrNo: cisContractorUTR, cisRegistrationStatus,
    payeRef, accountsOfficeRef, taxOfficeNumber, pensionProvider,
    defaultPensionEmployeePct: Number(defaultPensionEmployeePct),
    defaultPensionEmployerPct: Number(defaultPensionEmployerPct),
    autoEnrolmentStagingDate, defaultPayFrequency, defaultPayDay,
    vatStagger: Number(vatStagger), autoGenerateVatPeriods, itsaQuarterlyReminders,
    cis: {
      enabled: cisEnabled,
      contractorName: cisContractorName,
      contractorUTR: cisContractorUTR,
      employerRef: cisEmployerRef,
      defaultRate: cisDefaultRate,
    },
  });

  /** Merge partial settings from a sub-component save into orgSettings. */
  const handleComponentSave = (partialSettings) => {
    const newSettings = { ...orgSettings, ...partialSettings };
    setOrgSettings(newSettings);
  };

  const handleSaveOrg = () => {
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

      {/* Organisation (extracted to sub-component) */}
      {activeTab === "org" && <SettingsOrganization orgSettings={orgSettings} onSave={handleComponentSave} />}

      {/* Tax */}
     {activeTab === "tax" && (<Section title="Tax Registration">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="Accounting Basis" hint="Cash basis available for sole traders with turnover ≤ £150,000">
            <Select value={accountingBasis} onChange={setAccountingBasis} options={["Accrual", "Cash"]} />
          </Field>
          {accountingBasis === "Cash" && org.bType !== "Sole Trader / Freelancer" && (
            <div style={{ gridColumn:"1 / -1" }}>
              <InfoBox color="#D97706">Cash basis is typically only available for sole traders and partnerships. Limited companies must use accrual accounting.</InfoBox>
            </div>
          )}
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
          {vatReg==="Yes" && (
            <Field label="VAT Scheme" hint="Determines when VAT is due to HMRC">
              <Select value={vatScheme} onChange={setVatScheme} options={["Standard", "Cash Accounting", "Flat Rate Scheme", "Annual Accounting"]} />
            </Field>
          )}
          {vatReg==="Yes" && vatScheme === "Flat Rate Scheme" && (
            <Field label="Flat Rate %" hint="Your sector flat rate percentage">
              <Input value={flatRatePct} onChange={setFlatRatePct} type="number" placeholder="e.g. 12" />
            </Field>
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
      
      {/* Bank (extracted to sub-component) */}
      {activeTab === "bank" && <SettingsBank orgSettings={orgSettings} onSave={handleComponentSave} />}

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

      {/* Payroll */}
      {activeTab === "payroll" && (
        <Section title="Employer Details">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <Field label="PAYE Reference" hint="Format: 123/AB456" error={payeRefError}>
              <input value={payeRef} onChange={e => { setPayeRef(e.target.value); if (payeRefError) setPayeRefError(""); }}
                placeholder="123/AB456"
                onBlur={() => { if (payeRef && !/^\d{3}\/[A-Z0-9]{1,10}$/i.test(payeRef)) setPayeRefError("Invalid format (e.g. 123/AB456)"); else setPayeRefError(""); }}
                style={{ width:"100%", padding:"9px 11px", border:`1px solid ${payeRefError?"#fca5a5":"#e8e8ec"}`, borderRadius:5, fontSize:15, fontFamily:ff, color:"#1A1A1A", background:"#fff", outline:"none", boxSizing:"border-box", transition:"border 0.15s" }}
                onFocus={e => e.target.style.borderColor = payeRefError ? "#dc2626" : "#1e6be0"}
              />
            </Field>
            <Field label="Accounts Office Reference" hint="13 characters">
              <Input value={accountsOfficeRef} onChange={setAccountsOfficeRef} placeholder="123PA00012345" />
            </Field>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label="Tax Office Number" hint="3 digits">
              <Input value={taxOfficeNumber} onChange={v => setTaxOfficeNumber(v.replace(/\D/g,"").slice(0,3))} placeholder="123" />
            </Field>
          </div>
        </Section>
      )}
      {activeTab === "payroll" && (
        <Section title="Pension Provider">
          <div style={{ marginBottom:14 }}>
            <Field label="Provider Name">
              <Input value={pensionProvider} onChange={setPensionProvider} placeholder="e.g. NEST, NOW: Pensions, The People's Pension" />
            </Field>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <Field label="Default Employee Contribution %" hint="Auto-enrolment minimum is 5%">
              <Input value={defaultPensionEmployeePct} onChange={setDefaultPensionEmployeePct} type="number" placeholder="5" />
            </Field>
            <Field label="Default Employer Contribution %" hint="Auto-enrolment minimum is 3%">
              <Input value={defaultPensionEmployerPct} onChange={setDefaultPensionEmployerPct} type="number" placeholder="3" />
            </Field>
          </div>
          <Field label="Auto-enrolment Staging Date" hint="Date your auto-enrolment duties started">
            <Input value={autoEnrolmentStagingDate} onChange={setAutoEnrolmentStagingDate} type="date" />
          </Field>
        </Section>
      )}
      {activeTab === "payroll" && (
        <Section title="Pay Schedule">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <Field label="Default Pay Frequency">
              <Select value={defaultPayFrequency} onChange={v => { setDefaultPayFrequency(v); setDefaultPayDay(v === "weekly" ? "friday" : "last-friday"); }}
                options={[{ value:"weekly", label:"Weekly" }, { value:"fortnightly", label:"Fortnightly" }, { value:"monthly", label:"Monthly" }]} />
            </Field>
            <Field label="Default Pay Day">
              <Select value={defaultPayDay} onChange={setDefaultPayDay}
                options={defaultPayFrequency === "weekly" || defaultPayFrequency === "fortnightly"
                  ? [{ value:"friday", label:"Friday" }, { value:"thursday", label:"Thursday" }, { value:"custom", label:"Custom" }]
                  : [{ value:"last-friday", label:"Last Friday" }, { value:"last-working", label:"Last Working Day" }, { value:"25th", label:"25th" }, { value:"custom", label:"Custom" }]
                } />
            </Field>
          </div>
          <InfoBox>These settings provide defaults when creating new payroll runs. You can override them per run.</InfoBox>
        </Section>
      )}
      {activeTab === "payroll" && <SaveActions label="Save payroll settings" />}

      {/* HMRC / MTD */}
      {activeTab === "hmrc" && hmrcBanner && (
        <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#16A34A", fontWeight:600 }}>{hmrcBanner}</div>
      )}
      {activeTab === "hmrc" && (
        <Section title="HMRC Connection">
          {hmrcStatus === "loading" && (
            <div style={{ padding:"20px 0", textAlign:"center", color:"#6b7280", fontSize:13 }}>Checking connection status…</div>
          )}
          {hmrcStatus === "disconnected" && (<>
            <InfoBox style={{ marginBottom:14, borderColor:"#fde68a", background:"#fffbeb", color:"#92400e" }}>
              Connect your InvoiceSaga account to HMRC to submit VAT returns and ITSA quarterly updates digitally.
            </InfoBox>
            <Btn variant="primary" onClick={handleConnectHMRC}>Connect to HMRC →</Btn>
          </>)}
          {hmrcStatus === "connected" && (<>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:"#16A34A" }} />
              <span style={{ fontSize:14, fontWeight:700, color:"#16A34A" }}>Connected to HMRC</span>
            </div>
            <div style={{ background:"#f9fafb", borderRadius:8, border:"1px solid #e8e8ec", padding:"12px 16px", marginBottom:16 }}>
              {[
                { label:"VAT Number", value: org.vatNum || "—" },
                { label:"HMRC VRN", value: hmrcTokenInfo?.vrn || "—" },
                { label:"Connected since", value: hmrcTokenInfo?.created_at ? fmtDate(hmrcTokenInfo.created_at) : "—" },
                { label:"Token expires", value: hmrcTokenInfo?.expires_at ? fmtDate(hmrcTokenInfo.expires_at) : "—" },
                { label:"Scope", value: hmrcTokenInfo?.scope || "—" },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", padding:"6px 0", borderBottom:"1px solid #f0f0f4" }}>
                  <div style={{ width:160, fontSize:12, color:"#6b7280", fontWeight:500 }}>{r.label}</div>
                  <div style={{ fontSize:12, color:"#1a1a2e", fontWeight:600, fontFamily: r.label === "HMRC VRN" ? "'Courier New', monospace" : "inherit" }}>{r.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Btn variant="outline" onClick={handleDisconnectHMRC}>Disconnect</Btn>
              <span style={{ fontSize:11, color:"#6b7280" }}>Disconnecting will require re-authorisation before your next submission.</span>
            </div>
          </>)}
          {hmrcStatus === "error" && (<>
            <InfoBox style={{ borderColor:"#fecaca", background:"#fef2f2", color:"#b91c1c" }}>
              {hmrcLoadError || "Failed to check HMRC connection status."}
            </InfoBox>
            <Btn variant="outline" onClick={loadHMRCStatus} style={{ marginTop:10 }}>Retry</Btn>
          </>)}
        </Section>
      )}
      {activeTab === "hmrc" && (
        vatReg === "Yes" ? (
          <Section title="MTD VAT Configuration">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <Field label="VAT Stagger Group" hint="Assigned by HMRC — printed on your VAT certificate">
                <Select value={String(vatStagger)} onChange={v => setVatStagger(Number(v))}
                  options={[
                    { value:"1", label:"Stagger 1 — Jan / Apr / Jul / Oct" },
                    { value:"2", label:"Stagger 2 — Feb / May / Aug / Nov" },
                    { value:"3", label:"Stagger 3 — Mar / Jun / Sep / Dec" },
                  ]} />
              </Field>
            </div>
            <div style={{ marginBottom:14 }}>
              <Field label="Auto-generate VAT periods">
                <SlideToggle value={autoGenerateVatPeriods} onChange={setAutoGenerateVatPeriods} />
              </Field>
              <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>Automatically create VAT period records each quarter.</div>
            </div>
          </Section>
        ) : (
          <Section title="MTD VAT Configuration">
            <InfoBox>MTD VAT requires VAT registration. Enable VAT in the Tax tab first.</InfoBox>
          </Section>
        )
      )}
      {activeTab === "hmrc" && (
        org.bType === "Sole Trader / Freelancer" ? (
          <Section title="MTD ITSA Configuration">
            <div style={{ marginBottom:14 }}>
              <Field label="UTR Number" hint="Set in the Tax tab under CIS settings">
                <Input value={org.cis?.contractorUTR || org.cisUtrNo || ""} readOnly />
              </Field>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#1a1a2e", marginBottom:6 }}>Qualifying Income Thresholds</div>
              <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.8 }}>
                From April 2026: <strong>£50,000</strong> · From April 2027: <strong>£30,000</strong> · From April 2028: <strong>£20,000</strong>
              </div>
            </div>
            <Field label="Quarterly Submission Reminders">
              <SlideToggle value={itsaQuarterlyReminders} onChange={setItsaQuarterlyReminders} />
            </Field>
            <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>Get reminded 7 days before each quarterly deadline.</div>
          </Section>
        ) : (
          <Section title="MTD ITSA Configuration">
            <InfoBox>MTD ITSA applies to sole traders and landlords.</InfoBox>
          </Section>
        )
      )}
      {activeTab === "hmrc" && <SaveActions label="Save HMRC settings" />}

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
