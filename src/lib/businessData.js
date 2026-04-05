import { supabase } from "./supabase";

export const LEGACY_BUSINESS_KEYS = [
  "ai_invoice_org",
  "ai_invoice_onboarding_done",
  "ai_invoice_customers",
  "ai_invoice_items",
  "ai_invoice_invoices",
  "ai_invoice_quotes",
  "ai_invoice_payments",
  "ai_invoice_pay_methods",
  "ai_invoice_expenses",
  "ai_invoice_pdf_template",
  "ai_invoice_logo",
  "ai_invoice_logo_size",
  "ai_invoice_inv_prefix",
  "ai_invoice_quo_prefix",
  "ai_invoice_inv_start",
  "ai_invoice_quo_start",
  "ai_invoice_inv_terms",
  "ai_invoice_quo_terms",
  "ai_invoice_pay_terms",
  "ai_invoice_footer",
  "ai_invoice_template_config",
];

const readLegacyValue = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export function readLegacyBusinessData() {
  return {
    org_settings: readLegacyValue("ai_invoice_org", null),
    onboarding_done: Boolean(readLegacyValue("ai_invoice_onboarding_done", false)),
    customers: readLegacyValue("ai_invoice_customers", []),
    catalog_items: readLegacyValue("ai_invoice_items", []),
    invoices: readLegacyValue("ai_invoice_invoices", []),
    quotes: readLegacyValue("ai_invoice_quotes", []),
    payments: readLegacyValue("ai_invoice_payments", []),
    custom_pay_methods: readLegacyValue("ai_invoice_pay_methods", []),
    expenses: readLegacyValue("ai_invoice_expenses", []),
    pdf_template: readLegacyValue("ai_invoice_pdf_template", "classic"),
    company_logo: readLegacyValue("ai_invoice_logo", null),
    company_logo_size: readLegacyValue("ai_invoice_logo_size", 52),
    invoice_prefix: readLegacyValue("ai_invoice_inv_prefix", "INV-"),
    quote_prefix: readLegacyValue("ai_invoice_quo_prefix", "QUO-"),
    invoice_start_num: readLegacyValue("ai_invoice_inv_start", 1),
    quote_start_num: readLegacyValue("ai_invoice_quo_start", 1),
    default_inv_terms: readLegacyValue("ai_invoice_inv_terms", ""),
    default_quote_terms: readLegacyValue("ai_invoice_quo_terms", ""),
    default_payment_terms: readLegacyValue("ai_invoice_pay_terms", "Net 30"),
    footer_text: readLegacyValue("ai_invoice_footer", ""),
    invoice_template_config: readLegacyValue("ai_invoice_template_config", null),
  };
}

export const hasLegacyBusinessData = () =>
  LEGACY_BUSINESS_KEYS.some((k) => localStorage.getItem(k) !== null);

const hasCoreRows = (row) =>
  // Treat an existing row with onboarding completed as authoritative —
  // prevents stale localStorage from overwriting Supabase's onboarding_done = true.
  row?.onboarding_done === true ||
  Boolean(row?.org_settings) ||
  (Array.isArray(row?.customers) && row.customers.length > 0) ||
  (Array.isArray(row?.invoices) && row.invoices.length > 0) ||
  (Array.isArray(row?.quotes) && row.quotes.length > 0) ||
  (Array.isArray(row?.payments) && row.payments.length > 0) ||
  (Array.isArray(row?.expenses) && row.expenses.length > 0);

export async function loadBusinessData(userId) {
  if (!supabase || !userId) return { data: null, error: null };
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return { data, error };
}

export async function saveBusinessData(userId, payload) {
  if (!supabase || !userId) return { error: null };
  const { error } = await supabase.from("business_profiles").upsert(
    {
      user_id: userId,
      ...payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  return { error };
}

export async function migrateLegacyBusinessDataIfNeeded(userId, existingRow) {
  if (!userId || hasCoreRows(existingRow) || !hasLegacyBusinessData()) return existingRow;
  const legacy = readLegacyBusinessData();
  const { error } = await saveBusinessData(userId, legacy);
  if (error) return existingRow;
  return { user_id: userId, ...legacy };
}

