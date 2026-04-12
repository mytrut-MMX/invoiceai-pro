import { useState, useEffect, useRef } from "react";
import "./responsive.css";
import { DEFAULT_INV_TERMS, DEFAULT_QUOTE_TERMS } from "./constants";
import { AppCtx } from "./context/AppContext";
import { todayStr } from "./utils/helpers";
import { saveAll } from "./utils/storage";
import { getSession, supabase } from "./lib/supabase";
import AppRouter from "./router";
import { loadBusinessData, saveBusinessData, migrateLegacyBusinessDataIfNeeded } from "./lib/businessData";
import {
  loadInvoices   as daLoadInvoices,
  loadPayments   as daLoadPayments,
  loadExpenses   as daLoadExpenses,
  loadBills      as daLoadBills,
  loadCustomers  as daLoadCustomers,
  loadSuppliers  as daLoadSuppliers,
  loadCatalogItems as daLoadCatalogItems,
  syncEntitiesToNormalised,
} from "./lib/dataAccess";

// ─── localStorage helpers ──────────────────────────────────────────────────
const LS = {
  get: (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  getArray: (key, fallback = []) => { const v = LS.get(key, fallback); return Array.isArray(v) ? v : fallback; },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
};

export default function App() {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  // Bootstrapped from Supabase session only — no localStorage init.
  const [user,             setUser]             = useState(null);
  const [authChecked,      setAuthChecked]      = useState(false);
  const [authInitializing, setAuthInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    const applySession = (session) => {
      if (!active) return;
      if (!session?.user) { setUser(null); return; }
      const u = {
        id:        session.user.id,
        name:      session.user.user_metadata?.full_name || session.user.email,
        email:     session.user.email,
        role:      "Admin",
        expiresAt: session.expires_at ? session.expires_at * 1000 : null,
        provider:  session.user.app_metadata?.provider || "email",
      };
      const prev = LS.get("ai_invoice_user", null);
      if (prev && prev.email !== u.email) LS.set("ai_invoice_onboarding_done", false);
      LS.set("ai_invoice_user", u);
      setUser(u);
      if (window.location.search || window.location.hash) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    };

    let unsubscribe = () => {};
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
          applySession(session);
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    }

    getSession()
      .then(applySession)
      .catch((err) => {
        console.warn("[Auth] Session check failed. Rendering app without Supabase session.", err);
        if (active) setUser(null);
      })
      .finally(() => {
        setAuthChecked(true);
        if (active) setAuthInitializing(false);
      });

    return () => { active = false; unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Session expiry enforcement ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.expiresAt) return;
    const check = () => {
      if (Date.now() > user.expiresAt) {
        setUser(null);
        localStorage.removeItem("ai_invoice_user");
      }
    };
    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.expiresAt]);

  // ─── Business data (hydrated from Supabase after auth resolves) ────────────
  const [orgSettings,          setOrgSettingsState]     = useState(null);
  const [onboardingDone,       setOnboardingDoneState]  = useState(false);
  const [businessDataHydrated, setBusinessDataHydrated] = useState(false);
  const [customers,            setCustomers]            = useState([]);
  const [catalogItems,         setCatalogItems]         = useState([]);
  const [invoices,             setInvoices]             = useState([]);
  const [quotes,               setQuotes]               = useState([]);
  const [payments,             setPayments]             = useState([]);
  const [customPayMethods,     setCustomPayMethods]     = useState([]);
  const [expenses,             setExpenses]             = useState([]);
  const [bills,                setBills]                = useState([]);
  const [suppliers,            setSuppliers]            = useState([]);

  // ─── PDF / Invoice settings (loaded from Supabase; defaults below) ─────────
  const [pdfTemplate,          setPdfTemplate]          = useState("classic");
  const [companyLogo,          setCompanyLogo]          = useState(null);
  const [companyLogoSize,      setCompanyLogoSize]      = useState(52);
  const [invoicePrefix,        setInvoicePrefix]        = useState("INV-");
  const [quotePrefix,          setQuotePrefix]          = useState("QUO-");
  const [invoiceStartNum,      setInvoiceStartNum]      = useState(1);
  const [quoteStartNum,        setQuoteStartNum]        = useState(1);
  const [defaultInvTerms,      setDefaultInvTerms]      = useState(DEFAULT_INV_TERMS);
  const [defaultQuoteTerms,    setDefaultQuoteTerms]    = useState(DEFAULT_QUOTE_TERMS);
  const [defaultPaymentTerms,  setDefaultPaymentTerms]  = useState("Net 30");
  const [footerText,           setFooterText]           = useState("");
  const [invoiceTemplateConfig,setInvoiceTemplateConfig]= useState(null);

  // ─── UI prefs (device-local, not user-specific) ───────────────────────────
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
          if ((inv.status === "Sent" || inv.status === "Partial") && inv.due_date && inv.due_date < today)
            return { ...inv, status: "Overdue" };
          return inv;
        });
        return updated.some((inv, i) => inv !== prev[i]) ? updated : prev;
      });
    };
    markOverdue();
    const timer = setInterval(markOverdue, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Business data hydration ───────────────────────────────────────────────
  const persistTimer  = useRef(null);
  const lastSavedLogo = useRef(companyLogo);
  const lastSaveHash  = useRef("");

  useEffect(() => {
    if (authInitializing) return;
    if (!user?.id) { setBusinessDataHydrated(true); return; }

    let cancelled = false;
    (async () => {
      setBusinessDataHydrated(false);

      // 1. Load business_profiles row for settings + legacy migration check
      const { data, error } = await loadBusinessData(user.id);
      if (error) console.warn("[Data] Failed to load business data from Supabase.", error);
      const merged = await migrateLegacyBusinessDataIfNeeded(user.id, data);
      if (cancelled) return;

      // 2. Settings (non-entity) — still read from business_profiles
      setOrgSettingsState(merged?.org_settings ?? null);
      setOnboardingDoneState(Boolean(merged?.onboarding_done) || Boolean(merged?.org_settings));
      setQuotes(Array.isArray(merged?.quotes) ? merged.quotes : []);
      setCustomPayMethods(Array.isArray(merged?.custom_pay_methods) ? merged.custom_pay_methods : []);
      setPdfTemplate(merged?.pdf_template || "classic");
      setCompanyLogo(merged?.company_logo ?? null);
      setCompanyLogoSize(Number(merged?.company_logo_size || 52));
      setInvoicePrefix(merged?.invoice_prefix || "INV-");
      setQuotePrefix(merged?.quote_prefix || "QUO-");
      setInvoiceStartNum(Number(merged?.invoice_start_num || 1));
      setQuoteStartNum(Number(merged?.quote_start_num || 1));
      setDefaultInvTerms(merged?.default_inv_terms || DEFAULT_INV_TERMS);
      setDefaultQuoteTerms(merged?.default_quote_terms || DEFAULT_QUOTE_TERMS);
      setDefaultPaymentTerms(merged?.default_payment_terms || "Net 30");
      setFooterText(merged?.footer_text || "");
      setInvoiceTemplateConfig(merged?.invoice_template_config ?? null);

      // 3. Entities — load from normalised tables (with JSONB fallback)
      const [inv, pay, exp, bil, cust, cat, sup] = await Promise.all([
        daLoadInvoices(user.id),
        daLoadPayments(user.id),
        daLoadExpenses(user.id),
        daLoadBills(user.id),
        daLoadCustomers(user.id),
        daLoadCatalogItems(user.id),
        daLoadSuppliers(user.id),
      ]);
      if (cancelled) return;
      setInvoices(inv);
      setPayments(pay);
      setExpenses(exp);
      setBills(bil);
      setCustomers(cust);
      setCatalogItems(cat);
      setSuppliers(sup);

      setBusinessDataHydrated(true);
    })();

    return () => { cancelled = true; };
  }, [authInitializing, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Debounced persistence — Supabase + localStorage fallback ─────────────
  useEffect(() => {
    if (!user?.id || !businessDataHydrated) return;
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      // Quick length check to skip no-op saves
      const currentHash = JSON.stringify({
        invoices: invoices.length,
        quotes: quotes.length,
        payments: payments.length,
        expenses: expenses.length,
        bills: (bills || []).length,
        suppliers: (suppliers || []).length,
      });
      if (currentHash === lastSaveHash.current) return;
      lastSaveHash.current = currentHash;

      // Write settings + JSONB entity arrays to business_profiles (backward compat)
      saveBusinessData(user.id, {
        org_settings:            orgSettings,
        onboarding_done:         onboardingDone,
        customers,
        catalog_items:           catalogItems,
        invoices,
        quotes,
        payments,
        custom_pay_methods:      customPayMethods,
        expenses,
        bills,
        pdf_template:            pdfTemplate,
        company_logo:            companyLogo,
        company_logo_size:       companyLogoSize,
        invoice_prefix:          invoicePrefix,
        quote_prefix:            quotePrefix,
        invoice_start_num:       invoiceStartNum,
        quote_start_num:         quoteStartNum,
        default_inv_terms:       defaultInvTerms,
        default_quote_terms:     defaultQuoteTerms,
        default_payment_terms:   defaultPaymentTerms,
        footer_text:             footerText,
        invoice_template_config: invoiceTemplateConfig,
      }).then(({ error }) => {
        if (error) console.warn("[Data] Failed to persist business data to Supabase.", error);
      });
      // Sync entity arrays to normalised tables (headers only; child rows
      // like invoice_line_items are managed by individual save* calls).
      syncEntitiesToNormalised(user.id, {
        invoices,
        payments,
        expenses,
        bills,
        customers,
        catalogItems,
        suppliers,
      }).catch((err) => {
        console.warn("[Data] Failed to sync entities to normalised tables.", err);
      });
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
        ai_invoice_bills:           bills,
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
    }, 2000);
    return () => clearTimeout(persistTimer.current);
  }, [
    user?.id, businessDataHydrated,
    orgSettings, onboardingDone, customers, catalogItems,
    invoices, quotes, payments, customPayMethods, expenses, bills, suppliers,
    pdfTemplate, companyLogo, companyLogoSize,
    invoicePrefix, quotePrefix, invoiceStartNum, quoteStartNum,
    defaultInvTerms, defaultQuoteTerms, defaultPaymentTerms,
    footerText, invoiceTemplateConfig,
    appTheme, supabaseUrl, supabaseKey, googleDriveEnabled,
    emailEnabled, emailProvider, emailFrom,
  ]);

  // ─── Context value ─────────────────────────────────────────────────────────
  const ctx = {
    user, setUser,
    authChecked,
    authInitializing,
    onboardingDone, setOnboardingDone: setOnboardingDoneState,
    businessDataHydrated,
    orgSettings, setOrgSettings: setOrgSettingsState,
    customers,   setCustomers,
    catalogItems,setCatalogItems,
    invoices,    setInvoices,
    quotes,      setQuotes,
    payments,    setPayments,
    customPayMethods, setCustomPayMethods,
    expenses,    setExpenses,
    bills,       setBills,
    suppliers,   setSuppliers,
    pdfTemplate, setPdfTemplate,
    companyLogo, setCompanyLogo,
    companyLogoSize,      setCompanyLogoSize,
    invoicePrefix,        setInvoicePrefix,
    quotePrefix,          setQuotePrefix,
    invoiceStartNum,      setInvoiceStartNum,
    quoteStartNum,        setQuoteStartNum,
    defaultInvTerms,      setDefaultInvTerms,
    defaultQuoteTerms,    setDefaultQuoteTerms,
    defaultPaymentTerms,  setDefaultPaymentTerms,
    footerText,           setFooterText,
    invoiceTemplateConfig,setInvoiceTemplateConfig,
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
