import { supabase } from "./supabase";
import { SelfBillingError } from "./selfBilling/errors";
import { getActiveSbaForCustomer } from "./selfBilling/sbaService";
import { rowToCustomer, rowToSupplier } from "./dataMappers";
import {
  invoiceToRow,
  lineItemToRow,
  taxBreakdownToRow,
  paymentToRow,
  expenseToRow,
  billToRow,
  customerToRow,
  supplierToRow,
  catalogItemToRow,
} from "./dataRowBuilders";
import {
  patchJsonbColumn,
  loadInvoices,
  loadPayments,
  loadExpenses,
  loadBills,
  loadCustomers,
  loadCatalogItems,
} from "./dataLoaders";

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

  // Backward compat: update JSONB array in business_profiles
  const allInvoices = await loadInvoices(userId);
  await patchJsonbColumn(userId, "invoices", allInvoices);

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

  const allPayments = await loadPayments(userId);
  await patchJsonbColumn(userId, "payments", allPayments);

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

  const allExpenses = await loadExpenses(userId);
  await patchJsonbColumn(userId, "expenses", allExpenses);

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

  const allBills = await loadBills(userId);
  await patchJsonbColumn(userId, "bills", allBills);

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

  const allCustomers = await loadCustomers(userId);
  await patchJsonbColumn(userId, "customers", allCustomers);

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

  const allItems = await loadCatalogItems(userId);
  await patchJsonbColumn(userId, "catalog_items", allItems);

  return { data, error: null };
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
