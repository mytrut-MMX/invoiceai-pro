export const DASHBOARD_WIDGETS = [
  { id: 'cash_flow',        label: 'Cash Flow',           component: 'CashFlowWidget',    default: true,  order: 0 },
  { id: 'recent_invoices',  label: 'Recent Invoices',     component: 'RecentInvoices',    default: true,  order: 1 },
  { id: 'needs_attention',  label: 'Needs Attention',     component: 'NeedsAttention',    default: true,  order: 2 },
  { id: 'month_end',        label: 'Month-End Checklist', component: 'MonthEndChecklist', default: true,  order: 3 },
  { id: 'smart_alerts',     label: 'Smart Alerts',        component: 'SmartAlerts',       default: true,  order: 4 },
  // On by default for all users; SbaRenewalsWidget itself returns null when
  // the user has no self-billing activity, so it's invisible to non-users.
  // `visible(ctx)` is declarative metadata for DashboardCustomizer to use in
  // a follow-up — HomePage currently renders based on user layout state only.
  // Now reads the AppContext boolean populated by useHasAnyActiveIssuedSba
  // (migration 048 dropped the suppliers[*].self_billing.enabled fallback).
  {
    id: 'sba_renewals',     label: 'Self-Billing Renewals', component: 'SbaRenewalsWidget', default: true,  order: 5,
    visible: (ctx) => !!ctx?.hasAnyActiveIssuedSba
                   || (ctx?.customers || []).some((c) => c?.self_billed_by_customer),
  },
  { id: 'secretary',        label: 'Company Secretary',     component: 'SecretaryWidget',   default: true,  order: 6 },
];

export function getDefaultLayout() {
  return DASHBOARD_WIDGETS
    .filter(w => w.default)
    .sort((a, b) => a.order - b.order)
    .map(w => ({ id: w.id, visible: true }));
}
