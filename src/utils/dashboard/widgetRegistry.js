export const DASHBOARD_WIDGETS = [
  { id: 'cash_flow',        label: 'Cash Flow',           component: 'CashFlowWidget',    default: true,  order: 0 },
  { id: 'recent_invoices',  label: 'Recent Invoices',     component: 'RecentInvoices',    default: true,  order: 1 },
  { id: 'needs_attention',  label: 'Needs Attention',     component: 'NeedsAttention',    default: true,  order: 2 },
  { id: 'month_end',        label: 'Month-End Checklist', component: 'MonthEndChecklist', default: true,  order: 3 },
  { id: 'smart_alerts',     label: 'Smart Alerts',        component: 'SmartAlerts',       default: true,  order: 4 },
];

export function getDefaultLayout() {
  return DASHBOARD_WIDGETS
    .filter(w => w.default)
    .sort((a, b) => a.order - b.order)
    .map(w => ({ id: w.id, visible: true }));
}
