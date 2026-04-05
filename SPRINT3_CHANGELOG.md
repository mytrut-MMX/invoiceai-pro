# Sprint 3 — Core Missing Features Changelog

## Bills / Accounts Payable (NEW MODULE)
- [A1] Routes + constants for bills
- [A2] Bills state in AppContext + Supabase persistence
- [A3] BillFormPanel — create/edit bill form
- [A4] BillsPage — list view with stats + filters
- [A5] Router registration + sidebar navigation
- [A6] postBillEntry + postBillPaymentEntry ledger functions
- [A7] Bills overdue alerts + AP KPI on dashboard

## Late Payment Calculator (UK USP)
- [B1] calculateLatePaymentClaim utility (statutory interest + fixed compensation)
- [B2] Late payment panel on InvoiceViewPanel (auto-calculates for overdue invoices)

## Cash Flow Forecast
- [C1] projectCashFlow utility (90-day weekly projection)
- [C2] CashFlowWidget component (HTML bar chart, zero dependencies)
- [C3] Widget integrated on HomePage dashboard

## Remaining (future sprints)
- Bank feed integration (Open Banking / TrueLayer / Plaid)
- Online payment acceptance (Stripe integration)
- Reconciliation engine
- Multi-user with role-based access
- Balance sheet report
- Late payment invoice generator
