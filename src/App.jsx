import { useState, useEffect, useRef } from "react";
import "./responsive.css";
import { ff, MOCK_CUSTOMERS, MOCK_ITEMS_INIT, MOCK_INV_LIST, MOCK_QUOTES_LIST, MOCK_PAYMENTS, DEFAULT_INV_TERMS, DEFAULT_QUOTE_TERMS } from "./constants";
import { AppCtx } from "./context/AppContext";
import { Sidebar, MobileTopBar, MobileBottomNav, MobileDrawer } from "./components/layout";
import { todayStr } from "./utils/helpers";
import { saveAll } from "./utils/storage";
import { getSession } from "./lib/supabase";

// pages
import AuthPage from "./pages/AuthPage";
import OrgSetupPage from "./pages/OrgSetupPage";
import HomePage from "./pages/HomePage";
import CustomersPage from "./pages/CustomersPage";
import ItemsPage from "./pages/ItemsPage";
import InvoicesPage from "./pages/InvoicesPage";
import QuotesPage from "./pages/QuotesPage";
import PaymentsPage from "./pages/PaymentsPage";
import ExpensesPage from "./pages/ExpensesPage";
import SettingsPage from "./pages/SettingsPage";
import LandingPage from './pages/landing';
import OnboardingFlow from "./pages/OnboardingFlow.jsx";
import PrivacyPage from "./pages/landing/PrivacyPage";
import TermsPage from "./pages/landing/TermsPage";
import CookiePolicyPage from "./pages/landing/CookiePolicyPage";
import GdprPage from "./pages/landing/GdprPage";
import TemplatesPage from "./pages/landing/TemplatesPage";
import ContactPage from "./pages/landing/ContactPage";
import AdminPage from "./pages/AdminPage";
import LedgerPage from "./pages/LedgerPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";

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
  // Auth — AUTH-003: validate session expiry on load
  const [user, setUser] = useState(() => {
    const stored = LS.get("ai_invoice_user", null);
    if (!stored) return null;
    if (stored.expiresAt && Date.now() > stored.expiresAt) {
      localStorage.removeItem("ai_invoice_user");
      return null;
    }
    return stored;
  });
  // Check for an active Supabase OAuth session on first load (handles the case where
  // Google/GitHub redirects back to "/" with tokens in the URL hash instead of /auth/callback)
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    getSession().then(session => {
      if (session?.user) {
        const u = {
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          role: "Admin",
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
          provider: session.user.app_metadata?.provider || "email",
        };
        const prev = LS.get("ai_invoice_user", null);
        if (prev?.email !== u.email) {
          setOnboardingDoneState(false);
          LS.set("ai_invoice_onboarding_done", false);
        }
        LS.set("ai_invoice_user", u);
        setUser(u);
        // Clean up any OAuth params from the URL without causing a reload
        if (window.location.search || window.location.hash) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
      setAuthChecked(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [expenses, setExpenses] = useState(()=>LS.getArray("ai_invoice_expenses",[]));

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

  // ─── auto-mark overdue invoices ───────────────────────────────
  useEffect(() => {
    const markOverdue = () => {
      const today = todayStr();
      setInvoices(prev => {
        const updated = prev.map(inv => {
          if (
            (inv.status === "Sent" || inv.status === "Partial") &&
            inv.due_date && inv.due_date < today
          ) return { ...inv, status: "Overdue" };
          return inv;
        });
        return updated.some((inv, i) => inv !== prev[i]) ? updated : prev;
      });
    };
    markOverdue();
    const timer = setInterval(markOverdue, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── session expiry enforcement ──────────────────────────────
  useEffect(() => {
    if (!user?.expiresAt) return;
    const check = () => {
      if (Date.now() > user.expiresAt) {
        setUser(null);
        localStorage.removeItem("ai_invoice_user");
        alert("Your session has expired. Please log in again.");
      }
    };
    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.expiresAt]);

  const sessionExpiringSoon = user?.expiresAt && (user.expiresAt - Date.now()) < 30 * 60 * 1000 && Date.now() < user.expiresAt;

  // ─── debounced persistence to localStorage ────────────────────
  const [storageError, setStorageError] = useState(null);
  const persistTimer = useRef(null);

  useEffect(() => {
    window.addEventListener("storage-error", (e) => {
      setStorageError(`Storage full — data may not be saved (${e.detail.keys.length} key(s) failed).`);
    });
  }, []);

  useEffect(() => {
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      saveAll({
        ai_invoice_user:           user,
        ai_invoice_org:            orgSettings,
        ai_invoice_onboarding_done:onboardingDone,
        ai_invoice_customers:      customers,
        ai_invoice_items:          catalogItems,
        ai_invoice_invoices:       invoices,
        ai_invoice_quotes:         quotes,
        ai_invoice_payments:       payments,
        ai_invoice_pay_methods:    customPayMethods,
        ai_invoice_expenses:       expenses,
        ai_invoice_sidebar_pinned: sidebarPinned,
        ai_invoice_theme:          appTheme,
        ai_invoice_avatar:         userAvatar,
        ai_invoice_pdf_template:   pdfTemplate,
        ai_invoice_logo:           companyLogo,
        ai_invoice_logo_size:      companyLogoSize,
        ai_invoice_inv_prefix:     invoicePrefix,
        ai_invoice_quo_prefix:     quotePrefix,
        ai_invoice_inv_start:      invoiceStartNum,
        ai_invoice_quo_start:      quoteStartNum,
        ai_invoice_inv_terms:      defaultInvTerms,
        ai_invoice_quo_terms:      defaultQuoteTerms,
        ai_invoice_pay_terms:      defaultPaymentTerms,
        ai_invoice_footer:         footerText,
        ai_invoice_template_config:invoiceTemplateConfig,
        ai_invoice_sb_url:         supabaseUrl,
        ai_invoice_sb_key:         supabaseKey,
        ai_invoice_gdrive:         googleDriveEnabled,
        ai_invoice_email_en:       emailEnabled,
        ai_invoice_email_prov:     emailProvider,
        ai_invoice_email_from:     emailFrom,
      });
    }, 300);
    return () => clearTimeout(persistTimer.current);
  }, [
    user, orgSettings, onboardingDone, customers, catalogItems,
    invoices, quotes, payments, customPayMethods, expenses,
    sidebarPinned, appTheme, userAvatar, pdfTemplate,
    companyLogo, companyLogoSize, invoicePrefix, quotePrefix,
    invoiceStartNum, quoteStartNum, defaultInvTerms, defaultQuoteTerms,
    defaultPaymentTerms, footerText, invoiceTemplateConfig,
    supabaseUrl, supabaseKey, googleDriveEnabled,
    emailEnabled, emailProvider, emailFrom,
  ]);

  const setOrgSettings = (s) => setOrgSettingsState(s);

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
    expenses, setExpenses,
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
  const path = window.location.pathname;
  if(path === '/privacy')         return <PrivacyPage />;
  if(path === '/terms')           return <TermsPage />;
  if(path === '/cookies')         return <CookiePolicyPage />;
  if(path === '/gdpr')            return <GdprPage />;
  if(path === '/contact')         return <ContactPage />;

  // Supabase Auth exchanges the OAuth token from the URL hash automatically
  // via the JS client; this page just waits for the session and calls onAuth.
  // Also handle ?code= landing on "/" if Supabase redirects to site root instead of /auth/callback
  const _search = new URLSearchParams(window.location.search);
  const isOAuthCallback = path === '/auth/callback' || (_search.has('code') && _search.has('state'));
  if(isOAuthCallback) {
    return (
      <AuthCallbackPage onAuth={(u) => {
        const prev = LS.get("ai_invoice_user", null);
        if (prev?.email !== u.email) {
          setOnboardingDoneState(false);
          LS.set("ai_invoice_onboarding_done", false);
        }
        LS.set("ai_invoice_user", u);
        setUser(u);
      }} />
    );
  }

  // Don't render landing page until we've checked for an existing OAuth session —
  // prevents a flash of LandingPage when user returns from Google OAuth redirect
  if (!user && !authChecked) return null;

  if(!user) {
  if(path === '/' || path === '') return <LandingPage />;
  if(path === '/templates')       return <TemplatesPage />;
  if(path === '/admin')           return <AdminPage />;
  return (
    <AppCtx.Provider value={ctx}>
      <AuthPage onAuth={(u)=>{
        const prev = LS.get("ai_invoice_user", null);
        if (prev?.email !== u.email) {
          setOnboardingDoneState(false);
          LS.set("ai_invoice_onboarding_done", false);
        }
        setUser(u);
      }} />
    </AppCtx.Provider>
  );
}

  if (!orgSettings || !onboardingDone) return (
  <AppCtx.Provider value={ctx}>
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
  </AppCtx.Provider>
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
       case "home":         return <HomePage key={page} user={user} onNavigate={handleNavigate} />;
      case "customers":    return <CustomersPage key={page} />;
      case "customers:new": return <CustomersPage key={page} initialShowForm={true} onNavigate={handleNavigate} />;
      case "items":        return <ItemsPage key={page} />;
      case "items:new":    return <ItemsPage key={page} initialShowForm={true} onNavigate={handleNavigate} />;
      case "quotes":       return <QuotesPage key={page} onNavigate={handleNavigate} />;
      case "quotes:new":   return <QuotesPage key={page} initialShowForm={true} onNavigate={handleNavigate} />;
      case "invoices":     return <InvoicesPage key={page} />;
      case "invoices:new": return <InvoicesPage key={page} initialShowForm={true} onNavigate={handleNavigate} />;
      case "payments":     return <PaymentsPage key={page} />;
      case "payments:new": return <PaymentsPage key={page} initialShowForm={true} onNavigate={handleNavigate} />;
      case "expenses":     return <ExpensesPage key={page} />;
      case "expenses:new": return <ExpensesPage key={page} initialShowForm={true} onNavigate={handleNavigate} />;
      case "ledger":       return <LedgerPage key={page} />;
      default:             return <HomePage key={page} user={user} onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppCtx.Provider value={ctx}>
      {storageError && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:9999, background:"#7F1D1D", color:"#FEE2E2", fontSize:13, fontWeight:600, padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, fontFamily:ff }}>
          <span>⚠ {storageError}</span>
          <button onClick={() => setStorageError(null)} style={{ background:"none", border:"none", color:"#FCA5A5", cursor:"pointer", fontSize:18, lineHeight:1, padding:0 }}>×</button>
        </div>
      )}
      {sessionExpiringSoon && (
        <div style={{ position:"fixed", top:storageError ? 44 : 0, left:0, right:0, zIndex:9998, background:"#78350F", color:"#FEF3C7", fontSize:13, fontWeight:600, padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, fontFamily:ff }}>
          <span>⚠ Your session expires soon. Save your work.</span>
          <button onClick={() => setUser(prev => { const updated = { ...prev, expiresAt: Date.now() + 8 * 60 * 60 * 1000 }; localStorage.setItem("ai_invoice_user", JSON.stringify(updated)); return updated; })} style={{ background:"#FEF3C7", color:"#78350F", border:"none", borderRadius:6, padding:"4px 12px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff }}>Stay logged in</button>
        </div>
      )}
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
          <main className="main-content" style={{ flex:1, overflowY:"auto" }}>
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
