// =============================================================================
// Mappers: normalised row → app-format object
// =============================================================================

/** Coerce to number or null. Handles "", undefined, null, and numeric strings. */
export function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function rowToInvoice(row) {
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

export function rowToPayment(row) {
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

export function rowToExpense(row) {
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

export function rowToBill(row) {
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

export function rowToCustomer(row) {
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

export function rowToSupplier(row) {
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

export function rowToCatalogItem(row) {
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
