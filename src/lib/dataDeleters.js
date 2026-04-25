import { supabase } from "./supabase";
import { loadJsonbColumn, patchJsonbColumn } from "./dataLoaders";

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
