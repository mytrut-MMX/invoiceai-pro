import { supabase } from "./supabase";
import { SelfBillingError } from "./selfBilling/errors";
import { getActiveSbaForCustomer } from "./selfBilling/sbaService";

// =============================================================================
// Helpers
// =============================================================================

/** Fetch the JSONB column from business_profiles for a given user. */
async function loadJsonbColumn(userId, column) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("business_profiles")
    .select(column)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return [];
  const arr = data[column];
  return Array.isArray(arr) ? arr : [];
}

/** Patch a single JSONB array column in business_profiles (backward compat). */
async function patchJsonbColumn(userId, column, arrayValue) {
  if (!supabase || !userId) return;
  await supabase
    .from("business_profiles")
    .update({ [column]: arrayValue, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

// =============================================================================
// Mappers: normalised row → app-format object
// =============================================================================

/** Coerce to number or null. Handles "", undefined, null, and numeric strings. */
function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rowToInvoice(row) {
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    customer: row._customer || null,
    issue_date: row.issue_date,
    due_date: row.due_date,
    supply_date: row.supply_date,
    tax_point: row.tax_point,
    payment_terms: row.payment_terms,
    payment_term_id: row.payment_term_id || null,
    payment_terms_label: row.payment_terms_label || null,
    payment_terms_days: row.payment_terms_days ?? null,
    payment_terms_type: row.payment_terms_type || null,
    status: row.status,
    line_items: (row.invoice_line_items || []).map((li) => ({
      id: li.id,
      description: li.description,
      quantity: li.quantity,
      rate: li.rate,
      amount: li.amount,
      tax_rate: li.tax_rate,
      tax_type: li.tax_type,
      tax_amount: li.tax_amount,
      sort_order: li.sort_order,
      cisApplicable: li.cis_applicable || false,
    })),
    discount_type: row.discount_type,
    discount_value: row.discount_value,
    shipping: row.shipping,
    subtotal: row.subtotal,
    discountAmount: row.discount_amount,
    taxBreakdown: (row.invoice_tax_breakdown || []).map((tb) => ({
      rate: tb.rate,
      amount: tb.tax_amount,
      type: tb.tax_type,
    })),
    cisDeduction: row.cis_deduction,
    total: row.total,
    notes: row.notes,
    terms: row.terms,
    po_number: row.po_number,
    converted_from_quote: row.converted_from_quote,
    vat_scheme: row.vat_scheme,
    accounting_basis: row.accounting_basis,
    // Received self-bill flag (migration 043 + 046).
    received_as_self_bill:    !!row.received_as_self_bill,
    received_sb_customer_ref: row.received_sb_customer_ref ?? null,
    received_sb_agreement_id: row.received_sb_agreement_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToPayment(row) {
  return {
    id: row.id,
    payment_number: row.payment_number,
    invoice_id: row.invoice_id,
    customer_name: row.customer_name,
    amount: row.amount,
    date: row.date,
    method: row.method,
    reference: row.reference,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
  };
}

function rowToExpense(row) {
  return {
    id: row.id,
    expense_number: row.expense_number,
    date: row.date,
    category: row.category,
    hmrc_sa_category: row.hmrc_sa_category,
    vendor: row.vendor,
    description: row.description,
    expense_type: row.expense_type === "standard" ? "regular" : row.expense_type,
    amount: row.amount,
    tax_rate: row.tax_rate,
    tax_amount: row.tax_amount,
    total: row.total,
    status: row.status,
    billable: row.billable,
    customer: row._customer || null,
    paid_through: row.paid_through,
    receipt_url: row.receipt_url,
    is_cis_expense: row.is_cis_expense,
    cis_rate: row.cis_rate,
    cis_deduction_amount: row.cis_deduction_amount,
    mileage_km: row.mileage_km,
    mileage_rate: row.mileage_rate,
    mileage_from: row.mileage_from,
    mileage_to: row.mileage_to,
    locked: row.locked,
    created_at: row.created_at,
  };
}

function rowToBill(row) {
  return {
    id: row.id,
    bill_number: row.bill_number,
    supplier_name: row.supplier_name,
    bill_date: row.bill_date,
    due_date: row.due_date,
    category: row.category,
    status: row.status,
    description: row.description,
    reference: row.reference,
    amount: row.amount,
    tax_rate: row.tax_rate,
    tax_amount: row.tax_amount,
    total: row.total,
    paid_date: row.paid_date,
    paid_amount: row.paid_amount,
    locked: row.locked,
    created_at: row.created_at,
    supplier_id: row.supplier_id || null,
    // CIS (migration 026)
    labour_amount: row.labour_amount ?? 0,
    materials_amount: row.materials_amount ?? 0,
    cis_deduction: row.cis_deduction ?? 0,
    cis_rate_at_posting: row.cis_rate_at_posting ?? null,
    cis_verification_at_posting: row.cis_verification_at_posting ?? null,
    // DRC (migration 026)
    reverse_charge_applied: !!row.reverse_charge_applied,
    reverse_charge_vat_amount: row.reverse_charge_vat_amount ?? 0,
    bill_type: row.bill_type || 'standard',
    // Self-billing (migration 043)
    is_self_billed:                   !!row.is_self_billed,
    self_bill_invoice_number:         row.self_bill_invoice_number ?? null,
    self_billing_agreement_id:        row.self_billing_agreement_id ?? null,
    supplier_vat_at_posting:          row.supplier_vat_at_posting ?? null,
    supplier_vat_verified_at:         row.supplier_vat_verified_at ?? null,
    supplier_vat_status_at_posting:   row.supplier_vat_status_at_posting ?? null,
  };
}

function rowToCustomer(row) {
  const addr = row.billing_address;
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    type: row.type,
    billingAddress: addr
      ? {
          street1: addr.street || "",
          street2: addr.street2 || "",
          city: addr.city || "",
          state: addr.county || "",
          zip: addr.postcode || "",
          country: addr.country || "",
        }
      : null,
    vat_number: row.vat_number,
    cis: {
      registered: row.cis_registered || false,
      utr: row.cis_utr || "",
    },
    notes: row.notes,
    self_billed_by_customer: row.self_billed_by_customer ?? false,
    self_billing_agreement_id: row.self_billing_agreement_id ?? null,
    created_at: row.created_at,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    salutation: row.salutation || "",
    website: row.website || "",
    currency: row.currency || "GBP",
    paymentTerms: row.payment_terms || "Due on Receipt",
    shippingAddress: row.shipping_address
      ? {
          street1: row.shipping_address.street || "",
          street2: row.shipping_address.street2 || "",
          city: row.shipping_address.city || "",
          state: row.shipping_address.county || "",
          zip: row.shipping_address.postcode || "",
          country: row.shipping_address.country || "",
        }
      : null,
    contactPersons: Array.isArray(row.contact_persons) ? row.contact_persons : [],
    customFields: Array.isArray(row.custom_fields) ? row.custom_fields : [],
  };
}

function rowToSupplier(row) {
  const addr = row.billing_address;
  return {
    id: row.id,
    name: row.name,
    legal_name: row.legal_name,
    trading_name: row.trading_name,
    type: row.type,
    email: row.email,
    phone: row.phone,
    website: row.website,
    billingAddress: addr
      ? {
          street1: addr.street || addr.street1 || "",
          street2: addr.street2 || "",
          city: addr.city || "",
          state: addr.county || addr.state || "",
          zip: addr.postcode || addr.zip || "",
          country: addr.country || "",
        }
      : null,
    company_number: row.company_number,
    utr: row.utr,
    vat_number: row.vat_number,
    is_vat_registered: row.is_vat_registered || false,
    // VAT verification cache (migration 047)
    vat_verified_at:         row.vat_verified_at ?? null,
    vat_verification_status: row.vat_verification_status ?? null,
    vat_verification_name:   row.vat_verification_name ?? null,
    cis: {
      is_subcontractor: row.is_cis_subcontractor || false,
      verification_number: row.cis_verification_number,
      verification_date: row.cis_verification_date,
      rate: row.cis_rate,
      trader_type: row.cis_trader_type,
      labour_only: row.cis_labour_only || false,
    },
    // Self-billing metadata now lives in the self_billing_agreements table
    // (migration 048 dropped the legacy per-supplier flag columns). Callers
    // that need "has an active SBA" use useHasAnyActiveIssuedSba / sbaGate.
    default_reverse_charge: row.default_reverse_charge || false,
    payment_terms: row.payment_terms,
    currency: row.currency,
    notes: row.notes,
    is_active: row.is_active !== false,
    total_billed: row.total_billed ?? 0,
    total_paid: row.total_paid ?? 0,
    last_contacted_at: row.last_contacted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToCatalogItem(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    rate: row.rate,
    unit: row.unit,
    taxRate: row.tax_rate,
    active: row.active,
    cis: {
      enabled: row.cis_enabled || false,
      labour: row.cis_labour_pct || 0,
    },
    account: row.account_category,
    photo: row.photo,
    created_at: row.created_at,
  };
}

// =============================================================================
// Mappers: app-format object → normalised columns (for saves)
// =============================================================================

function invoiceToRow(userId, inv) {
  return {
    id: inv.id,
    user_id: userId,
    invoice_number: inv.invoice_number,
    customer_id: inv.customer_id || inv.customer?.id || null,
    status: inv.status || "Draft",
    issue_date: inv.issue_date,
    due_date: inv.due_date || null,
    supply_date: inv.supply_date || null,
    tax_point: inv.tax_point || null,
    payment_terms: inv.payment_terms || null,
    payment_term_id: inv.payment_term_id || null,
    payment_terms_label: inv.payment_terms_label || null,
    payment_terms_days: num(inv.payment_terms_days) ?? null,
    payment_terms_type: inv.payment_terms_type || null,
    subtotal: num(inv.subtotal),
    discount_type: inv.discount_type || null,
    discount_value: num(inv.discount_value),
    discount_amount: num(inv.discountAmount ?? inv.discount_amount),
    shipping: num(inv.shipping) ?? 0,
    total: num(inv.total),
    vat_scheme: inv.vat_scheme || null,
    accounting_basis: inv.accounting_basis || null,
    notes: inv.notes || null,
    terms: inv.terms || null,
    po_number: inv.po_number || null,
    converted_from_quote: inv.converted_from_quote || null,
    cis_deduction: num(inv.cisDeduction ?? inv.cis_deduction) ?? 0,
    // Received self-bill (migration 043 + 046): customer self-bills us.
    received_as_self_bill:     inv.received_as_self_bill ?? false,
    received_sb_customer_ref:  inv.received_sb_customer_ref ?? null,
    received_sb_agreement_id:  inv.received_sb_agreement_id ?? null,
    updated_at: new Date().toISOString(),
  };
}

function lineItemToRow(invoiceId, li) {
  return {
    id: li.id,
    invoice_id: invoiceId,
    description: li.description || li.name || "",
    quantity: li.quantity ?? 1,
    rate: li.rate ?? null,
    amount: li.amount ?? null,
    tax_rate: li.tax_rate ?? 0,
    tax_type: li.tax_type || null,
    tax_amount: li.tax_amount ?? 0,
    sort_order: li.sort_order ?? 0,
    cis_applicable: li.cisApplicable || false,
    cis_rate: li.cis_rate ?? null,
  };
}

function taxBreakdownToRow(invoiceId, tb) {
  return {
    invoice_id: invoiceId,
    rate: tb.rate ?? null,
    tax_type: tb.type || tb.tax_type || null,
    taxable_amount: tb.taxable_amount ?? null,
    tax_amount: tb.amount ?? tb.tax_amount ?? null,
  };
}

function paymentToRow(userId, pay) {
  return {
    id: pay.id,
    user_id: userId,
    payment_number: pay.payment_number || null,
    invoice_id: pay.invoice_id || null,
    customer_name: pay.customer_name || null,
    amount: pay.amount,
    date: pay.date,
    method: pay.method || null,
    reference: pay.reference || null,
    status: pay.status || "Pending",
    notes: pay.notes || null,
  };
}

function expenseToRow(userId, exp) {
  return {
    id: exp.id,
    user_id: userId,
    expense_number: exp.expense_number || null,
    date: exp.date,
    category: exp.category || "Uncategorised",
    hmrc_sa_category: exp.hmrc_sa_category || null,
    vendor: exp.vendor || null,
    description: exp.description || null,
    expense_type:
      exp.expense_type === "regular" ? "standard" : (exp.expense_type || "standard"),
    amount: exp.amount ?? null,
    tax_rate: exp.tax_rate ?? 0,
    tax_amount: exp.tax_amount ?? 0,
    total: exp.total ?? null,
    status: exp.status || "Draft",
    billable: exp.billable || false,
    customer_id: exp.customer_id || exp.customer?.id || null,
    paid_through: exp.paid_through || null,
    receipt_url: exp.receipt_url || null,
    is_cis_expense: exp.is_cis_expense || false,
    cis_rate: exp.cis_rate ?? null,
    cis_deduction_amount: exp.cis_deduction_amount ?? null,
    mileage_km: exp.mileage_km ?? null,
    mileage_rate: exp.mileage_rate ?? null,
    mileage_from: exp.mileage_from || null,
    mileage_to: exp.mileage_to || null,
  };
}

function billToRow(userId, bil) {
  return {
    id: bil.id,
    user_id: userId,
    bill_number: bil.bill_number || null,
    supplier_name: bil.supplier_name || null,
    supplier_id: bil.supplier_id || null,
    bill_date: bil.bill_date,
    due_date: bil.due_date || null,
    category: bil.category || null,
    status: bil.status || "Draft",
    description: bil.description || null,
    reference: bil.reference || null,
    amount: bil.amount ?? null,
    tax_rate: bil.tax_rate ?? 0,
    tax_amount: bil.tax_amount ?? 0,
    total: bil.total ?? null,
    paid_date: bil.paid_date || null,
    paid_amount: bil.paid_amount ?? 0,
    // CIS columns (migration 026)
    labour_amount:               bil.labour_amount ?? 0,
    materials_amount:            bil.materials_amount ?? 0,
    cis_deduction:               bil.cis_deduction ?? 0,
    cis_rate_at_posting:         bil.cis_rate_at_posting ?? null,
    cis_verification_at_posting: bil.cis_verification_at_posting ?? null,
    // DRC columns (migration 026)
    reverse_charge_applied:      bil.reverse_charge_applied ?? false,
    reverse_charge_vat_amount:   bil.reverse_charge_vat_amount ?? 0,
    // Dispatch type (migration 026)
    bill_type:                   bil.bill_type || 'standard',
    // Self-billing (migration 043)
    is_self_billed:                 bil.is_self_billed ?? false,
    self_bill_invoice_number:       bil.self_bill_invoice_number ?? null,
    self_billing_agreement_id:      bil.self_billing_agreement_id ?? null,
    supplier_vat_at_posting:        bil.supplier_vat_at_posting ?? null,
    supplier_vat_verified_at:       bil.supplier_vat_verified_at ?? null,
    supplier_vat_status_at_posting: bil.supplier_vat_status_at_posting ?? null,
  };
}

function customerToRow(userId, cust) {
  const addr = cust.billingAddress;
  return {
    id: cust.id,
    user_id: userId,
    name: cust.name || "Unknown",
    company: cust.company || null,
    email: cust.email || null,
    phone: cust.phone || null,
    type: cust.type || "Individual",
    billing_address: addr
      ? {
          street: addr.street1 || addr.street || "",
          street2: addr.street2 || "",
          city: addr.city || "",
          postcode: addr.zip || addr.postcode || "",
          county: addr.state || addr.county || "",
          country: addr.country || "",
        }
      : null,
    vat_number: cust.vat_number || null,
    cis_registered: cust.cis?.registered || false,
    cis_utr: cust.cis?.utr || null,
    notes: cust.notes || null,
    self_billed_by_customer: cust.self_billed_by_customer ?? false,
    // SBA id is managed by the Phase 3 self-billing flow; never overwritten from here.
    self_billing_agreement_id: cust.self_billing_agreement_id ?? null,
    first_name: cust.firstName || null,
    last_name: cust.lastName || null,
    salutation: cust.salutation || null,
    website: cust.website || null,
    currency: cust.currency || 'GBP',
    payment_terms: cust.paymentTerms || null,
    shipping_address: cust.shippingAddress
      ? {
          street: cust.shippingAddress.street1 || cust.shippingAddress.street || "",
          street2: cust.shippingAddress.street2 || "",
          city: cust.shippingAddress.city || "",
          postcode: cust.shippingAddress.zip || cust.shippingAddress.postcode || "",
          county: cust.shippingAddress.state || cust.shippingAddress.county || "",
          country: cust.shippingAddress.country || "",
        }
      : null,
    contact_persons: Array.isArray(cust.contactPersons) && cust.contactPersons.length > 0
      ? cust.contactPersons
      : null,
    custom_fields: Array.isArray(cust.customFields) && cust.customFields.length > 0
      ? cust.customFields
      : null,
  };
}

function supplierToRow(userId, sup) {
  const addr = sup.billingAddress;
  return {
    id: sup.id,
    user_id: userId,
    name: sup.name || "Unknown",
    legal_name: sup.legal_name || null,
    trading_name: sup.trading_name || null,
    type: sup.type || "Business",
    email: sup.email || null,
    phone: sup.phone || null,
    website: sup.website || null,
    billing_address: addr
      ? {
          street: addr.street1 || addr.street || "",
          street2: addr.street2 || "",
          city: addr.city || "",
          postcode: addr.zip || addr.postcode || "",
          county: addr.state || addr.county || "",
          country: addr.country || "",
        }
      : null,
    company_number: sup.company_number || null,
    utr: sup.utr || null,
    vat_number: sup.vat_number || null,
    is_vat_registered: sup.is_vat_registered || false,
    is_cis_subcontractor: sup.cis?.is_subcontractor || false,
    cis_verification_number: sup.cis?.verification_number || null,
    cis_verification_date: sup.cis?.verification_date || null,
    cis_rate: sup.cis?.rate || null,
    cis_trader_type: sup.cis?.trader_type || null,
    cis_labour_only: sup.cis?.labour_only || false,
    // self_billing_* columns dropped in migration 048 — source of truth is
    // the self_billing_agreements table.
    default_reverse_charge: sup.default_reverse_charge || false,
    payment_terms: sup.payment_terms || null,
    currency: sup.currency || "GBP",
    notes: sup.notes || null,
    is_active: sup.is_active !== false,
  };
}

function catalogItemToRow(userId, item) {
  return {
    id: item.id,
    user_id: userId,
    name: item.name || "Unnamed Item",
    description: item.description || null,
    type: item.type || null,
    rate: item.rate ?? null,
    unit: item.unit || null,
    tax_rate: item.taxRate ?? item.tax_rate ?? 0,
    active: item.active ?? true,
    cis_enabled: item.cis?.enabled || false,
    cis_labour_pct: item.cis?.labour ?? null,
    account_category: item.account || item.account_category || null,
    photo: item.photo || null,
  };
}

// =============================================================================
// Load functions — normalised table first, JSONB fallback
// =============================================================================

export async function loadInvoices(userId) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_line_items(*), invoice_tax_breakdown(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error && data && data.length > 0) {
    // Batch-fetch customer objects for all invoices that have a customer_id
    const customerIds = [
      ...new Set(data.map((r) => r.customer_id).filter(Boolean)),
    ];
    let customerMap = {};
    if (customerIds.length > 0) {
      const { data: custs } = await supabase
        .from("customers")
        .select("*")
        .in("id", customerIds);
      if (custs) {
        customerMap = Object.fromEntries(
          custs.map((c) => [c.id, rowToCustomer(c)])
        );
      }
    }

    return data.map((row) => {
      row._customer = customerMap[row.customer_id] || null;
      return rowToInvoice(row);
    });
  }

  // Fallback: JSONB from business_profiles
  return loadJsonbColumn(userId, "invoices");
}

export async function loadPayments(userId) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error && data && data.length > 0) {
    return data.map(rowToPayment);
  }

  return loadJsonbColumn(userId, "payments");
}

export async function loadExpenses(userId) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error && data && data.length > 0) {
    // Resolve customer objects for billable expenses
    const customerIds = [
      ...new Set(data.map((r) => r.customer_id).filter(Boolean)),
    ];
    let customerMap = {};
    if (customerIds.length > 0) {
      const { data: custs } = await supabase
        .from("customers")
        .select("*")
        .in("id", customerIds);
      if (custs) {
        customerMap = Object.fromEntries(
          custs.map((c) => [c.id, { id: c.id, name: c.name }])
        );
      }
    }

    return data.map((row) => {
      row._customer = customerMap[row.customer_id] || null;
      return rowToExpense(row);
    });
  }

  return loadJsonbColumn(userId, "expenses");
}

export async function loadBills(userId) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error && data && data.length > 0) {
    return data.map(rowToBill);
  }

  return loadJsonbColumn(userId, "bills");
}

export async function loadCustomers(userId) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error && data && data.length > 0) {
    return data.map(rowToCustomer);
  }

  return loadJsonbColumn(userId, "customers");
}

export async function loadSuppliers(userId) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    console.warn("[dataAccess] loadSuppliers failed:", error.message);
    return [];
  }
  return (data || []).map(rowToSupplier);
}

export async function loadCatalogItems(userId) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error && data && data.length > 0) {
    return data.map(rowToCatalogItem);
  }

  return loadJsonbColumn(userId, "catalog_items");
}

// =============================================================================
// Save functions — always write to normalised tables + JSONB backward compat
// =============================================================================

export async function saveInvoice(userId, invoice) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const row = invoiceToRow(userId, invoice);

  // Double-invoicing guard (defence-in-depth; UI enforces first). For a NEW
  // direct invoice to a customer with an active received-direction SBA,
  // return { error: SelfBillingError } so callers observe it uniformly via
  // the existing { data, error } contract — earlier revision threw, but
  // call sites use .then(({ error }) => ...) without .catch() and the throw
  // became an unhandled rejection + UI state drift after an optimistic add.
  // Bypasses: (a) invoices flagged received_as_self_bill (imported), and
  // (b) edits of existing rows (check via pre-existence of the id).
  if (!invoice.received_as_self_bill && row.customer_id) {
    const { data: existingRow } = await supabase
      .from("invoices").select("id").eq("id", row.id).maybeSingle();
    if (!existingRow) {
      // getActiveSbaForCustomer throws on Supabase errors; rethrow would surface
      // as an unhandled rejection since callers only inspect { data, error }.
      // Translate into the same shape as the guard result (SBA_NOT_ACTIVE
      // indicates the lookup itself could not confirm an active agreement).
      let activeSba;
      try {
        activeSba = await getActiveSbaForCustomer({ userId, customerId: row.customer_id });
      } catch (err) {
        return { error: new SelfBillingError("SBA_NOT_ACTIVE", { reason: err?.message || String(err) }) };
      }
      if (activeSba) {
        return {
          error: new SelfBillingError("DUPLICATE_WITH_SBA", {
            customerName: activeSba.customer?.name || invoice.customer?.name || "this customer",
            sbaId: String(activeSba.id).slice(0, 8),
          }),
        };
      }
    }
  }

  // Upsert the invoice header
  const { data: saved, error } = await supabase
    .from("invoices")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) return { error };

  const invoiceId = saved.id;

  // Replace line items: delete existing, then insert fresh
  await supabase
    .from("invoice_line_items")
    .delete()
    .eq("invoice_id", invoiceId);

  const lineItems = (invoice.line_items || []).map((li) =>
    lineItemToRow(invoiceId, li)
  );
  if (lineItems.length > 0) {
    const { error: liError } = await supabase
      .from("invoice_line_items")
      .insert(lineItems);
    if (liError) return { error: liError };
  }

  // Replace tax breakdown
  await supabase
    .from("invoice_tax_breakdown")
    .delete()
    .eq("invoice_id", invoiceId);

  const breakdown = (invoice.taxBreakdown || invoice.tax_breakdown || []).map(
    (tb) => taxBreakdownToRow(invoiceId, tb)
  );
  if (breakdown.length > 0) {
    await supabase.from("invoice_tax_breakdown").insert(breakdown);
  }

  return { data: saved, error: null };
}

export async function savePayment(userId, payment) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const row = paymentToRow(userId, payment);
  const { data, error } = await supabase
    .from("payments")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) return { error };

  return { data, error: null };
}

export async function saveExpense(userId, expense) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const row = expenseToRow(userId, expense);
  const { data, error } = await supabase
    .from("expenses")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) return { error };

  return { data, error: null };
}

export async function saveBill(userId, bill) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const row = billToRow(userId, bill);
  const { data: saved, error } = await supabase
    .from("bills")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) return { error };

  // Replace bill line items if present
  const billId = saved.id;
  if (bill.line_items && bill.line_items.length > 0) {
    await supabase.from("bill_line_items").delete().eq("bill_id", billId);

    const items = bill.line_items.map((li) => ({
      id: li.id,
      bill_id: billId,
      description: li.description || "",
      quantity: li.quantity ?? 1,
      rate: li.rate ?? null,
      amount: li.amount ?? null,
      tax_rate: li.tax_rate ?? 0,
      tax_type: li.tax_type || null,
      tax_amount: li.tax_amount ?? 0,
      sort_order: li.sort_order ?? 0,
    }));
    await supabase.from("bill_line_items").insert(items);
  }

  return { data: saved, error: null };
}

export async function saveCustomer(userId, customer) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const row = customerToRow(userId, customer);
  const { data, error } = await supabase
    .from("customers")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) return { error };

  return { data: rowToCustomer(data), error: null };
}

export async function saveSupplier(userId, supplier) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const row = supplierToRow(userId, supplier);
  const { data, error } = await supabase
    .from("suppliers")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) return { error };
  return { data: rowToSupplier(data), error: null };
}

export async function saveCatalogItem(userId, item) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const row = catalogItemToRow(userId, item);
  const { data, error } = await supabase
    .from("catalog_items")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) return { error };

  return { data, error: null };
}

// =============================================================================
// Delete functions — remove from normalised table + update JSONB
// =============================================================================

// =============================================================================
// Bulk sync — used by the debounced persistence in App.jsx to push full
// entity arrays into normalised tables.  Each call upserts headers only
// (child tables like invoice_line_items are managed by individual save*
// functions at the page level).  Fires concurrently and never throws —
// errors are logged so they don't break the debounced save cycle.
// =============================================================================

export async function syncEntitiesToNormalised(userId, {
  invoices: invArr,
  payments: payArr,
  expenses: expArr,
  bills: bilArr,
  customers: custArr,
  catalogItems: catArr,
  suppliers: supArr,
} = {}) {
  if (!supabase || !userId) return;

  const jobs = [];

  if (invArr && invArr.length > 0) {
    jobs.push(
      supabase
        .from("invoices")
        .upsert(invArr.map((i) => invoiceToRow(userId, i)), { onConflict: "id", ignoreDuplicates: false })
        .then(({ error }) => { if (error) console.warn("[sync] invoices:", error.message); })
    );
  }
  if (payArr && payArr.length > 0) {
    jobs.push(
      supabase
        .from("payments")
        .upsert(payArr.map((p) => paymentToRow(userId, p)), { onConflict: "id", ignoreDuplicates: false })
        .then(({ error }) => { if (error) console.warn("[sync] payments:", error.message); })
    );
  }
  if (expArr && expArr.length > 0) {
    jobs.push(
      supabase
        .from("expenses")
        .upsert(expArr.map((e) => expenseToRow(userId, e)), { onConflict: "id", ignoreDuplicates: false })
        .then(({ error }) => { if (error) console.warn("[sync] expenses:", error.message); })
    );
  }
  if (bilArr && bilArr.length > 0) {
    jobs.push(
      supabase
        .from("bills")
        .upsert(bilArr.map((b) => billToRow(userId, b)), { onConflict: "id", ignoreDuplicates: false })
        .then(({ error }) => { if (error) console.warn("[sync] bills:", error.message); })
    );
  }
  if (custArr && custArr.length > 0) {
    jobs.push(
      supabase
        .from("customers")
        .upsert(custArr.map((c) => customerToRow(userId, c)), { onConflict: "id", ignoreDuplicates: false })
        .then(({ error }) => { if (error) console.warn("[sync] customers:", error.message); })
    );
  }
  if (catArr && catArr.length > 0) {
    jobs.push(
      supabase
        .from("catalog_items")
        .upsert(catArr.map((i) => catalogItemToRow(userId, i)), { onConflict: "id", ignoreDuplicates: false })
        .then(({ error }) => { if (error) console.warn("[sync] catalog_items:", error.message); })
    );
  }
  if (supArr && supArr.length > 0) {
    jobs.push(
      supabase
        .from("suppliers")
        .upsert(supArr.map((s) => supplierToRow(userId, s)), { onConflict: "id", ignoreDuplicates: false })
        .then(({ error }) => { if (error) console.warn("[sync] suppliers:", error.message); })
    );
  }

  await Promise.all(jobs);
}

// =============================================================================
// Delete functions — remove from normalised table + update JSONB
// =============================================================================

export async function deleteInvoice(userId, invoiceId) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .select("id");

  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: { message: "Invoice not found or already deleted" } };
  }

  const jsonb = await loadJsonbColumn(userId, "invoices");
  await patchJsonbColumn(userId, "invoices", jsonb.filter(x => x.id !== invoiceId));

  return { error: null };
}

export async function deletePayment(userId, paymentId) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", userId)
    .select("id");

  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: { message: "Payment not found or already deleted" } };
  }

  const jsonb = await loadJsonbColumn(userId, "payments");
  await patchJsonbColumn(userId, "payments", jsonb.filter(x => x.id !== paymentId));

  return { error: null };
}

export async function deleteExpense(userId, expenseId) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("user_id", userId)
    .select("id");

  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: { message: "Expense not found or already deleted" } };
  }

  const jsonb = await loadJsonbColumn(userId, "expenses");
  await patchJsonbColumn(userId, "expenses", jsonb.filter(x => x.id !== expenseId));

  return { error: null };
}

export async function deleteBill(userId, billId) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("bills")
    .delete()
    .eq("id", billId)
    .eq("user_id", userId)
    .select("id");

  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: { message: "Bill not found or already deleted" } };
  }

  const jsonb = await loadJsonbColumn(userId, "bills");
  await patchJsonbColumn(userId, "bills", jsonb.filter(x => x.id !== billId));

  return { error: null };
}

export async function deleteCustomer(userId, customerId) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("user_id", userId)
    .select("id");

  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: { message: "Customer not found or already deleted" } };
  }

  const jsonb = await loadJsonbColumn(userId, "customers");
  await patchJsonbColumn(userId, "customers", jsonb.filter(x => x.id !== customerId));

  return { error: null };
}

export async function deleteSupplier(userId, supplierId) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", supplierId)
    .eq("user_id", userId)
    .select("id");

  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: { message: "Supplier not found or already deleted" } };
  }

  return { error: null };
}

export async function deleteCatalogItem(userId, itemId) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("catalog_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId)
    .select("id");

  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: { message: "Catalog item not found or already deleted" } };
  }

  const jsonb = await loadJsonbColumn(userId, "catalog_items");
  await patchJsonbColumn(userId, "catalog_items", jsonb.filter(x => x.id !== itemId));

  return { error: null };
}

// =============================================================================
// Employees
// =============================================================================

export async function loadEmployees(userId) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error && data) return data;
  return [];
}

export async function saveEmployee(userId, employee) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const row = { ...employee, user_id: userId };
  delete row.bank_details; // encrypted at app layer — stored separately if needed

  const { data, error } = await supabase
    .from("employees")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) return { error };
  return { data, error: null };
}

export async function deleteEmployee(userId, employeeId) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("employees")
    .delete()
    .eq("id", employeeId)
    .eq("user_id", userId)
    .select("id");

  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: { message: "Employee not found or already deleted" } };
  }

  return { error: null };
}

// =============================================================================
// Payroll Runs
// =============================================================================

export async function loadPayrollRuns(userId) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*, payslips(count)")
    .eq("user_id", userId)
    .order("pay_date", { ascending: false });

  if (!error && data) {
    return data.map(r => ({
      ...r,
      payslip_count: r.payslips?.[0]?.count ?? 0,
    }));
  }
  return [];
}

export async function deletePayrollRun(userId, runId) {
  if (!supabase || !userId) return { error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("payroll_runs")
    .delete()
    .eq("id", runId)
    .eq("user_id", userId)
    .eq("status", "draft")
    .select("id");

  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: { message: "Payroll run not found or already deleted" } };
  }

  return { error: null };
}
