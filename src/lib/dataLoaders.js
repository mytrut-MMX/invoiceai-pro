import { supabase } from "./supabase";
import {
  rowToInvoice,
  rowToPayment,
  rowToExpense,
  rowToBill,
  rowToCustomer,
  rowToSupplier,
  rowToCatalogItem,
} from "./dataMappers";

// =============================================================================
// JSONB column helpers (business_profiles backward-compat)
// =============================================================================

/** Fetch the JSONB column from business_profiles for a given user. */
export async function loadJsonbColumn(userId, column) {
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
export async function patchJsonbColumn(userId, column, arrayValue) {
  if (!supabase || !userId) return;
  await supabase
    .from("business_profiles")
    .update({ [column]: arrayValue, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
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
