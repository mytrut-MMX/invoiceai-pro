import { useState, useContext, useEffect } from "react";
import { ff, PDF_TEMPLATES } from "../constants";
import { AppCtx } from "../context/AppContext";
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

  const [previewTpl, setPreviewTpl] = useState(null); // template id when preview open (kept for TemplatePreviewModal in parent)
  const [activeTab, setActiveTab] = useState("org");
  const [aiConsent, setAiConsent] = useState(() =>
    localStorage.getItem('invoicesaga_ai_consent') === 'true'
  );

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
    { id:"privacy", label:"Privacy" },
  ];

  // ─── Partial save handler (used by extracted tab components) ────────────
  const handleSavePartial = (partial) => {
    const merged = { ...(orgSettings || {}), ...partial };
    setOrgSettings(merged);
  };

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

      {activeTab === "privacy" && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>Privacy & Data Processing</h3>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>AI Assistant Data Processing</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Allow InvoiceSaga's AI assistant to process your business data (client names, invoice details, financial summaries) to provide personalised advice.
                </div>
              </div>
              <button
                onClick={() => {
                  const next = !aiConsent;
                  if (next) {
                    localStorage.setItem('invoicesaga_ai_consent', 'true');
                  } else {
                    localStorage.removeItem('invoicesaga_ai_consent');
                  }
                  setAiConsent(next);
                }}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none',
                  background: aiConsent ? '#16A34A' : '#d1d5db',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                  flexShrink: 0, marginLeft: 16,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: aiConsent ? 23 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>

            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
              {aiConsent
                ? 'AI data processing is enabled. Your data is processed by Anthropic\'s Claude API. Anthropic does not use your data for model training. No email addresses are shared.'
                : 'AI data processing is disabled. The AI assistant will ask for your consent before processing any data.'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>What data is processed?</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
              When AI data processing is enabled, the following is sent to generate responses:
            </div>
            <ul style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, paddingLeft: 20, marginTop: 8 }}>
              <li>Company name and business type</li>
              <li>Client names (no email addresses)</li>
              <li>Invoice numbers, amounts, and statuses</li>
              <li>Bill and expense summaries</li>
              <li>VAT and CIS registration status</li>
            </ul>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, lineHeight: 1.6 }}>
              Data is processed in real-time and not stored by the AI provider. See our Privacy Policy for more details.
            </div>
          </div>
        </div>
      )}

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
