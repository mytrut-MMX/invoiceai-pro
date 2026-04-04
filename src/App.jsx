import { useState, useEffect, useRef } from "react";
import "./responsive.css";
import { MOCK_CUSTOMERS, MOCK_ITEMS_INIT, MOCK_INV_LIST, MOCK_QUOTES_LIST, MOCK_PAYMENTS, DEFAULT_INV_TERMS, DEFAULT_QUOTE_TERMS } from "./constants";
import { AppCtx } from "./context/AppContext";
import { todayStr } from "./utils/helpers";
import { saveAll } from "./utils/storage";
import { getSession, signOut, supabase } from "./lib/supabase";
import AppRouter from "./router";

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
  // ─── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    const stored = LS.get("ai_invoice_user", null);
    if (!stored) return null;
    if (stored.expiresAt && Date.now() > stored.expiresAt) {
      localStorage.removeItem("ai_invoice_user");
      return null;
    }
    return stored;
  });

  // authChecked: true once the initial Supabase session check resolves.
  // ProtectedRoute uses a localStorage heuristic for the same purpose,
  // but this flag is exposed in ctx for any component that needs it.
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const applySession = (session) => {
      if (!session?.user) return;
      const u = {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email,
        email: session.user.email,
        role: "Admin",
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        provider: session.user.app_metadata?.provider || "email",
      };
      // If a different user is logging in, reset their onboarding flag.
      const prev = LS.get("ai_invoice_user", null);
      if (prev && prev.email !== u.email) {
        LS.set("ai_invoice_onboarding_done", false);
      }
      LS.set("ai_invoice_user", u);
      setUser(u);
      // Strip OAuth params from URL without a reload.
      if (window.location.search || window.location.hash) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    };

    let unsubscribe = () => {};
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          applySession(session);
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    }

    getSession()
      .then(applySession)
      .catch((err) => {
        console.warn("[Auth] Session check failed. Rendering app without Supabase session.", err);
      })
      .finally(() => setAuthChecked(true));

    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Session expiry enforcement ────────────────────────────────────────────
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

  // ─── App data state ────────────────────────────────────────────────────────
  const [orgSettings, setOrgSettingsState] = useState(() => LS.get("ai_invoice_org", null));
  const [customers,   setCustomers]   = useState(() => LS.getArray("ai_invoice_customers", MOCK_CUSTOMERS));
  const [catalogItems,setCatalogItems] = useState(() => LS.getArray("ai_invoice_items", MOCK_ITEMS_INIT));
  const [invoices,    setInvoices]    = useState(() => LS.getArray("ai_invoice_invoices", MOCK_INV_LIST));
  const [quotes,      setQuotes]      = useState(() => LS.getArray("ai_invoice_quotes", MOCK_QUOTES_LIST));
  const [payments,    setPayments]    = useState(() => LS.getArray("ai_invoice_payments", MOCK_PAYMENTS));
  const [customPayMethods, setCustomPayMethods] = useState(() => LS.getArray("ai_invoice_pay_methods", []));
  const [expenses,    setExpenses]    = useState(() => LS.getArray("ai_invoice_expenses", []));

  // ─── PDF / Invoice settings ────────────────────────────────────────────────
  const [pdfTemplate,        setPdfTemplate]        = useState(() => LS.get("ai_invoice_pdf_template", "classic"));
  const [companyLogo,        setCompanyLogo]        = useState(() => LS.get("ai_invoice_logo", null));
  const [companyLogoSize,    setCompanyLogoSize]    = useState(() => LS.get("ai_invoice_logo_size", 52));
  const [invoicePrefix,      setInvoicePrefix]      = useState(() => LS.get("ai_invoice_inv_prefix", "INV-"));
  const [quotePrefix,        setQuotePrefix]        = useState(() => LS.get("ai_invoice_quo_prefix", "QUO-"));
  const [invoiceStartNum,    setInvoiceStartNum]    = useState(() => LS.get("ai_invoice_inv_start", 1));
  const [quoteStartNum,      setQuoteStartNum]      = useState(() => LS.get("ai_invoice_quo_start", 1));
  const [defaultInvTerms,    setDefaultInvTerms]    = useState(() => LS.get("ai_invoice_inv_terms", DEFAULT_INV_TERMS));
  const [defaultQuoteTerms,  setDefaultQuoteTerms]  = useState(() => LS.get("ai_invoice_quo_terms", DEFAULT_QUOTE_TERMS));
  const [defaultPaymentTerms,setDefaultPaymentTerms]= useState(() => LS.get("ai_invoice_pay_terms", "Net 30"));
  const [footerText,         setFooterText]         = useState(() => LS.get("ai_invoice_footer", ""));
  const [invoiceTemplateConfig,setInvoiceTemplateConfig] = useState(() => LS.get("ai_invoice_template_config", null));

  // ─── UI prefs (shared via ctx) ─────────────────────────────────────────────
  const [appTheme, setAppTheme] = useState(() => LS.get("ai_invoice_theme", {
    type: "solid", color: "rgb(33, 38, 60)", color2: "#333", accent: "#E86C4A",
  }));

  // ─── Integrations ──────────────────────────────────────────────────────────
  const [supabaseUrl,        setSupabaseUrl]        = useState(() => LS.get("ai_invoice_sb_url", ""));
  const [supabaseKey,        setSupabaseKey]        = useState(() => LS.get("ai_invoice_sb_key", ""));
  const [googleDriveEnabled, setGoogleDriveEnabled] = useState(() => LS.get("ai_invoice_gdrive", false));
  const [emailEnabled,       setEmailEnabled]       = useState(() => LS.get("ai_invoice_email_en", false));
  const [emailProvider,      setEmailProvider]      = useState(() => LS.get("ai_invoice_email_prov", "SMTP"));
  const [emailFrom,          setEmailFrom]          = useState(() => LS.get("ai_invoice_email_from", ""));

  // ─── Auto-mark overdue invoices ────────────────────────────────────────────
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

  // ─── Debounced persistence to localStorage ─────────────────────────────────
  const persistTimer  = useRef(null);
  const lastSavedLogo = useRef(companyLogo);

  useEffect(() => {
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      saveAll({
        ai_invoice_user:            user,
        ai_invoice_org:             orgSettings,
        ai_invoice_customers:       customers,
        ai_invoice_items:           catalogItems,
        ai_invoice_invoices:        invoices,
        ai_invoice_quotes:          quotes,
        ai_invoice_payments:        payments,
        ai_invoice_pay_methods:     customPayMethods,
        ai_invoice_expenses:        expenses,
        ai_invoice_theme:           appTheme,
        ai_invoice_pdf_template:    pdfTemplate,
        ai_invoice_logo:            companyLogo !== lastSavedLogo.current ? companyLogo : undefined,
        ai_invoice_logo_size:       companyLogoSize,
        ai_invoice_inv_prefix:      invoicePrefix,
        ai_invoice_quo_prefix:      quotePrefix,
        ai_invoice_inv_start:       invoiceStartNum,
        ai_invoice_quo_start:       quoteStartNum,
        ai_invoice_inv_terms:       defaultInvTerms,
        ai_invoice_quo_terms:       defaultQuoteTerms,
        ai_invoice_pay_terms:       defaultPaymentTerms,
        ai_invoice_footer:          footerText,
        ai_invoice_template_config: invoiceTemplateConfig,
        ai_invoice_sb_url:          supabaseUrl,
        ai_invoice_sb_key:          supabaseKey,
        ai_invoice_gdrive:          googleDriveEnabled,
        ai_invoice_email_en:        emailEnabled,
        ai_invoice_email_prov:      emailProvider,
        ai_invoice_email_from:      emailFrom,
      });
      lastSavedLogo.current = companyLogo;
    }, 800);
    return () => clearTimeout(persistTimer.current);
  }, [
    user, orgSettings, customers, catalogItems,
    invoices, quotes, payments, customPayMethods, expenses,
    appTheme, pdfTemplate, companyLogo, companyLogoSize,
    invoicePrefix, quotePrefix, invoiceStartNum, quoteStartNum,
    defaultInvTerms, defaultQuoteTerms, defaultPaymentTerms,
    footerText, invoiceTemplateConfig,
    supabaseUrl, supabaseKey, googleDriveEnabled,
    emailEnabled, emailProvider, emailFrom,
  ]);

  // ─── Context value ─────────────────────────────────────────────────────────
  const ctx = {
    user, setUser,
    authChecked,
    orgSettings, setOrgSettings: setOrgSettingsState,
    customers,   setCustomers,
    catalogItems,setCatalogItems,
    invoices,    setInvoices,
    quotes,      setQuotes,
    payments,    setPayments,
    customPayMethods, setCustomPayMethods,
    expenses,    setExpenses,
    pdfTemplate, setPdfTemplate,
    companyLogo, setCompanyLogo,
    companyLogoSize,     setCompanyLogoSize,
    invoicePrefix,       setInvoicePrefix,
    quotePrefix,         setQuotePrefix,
    invoiceStartNum,     setInvoiceStartNum,
    quoteStartNum,       setQuoteStartNum,
    defaultInvTerms,     setDefaultInvTerms,
    defaultQuoteTerms,   setDefaultQuoteTerms,
    defaultPaymentTerms, setDefaultPaymentTerms,
    footerText,          setFooterText,
    invoiceTemplateConfig, setInvoiceTemplateConfig,
    appTheme,    setAppTheme,
    supabaseUrl, setSupabaseUrl,
    supabaseKey, setSupabaseKey,
    googleDriveEnabled, setGoogleDriveEnabled,
    emailEnabled,       setEmailEnabled,
    emailProvider,      setEmailProvider,
    emailFrom,          setEmailFrom,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <AppRouter />
    </AppCtx.Provider>
  );
}
