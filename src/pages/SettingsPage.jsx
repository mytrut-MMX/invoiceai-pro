import { useState, useContext, useEffect } from "react";
import { PDF_TEMPLATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { A4PrintModal } from "../components/shared";
import { loadBusinessData, saveBusinessData } from "../lib/businessData";
import SettingsOrganization from "./settings/SettingsOrganization";
import SettingsBanking from "./settings/SettingsBanking";
import SettingsTax from "./settings/SettingsTax";
import SettingsTemplates from "./settings/SettingsTemplates";
import SettingsAppearance from "./settings/SettingsAppearance";
import SettingsPayments from "./settings/SettingsPayments";
import SettingsLedger from "./settings/SettingsLedger";
import SettingsPayroll from "./settings/SettingsPayroll";
import SettingsHMRC from "./settings/SettingsHMRC";
import SettingsSecurity from "./settings/SettingsSecurity";
import SettingsPaymentTerms from "./settings/SettingsPaymentTerms";
import SettingsReminders from "./settings/SettingsReminders";
import SettingsInvoiceDefaults from "./settings/SettingsInvoiceDefaults";
import SettingsEmailNotifications from "./settings/SettingsEmailNotifications";
import SettingsOpeningBalances from "./settings/SettingsOpeningBalances";
import SettingsBranding from "./settings/SettingsBranding";

// ─── PDF Template Preview modal ───────────────────────────────────────────────
function TemplatePreviewModal({ templateId, onClose }) {
  const demoData = {
    docNumber: "INV-0001",
    customer: {
      name: "Sample Client Ltd",
      companyName: "Sample Client Ltd",
      email: "billing@sampleclient.com",
      phone: "+44 20 7946 0001",
      billingAddress: { street: "45 High Street", city: "London", postcode: "EC1A 1BB", country: "United Kingdom" }
    },
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    paymentTerms: "Net 30",
    items: [
      { id: "1", description: "Web Design & Development", quantity: 1, rate: 2500, tax_rate: 20, amount: 2500 },
      { id: "2", description: "SEO Optimisation Package",  quantity: 3, rate: 150,  tax_rate: 20, amount: 450 },
      { id: "3", description: "Hosting Setup (annual)",    quantity: 1, rate: 120,  tax_rate: 0,  amount: 120 },
    ],
    subtotal: 3070,
    discountAmount: 0,
    shipping: 0,
    taxBreakdown: [{ rate: 20, amount: 590 }],
    cisDeduction: 0,
    total: 3660,
    notes: "Thank you for your business! Payment by bank transfer preferred.",
    terms: "Payment due within 30 days. Late payments may incur 2% monthly interest.",
    status: "Draft",
  };

  const tplDef = PDF_TEMPLATES.find(t => t.id === templateId) || PDF_TEMPLATES[0];

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

const NAV_GROUPS = [
  {
    label: "Account",
    items: [
      { id: "org",                 label: "Organisation" },
      { id: "bank",                label: "Banking" },
      { id: "security",            label: "Security" },
      { id: "appearance",          label: "Appearance" },
      { id: "branding",            label: "Branding" },
      { id: "email-notifications", label: "Email Notifications" },
    ],
  },
  {
    label: "Invoicing",
    items: [
      { id: "payments",         label: "Payment methods" },
      { id: "payment-terms",    label: "Payment Terms" },
      { id: "invoice-defaults", label: "Invoice Defaults" },
      { id: "reminders",        label: "Reminders" },
      { id: "templates",        label: "Templates" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { id: "tax",        label: "Tax & VAT" },
      { id: "hmrc",       label: "HMRC / MTD" },
      { id: "payroll",    label: "Payroll" },
    ],
  },
  {
    label: "Advanced",
    items: [
      { id: "ledger",           label: "General ledger" },
      { id: "opening-balances", label: "Opening Balances" },
      { id: "privacy",          label: "Privacy" },
    ],
  },
];

export default function SettingsPage() {
  const { orgSettings, setOrgSettings, user } = useContext(AppCtx);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    loadBusinessData(user.id).then(({ data }) => {
      if (cancelled || !data?.org_settings) return;
      setOrgSettings(data.org_settings);
    });
    return () => { cancelled = true; };
  }, [user?.id, setOrgSettings]);

  const [previewTpl, setPreviewTpl] = useState(null);
  const [activeTab, setActiveTab] = useState("org");
  const [aiConsent, setAiConsent] = useState(() =>
    localStorage.getItem("invoicesaga_ai_consent") === "true"
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "hmrc" || tab === "payment-terms" || tab === "reminders" || tab === "invoice-defaults" || tab === "email-notifications" || tab === "opening-balances" || tab === "branding") {
      setActiveTab(tab);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSavePartial = async (partial) => {
    const merged = { ...(orgSettings || {}), ...partial };
    setOrgSettings(merged);
    if (user?.id) {
      const { error } = await saveBusinessData(user.id, { org_settings: merged });
      if (error) console.error("Failed to save org settings:", error);
    }
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
            Manage your account and business preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Left nav */}
          <nav className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-2 h-fit lg:sticky lg:top-[68px]">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <div className="border-t border-[var(--border-subtle)] my-2" />}
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {group.label}
                </div>
                {group.items.map(item => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={[
                        "block w-full text-left py-2 px-3 rounded-[var(--radius-md)] text-sm cursor-pointer transition-colors duration-150",
                        active
                          ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-medium"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Right content */}
          <div className="min-w-0">
            {activeTab === "org"        && <SettingsOrganization orgSettings={orgSettings} onSave={handleSavePartial} />}
            {activeTab === "tax"        && <SettingsTax          orgSettings={orgSettings} onSave={handleSavePartial} />}
            {activeTab === "bank"       && <SettingsBanking      orgSettings={orgSettings} onSave={handleSavePartial} />}
            {activeTab === "security"   && <SettingsSecurity />}
            {activeTab === "templates"  && <SettingsTemplates    onPreview={setPreviewTpl} />}
            {activeTab === "appearance" && <SettingsAppearance />}
            {activeTab === "branding"   && <SettingsBranding     orgSettings={orgSettings} onSave={handleSavePartial} />}
            {activeTab === "email-notifications" && <SettingsEmailNotifications orgSettings={orgSettings} onSave={handleSavePartial} />}
            {activeTab === "payments"       && <SettingsPayments />}
            {activeTab === "payment-terms"  && <SettingsPaymentTerms />}
            {activeTab === "invoice-defaults" && <SettingsInvoiceDefaults orgSettings={orgSettings} onSave={handleSavePartial} />}
            {activeTab === "reminders"      && <SettingsReminders   orgSettings={orgSettings} onSave={handleSavePartial} />}
            {activeTab === "ledger"     && <SettingsLedger />}
            {activeTab === "opening-balances" && <SettingsOpeningBalances orgSettings={orgSettings} onSave={handleSavePartial} />}
            {activeTab === "payroll"    && <SettingsPayroll      orgSettings={orgSettings} onSave={handleSavePartial} />}
            {activeTab === "hmrc"       && <SettingsHMRC         orgSettings={orgSettings} onSave={handleSavePartial} />}

            {activeTab === "privacy" && (
              <div>
                <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] mb-4 overflow-hidden">
                  <div className="px-5 py-3 border-b border-[var(--border-subtle)]">
                    <h3 className="m-0 text-sm font-semibold text-[var(--text-primary)]">AI assistant data processing</h3>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                          Allow InvoiceSaga's AI assistant to process your business data (client names, invoice details, financial summaries) to provide personalised advice.
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const next = !aiConsent;
                          if (next) localStorage.setItem("invoicesaga_ai_consent", "true");
                          else localStorage.removeItem("invoicesaga_ai_consent");
                          setAiConsent(next);
                        }}
                        className={[
                          "relative w-11 h-6 p-0 rounded-full border-none cursor-pointer flex-shrink-0 transition-colors duration-200",
                          aiConsent ? "bg-[var(--success-600)]" : "bg-[var(--border-default)]",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-200",
                            aiConsent ? "left-[23px]" : "left-[3px]",
                          ].join(" ")}
                        />
                      </button>
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                      {aiConsent
                        ? "AI data processing is enabled. Your data is processed by Anthropic's Claude API. Anthropic does not use your data for model training. No email addresses are shared."
                        : "AI data processing is disabled. The AI assistant will ask for your consent before processing any data."}
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
                  <div className="px-5 py-3 border-b border-[var(--border-subtle)]">
                    <h3 className="m-0 text-sm font-semibold text-[var(--text-primary)]">What data is processed?</h3>
                  </div>
                  <div className="px-5 py-4">
                    <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      When AI data processing is enabled, the following is sent to generate responses:
                    </div>
                    <ul className="text-sm text-[var(--text-secondary)] leading-relaxed pl-5 mt-2 list-disc">
                      <li>Company name and business type</li>
                      <li>Client names (no email addresses)</li>
                      <li>Invoice numbers, amounts, and statuses</li>
                      <li>Bill and expense summaries</li>
                      <li>VAT and CIS registration status</li>
                    </ul>
                    <div className="text-xs text-[var(--text-tertiary)] mt-3 leading-relaxed">
                      Data is processed in real-time and not stored by the AI provider. See our Privacy Policy for more details.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewTpl && (
        <TemplatePreviewModal
          templateId={previewTpl}
          onClose={() => setPreviewTpl(null)}
        />
      )}
    </div>
  );
}
