import { useState, useEffect } from "react";
import "./responsive.css";
import { ff, MOCK_CUSTOMERS, MOCK_ITEMS_INIT, MOCK_INV_LIST, MOCK_QUOTES_LIST, MOCK_PAYMENTS, DEFAULT_INV_TERMS, DEFAULT_QUOTE_TERMS } from "./constants";
import { AppCtx } from "./context/AppContext";
import { Sidebar, MobileTopBar, MobileBottomNav, MobileDrawer } from "./components/layout";

// pages
import AuthPage from "./pages/AuthPage";
import OrgSetupPage from "./pages/OrgSetupPage";
import HomePage from "./pages/HomePage";
import CustomersPage from "./pages/CustomersPage";
import ItemsPage from "./pages/ItemsPage";
import InvoicesPage from "./pages/InvoicesPage";
import QuotesPage from "./pages/QuotesPage";
import PaymentsPage from "./pages/PaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import LandingPage from './pages/landing';
import OnboardingFlow from "./pages/OnboardingFlow";

// modals
import UserEditModal from "./modals/UserEditModal";

// ─── localStorage helpers ──────────────────────────────────────────────────
const LS = {
  get: (key, fallback) => { try { const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; } catch{ return fallback; } },
  getArray: (key, fallback=[]) => {
    const value = LS.get(key, fallback);
    return Array.isArray(value) ? value : fallback;
  },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch{} }
};

export default function App() {
  // Auth
  const [user, setUser] = useState(()=>LS.get("ai_invoice_user",null));
  const [orgSettings, setOrgSettingsState] = useState(()=>LS.get("ai_invoice_org",null));
  const [onboardingDone, setOnboardingDoneState] = useState(() => LS.get("ai_invoice_onboarding_done", false));

  // App state
  const [page, setPage] = useState("home");
  const [customers, setCustomers] = useState(()=>LS.getArray("ai_invoice_customers", MOCK_CUSTOMERS));
  const [catalogItems, setCatalogItems] = useState(()=>LS.getArray("ai_invoice_items", MOCK_ITEMS_INIT));
  const [invoices, setInvoices] = useState(()=>LS.getArray("ai_invoice_invoices", MOCK_INV_LIST));
  const [quotes, setQuotes] = useState(()=>LS.getArray("ai_invoice_quotes", MOCK_QUOTES_LIST));
  const [payments, setPayments] = useState(()=>LS.getArray("ai_invoice_payments", MOCK_PAYMENTS));
  const [customPayMethods, setCustomPayMethods] = useState(()=>LS.getArray("ai_invoice_pay_methods",[]));

  // UI / Prefs
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(()=>LS.get("ai_invoice_sidebar_pinned",true));
  const [appTheme, setAppTheme] = useState(()=>LS.get("ai_invoice_theme",{ type:"solid", color:"rgb(33, 38, 60)", color2:"#333", accent:"#E86C4A" }));
  const [userAvatar, setUserAvatar] = useState(()=>LS.get("ai_invoice_avatar",null));
  const [showUserModal, setShowUserModal] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // PDF / Invoice settings
  const [pdfTemplate, setPdfTemplate] = useState(()=>LS.get("ai_invoice_pdf_template","classic"));
  const [companyLogo, setCompanyLogo] = useState(()=>LS.get("ai_invoice_logo",null));
  const [companyLogoSize, setCompanyLogoSize] = useState(()=>LS.get("ai_invoice_logo_size",52));
  const [invoicePrefix, setInvoicePrefix] = useState(()=>LS.get("ai_invoice_inv_prefix","INV-"));
  const [quotePrefix, setQuotePrefix] = useState(()=>LS.get("ai_invoice_quo_prefix","QUO-"));
  const [invoiceStartNum, setInvoiceStartNum] = useState(()=>LS.get("ai_invoice_inv_start",1));
  const [quoteStartNum, setQuoteStartNum] = useState(()=>LS.get("ai_invoice_quo_start",1));
  const [defaultInvTerms, setDefaultInvTerms] = useState(()=>LS.get("ai_invoice_inv_terms",DEFAULT_INV_TERMS));
  const [defaultQuoteTerms, setDefaultQuoteTerms] = useState(()=>LS.get("ai_invoice_quo_terms",DEFAULT_QUOTE_TERMS));
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(()=>LS.get("ai_invoice_pay_terms","Net 30"));
  const [footerText, setFooterText] = useState(()=>LS.get("ai_invoice_footer",""));
  const [invoiceTemplateConfig, setInvoiceTemplateConfig] = useState(()=>LS.get("ai_invoice_template_config",null))

  // Integrations
  const [supabaseUrl, setSupabaseUrl] = useState(()=>LS.get("ai_invoice_sb_url",""));
  const [supabaseKey, setSupabaseKey] = useState(()=>LS.get("ai_invoice_sb_key",""));
  const [googleDriveEnabled, setGoogleDriveEnabled] = useState(()=>LS.get("ai_invoice_gdrive",false));
  const [emailEnabled, setEmailEnabled] = useState(()=>LS.get("ai_invoice_email_en",false));
  const [emailProvider, setEmailProvider] = useState(()=>LS.get("ai_invoice_email_prov","SMTP"));
  const [emailFrom, setEmailFrom] = useState(()=>LS.get("ai_invoice_email_from",""));

  // ─── persist to localStorage ──────────────────────────────────
  useEffect(()=>LS.set("ai_invoice_user",user),[user]);
  useEffect(()=>LS.set("ai_invoice_org",orgSettings),[orgSettings]);
  useEffect(()=>LS.set("ai_invoice_customers",customers),[customers]);
  useEffect(()=>LS.set("ai_invoice_items",catalogItems),[catalogItems]);
  useEffect(()=>LS.set("ai_invoice_invoices",invoices),[invoices]);
  useEffect(()=>LS.set("ai_invoice_quotes",quotes),[quotes]);
  useEffect(()=>LS.set("ai_invoice_payments",payments),[payments]);
  useEffect(()=>LS.set("ai_invoice_pay_methods",customPayMethods),[customPayMethods]);
  useEffect(()=>LS.set("ai_invoice_sidebar_pinned",sidebarPinned),[sidebarPinned]);
  useEffect(()=>LS.set("ai_invoice_theme",appTheme),[appTheme]);
  useEffect(()=>LS.set("ai_invoice_avatar",userAvatar),[userAvatar]);
  useEffect(()=>LS.set("ai_invoice_pdf_template",pdfTemplate),[pdfTemplate]);
  useEffect(()=>LS.set("ai_invoice_logo",companyLogo),[companyLogo]);
  useEffect(()=>LS.set("ai_invoice_logo_size",companyLogoSize),[companyLogoSize]);
  useEffect(()=>LS.set("ai_invoice_inv_prefix",invoicePrefix),[invoicePrefix]);
  useEffect(()=>LS.set("ai_invoice_quo_prefix",quotePrefix),[quotePrefix]);
  useEffect(()=>LS.set("ai_invoice_inv_start",invoiceStartNum),[invoiceStartNum]);
  useEffect(()=>LS.set("ai_invoice_quo_start",quoteStartNum),[quoteStartNum]);
  useEffect(()=>LS.set("ai_invoice_inv_terms",defaultInvTerms),[defaultInvTerms]);
  useEffect(()=>LS.set("ai_invoice_quo_terms",defaultQuoteTerms),[defaultQuoteTerms]);
  useEffect(()=>LS.set("ai_invoice_pay_terms",defaultPaymentTerms),[defaultPaymentTerms]);
  useEffect(()=>LS.set("ai_invoice_footer",footerText),[footerText]);
  useEffect(()=>LS.set("ai_invoice_template_config",invoiceTemplateConfig),[invoiceTemplateConfig]);
  useEffect(()=>LS.set("ai_invoice_sb_url",supabaseUrl),[supabaseUrl]);
  useEffect(()=>LS.set("ai_invoice_sb_key",supabaseKey),[supabaseKey]);
  useEffect(()=>LS.set("ai_invoice_gdrive",googleDriveEnabled),[googleDriveEnabled]);
  useEffect(()=>LS.set("ai_invoice_email_en",emailEnabled),[emailEnabled]);
  useEffect(()=>LS.set("ai_invoice_email_prov",emailProvider),[emailProvider]);
  useEffect(()=>LS.set("ai_invoice_email_from",emailFrom),[emailFrom]);
  useEffect(() => LS.set("ai_invoice_onboarding_done", onboardingDone), [onboardingDone]);

  const setOrgSettings = (s) => { setOrgSettingsState(s); LS.set("ai_invoice_org",s); };

  // ─── context value ─────────────────────────────────────────────
  const ctx = {
    user, setUser,
    orgSettings, setOrgSettings,
    customers, setCustomers,
    catalogItems, setCatalogItems,
    invoices, setInvoices,
    quotes, setQuotes,
    payments, setPayments,
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
    invoiceTemplateConfig, setInvoiceTemplateConfig,
    appTheme, setAppTheme,
    supabaseUrl, setSupabaseUrl,
    supabaseKey, setSupabaseKey,
    googleDriveEnabled, setGoogleDriveEnabled,
    emailEnabled, setEmailEnabled,
    emailProvider, setEmailProvider,
    emailFrom, setEmailFrom,
  };

  const sidebarBg = appTheme.type==="gradient"
    ? `linear-gradient(160deg,${appTheme.color},${appTheme.color2})`
    : appTheme.color;

  // ─── gates ─────────────────────────────────────────────────────
  if(!user) {
  const isLanding = window.location.pathname === '/' || window.location.pathname === '';
  if(isLanding) {
    return <LandingPage />;
  }
  return (
    <AppCtx.Provider value={ctx}>
      <AuthPage onAuth={(u)=>{ setUser(u); }} />
    </AppCtx.Provider>
  );
}

  if (!orgSettings || !onboardingDone) return (
  <OnboardingFlow
    user={user}
    orgSettings={orgSettings}
    onComplete={({ orgSettings: org, done }) => {
      if (org) setOrgSettings(org);
      if (done) { setOnboardingDoneState(true); LS.set("ai_invoice_onboarding_done", true); }
    }}
    customers={customers}
    setCustomers={setCustomers}
    invoices={invoices}
    setInvoices={setInvoices}
    invoicePrefix={invoicePrefix}
    invoiceStartNum={invoiceStartNum}
  />
);

  // ─── page renderer ─────────────────────────────────────────────
  const doLogout = () => {
    setUser(null);
    setMobileDrawerOpen(false);
    setShowUserModal(false);
  };

  const handleNavigate = (nextPage) => {
    if (nextPage === "logout") {
      doLogout(); 
      return;
    }
    setPage(nextPage);
    setMobileDrawerOpen(false);
  };

  const renderPage = () => {
    if (page.startsWith("settings")) return <SettingsPage activeSubPage={page} onNavigate={handleNavigate} />;

    switch(page) {
      case "home":      return <HomePage user={user} onNavigate={handleNavigate} />;
      case "customers": return <CustomersPage />;
      case "items":     return <ItemsPage />;
      case "quotes":    return <QuotesPage onNavigate={handleNavigate} />;
      case "invoices":  return <InvoicesPage />;
      case "payments":  return <PaymentsPage />;
      default:          return <HomePage user={user} onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{ display:"flex", height:"100vh", overflow:"hidden", fontFamily:ff, background:"#f4f5f7" }}>

        {/* Desktop sidebar — hidden on mobile via media query in index.css */}
        <div className="desktop-only">
          <Sidebar
            activePage={page}
            onNavigate={handleNavigate}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            accent={appTheme.accent}
            sidebarBg={sidebarBg}
            user={user}
            userAvatar={userAvatar}
            onUserClick={()=>setShowUserModal(true)}
            onLogout={doLogout}
          />
        </div>

        {/* Main content */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0, background:"#fff", borderBottom:"1px solid #e8e8ec" }}>

          {/* Mobile top bar */}
          <div className="mobile-only">
            <MobileTopBar
              activePage={page}
              onMenuOpen={()=>setMobileDrawerOpen(true)}
              sidebarBg={sidebarBg}
              accent={appTheme.accent}
              user={user}
              userAvatar={userAvatar}
              onUserClick={()=>setShowUserModal(true)}
            />
            {/* Spacer so content doesn't hide under fixed topbar */}
            <div style={{ height:52 }} />
          </div>

          {/* Page content */}
          <main style={{ flex:1, overflowY:"auto" }}>
            {renderPage()}
          </main>

          {/* Mobile bottom nav */}
          <div className="mobile-only">
            <MobileBottomNav
              activePage={page}
              onNavigate={handleNavigate}
              accent={appTheme.accent}
            />
            {/* Spacer so content doesn't hide under fixed bottom nav */}
            <div style={{ height:60 }} />
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileDrawerOpen && (
          <MobileDrawer
            activePage={page}
            onNavigate={handleNavigate}
            onClose={()=>setMobileDrawerOpen(false)}
            sidebarBg={sidebarBg}
            accent={appTheme.accent}
            user={user}
            userAvatar={userAvatar}
            onUserClick={()=>setShowUserModal(true)}
            onLogout={doLogout}
          />
        )}

        {/* User / appearance modal */}
        {showUserModal && (
          <UserEditModal
            user={user}
            onClose={()=>setShowUserModal(false)}
            onSave={(u)=>setUser(p=>({...p,...u}))}
            userAvatar={userAvatar}
            setUserAvatar={setUserAvatar}
            appTheme={appTheme}
            setAppTheme={setAppTheme}
            sidebarPinned={sidebarPinned}
            setSidebarPinned={setSidebarPinned}
            onLogout={doLogout}
          />
        )}
      </div>
    </AppCtx.Provider>
  );
}
