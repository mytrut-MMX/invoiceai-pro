import { num } from "./dataMappers";

// =============================================================================
// Mappers: app-format object → normalised columns (for saves)
// =============================================================================

export function invoiceToRow(userId, inv) {
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

export function lineItemToRow(invoiceId, li) {
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

export function taxBreakdownToRow(invoiceId, tb) {
  return {
    invoice_id: invoiceId,
    rate: tb.rate ?? null,
    tax_type: tb.type || tb.tax_type || null,
    taxable_amount: tb.taxable_amount ?? null,
    tax_amount: tb.amount ?? tb.tax_amount ?? null,
  };
}

export function paymentToRow(userId, pay) {
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

export function expenseToRow(userId, exp) {
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

export function billToRow(userId, bil) {
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

export function customerToRow(userId, cust) {
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

export function supplierToRow(userId, sup) {
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

export function catalogItemToRow(userId, item) {
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
