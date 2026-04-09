import { useState, useContext, useEffect } from "react";
import { ff, PDF_TEMPLATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import { A4PrintModal } from "../components/shared";
import { loadBusinessData } from "../lib/businessData";
import SettingsOrganization from "./settings/SettingsOrganization";
import SettingsBank from "./settings/SettingsBank";
import SettingsTax from "./settings/SettingsTax";
import SettingsTemplates from "./settings/SettingsTemplates";
import SettingsAppearance from "./settings/SettingsAppearance";
import SettingsPayments from "./settings/SettingsPayments";
import SettingsLedger from "./settings/SettingsLedger";
import SettingsPayroll from "./settings/SettingsPayroll";
import SettingsHMRC from "./settings/SettingsHMRC";

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







  const [previewTpl,   setPreviewTpl]   = useState(null); // template id when preview open (kept for TemplatePreviewModal in parent)




  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState("org");






  // Handle OAuth return redirect — activate HMRC tab when returning from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "hmrc") {
      setActiveTab("hmrc");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    ...orgSettings, // preserves org + bank + tax + payroll + hmrc fields saved by their sub-components
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

      {/* HMRC / MTD (extracted to sub-component) */}
      {activeTab === "hmrc" && <SettingsHMRC orgSettings={orgSettings} onSave={handleSavePartial} />}

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
