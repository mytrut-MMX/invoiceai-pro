// Barrel re-export — all existing imports from "../lib/dataAccess" keep working.
// Only the names previously exported from this module are re-exported here.
// Internal helpers (mappers, row builders, JSONB column helpers) live in their
// respective sibling modules and are not part of the public surface.
export {
  loadInvoices,
  loadPayments,
  loadExpenses,
  loadBills,
  loadCustomers,
  loadSuppliers,
  loadCatalogItems,
  loadEmployees,
  loadPayrollRuns,
} from "./dataLoaders";

export {
  saveInvoice,
  savePayment,
  saveExpense,
  saveBill,
  saveCustomer,
  saveSupplier,
  saveCatalogItem,
  saveEmployee,
  syncEntitiesToNormalised,
} from "./dataSavers";

export {
  deleteInvoice,
  deletePayment,
  deleteExpense,
  deleteBill,
  deleteCustomer,
  deleteSupplier,
  deleteCatalogItem,
  deleteEmployee,
  deletePayrollRun,
} from "./dataDeleters";
