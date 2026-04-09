import { useState, useContext, useEffect, useCallback } from "react";
import { ff, PDF_TEMPLATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Btn, SlideToggle, InfoBox } from "../components/atoms";
import { A4PrintModal } from "../components/shared";
import { fmtDate } from "../utils/helpers";
import { loadBusinessData } from "../lib/businessData";
import { supabase } from "../lib/supabase";
import SettingsOrganization from "./settings/SettingsOrganization";
import SettingsBank from "./settings/SettingsBank";
import SettingsTax from "./settings/SettingsTax";
import SettingsTemplates from "./settings/SettingsTemplates";
import SettingsAppearance from "./settings/SettingsAppearance";
import SettingsPayments from "./settings/SettingsPayments";
import SettingsLedger from "./settings/SettingsLedger";
import SettingsPayroll from "./settings/SettingsPayroll";

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
  const {
    orgSettings, setOrgSettings,
    companyLogo,
    companyLogoSize,
    footerText,
    user,
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





  // HMRC / MTD
  const [hmrcStatus,           setHmrcStatus]           = useState("loading");
  const [hmrcTokenInfo,        setHmrcTokenInfo]        = useState(null);
  const [hmrcLoadError,        setHmrcLoadError]        = useState("");
  const [hmrcBanner,           setHmrcBanner]           = useState("");
  const [vatStagger,           setVatStagger]           = useState(org.vatStagger||1);
  const [autoGenerateVatPeriods, setAutoGenerateVatPeriods] = useState(org.autoGenerateVatPeriods!==false);
  const [itsaQuarterlyReminders, setItsaQuarterlyReminders] = useState(org.itsaQuarterlyReminders!==false);

  const [previewTpl,   setPreviewTpl]   = useState(null); // template id when preview open (kept for TemplatePreviewModal in parent)




  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState("org");


  useEffect(() => {
    if (!orgSettings) return;
    const org = orgSettings;
    setVatStagger(org.vatStagger || 1);
    setAutoGenerateVatPeriods(org.autoGenerateVatPeriods !== false);
    setItsaQuarterlyReminders(org.itsaQuarterlyReminders !== false);
  }, [orgSettings]);



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
    ...orgSettings, // preserves org + bank + tax + payroll fields saved by their sub-components
    vatStagger: Number(vatStagger), autoGenerateVatPeriods, itsaQuarterlyReminders,
  });

  // ─── Partial save handler (used by extracted tab components) ────────────
  const handleSavePartial = (partial) => {
    const merged = { ...(orgSettings || {}), ...partial };
    setOrgSettings(merged);
  };

  const handleSaveOrg = () => {
    setSaveError("");
    try {
      const newSettings = buildOrgSettings();
      setOrgSettings(newSettings);
      setSaved(true);
      setTimeout(()=>setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };



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
      {activeTab === "org" && <SettingsOrganization orgSettings={orgSettings} onSave={handleSavePartial} />}

      {/* Tax (extracted to sub-component) */}
      {activeTab === "tax" && <SettingsTax orgSettings={orgSettings} onSave={handleSavePartial} />}
      
      {/* Bank (extracted to sub-component) */}
      {activeTab === "bank" && <SettingsBank orgSettings={orgSettings} onSave={handleSavePartial} />}

      {/* PDF Templates (extracted to sub-component) */}
      {activeTab === "templates" && <SettingsTemplates onPreview={setPreviewTpl} />}

      {/* Sidebar appearance (extracted to sub-component) */}
      {activeTab === "appearance" && <SettingsAppearance />}

      {/* Payment methods (extracted to sub-component) */}
      {activeTab === "payments" && <SettingsPayments />}

      {/* General Ledger (extracted to sub-component) */}
      {activeTab === "ledger" && <SettingsLedger />}

      {/* Payroll (extracted to sub-component) */}
      {activeTab === "payroll" && <SettingsPayroll orgSettings={orgSettings} onSave={handleSavePartial} />}

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
        (org.vatReg || "No") === "Yes" ? (
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
