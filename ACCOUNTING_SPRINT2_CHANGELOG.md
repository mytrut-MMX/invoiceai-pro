# Sprint 2 — UK Accounting Compliance Changelog

## HMRC Invoice Fields
- [A1] Added supply_date field on invoice form
- [A2] Added auto-calculated tax_point with HMRC rules (14-day, early payment, basic)
- [A3] supply_date + tax_point displayed on A4 invoice document

## Company Registration
- [B1] CRN displayed on A4 invoice for limited companies

## VAT Schemes
- [C1] VAT Scheme selector in Settings (Standard, Cash, FRS, Annual)
- [C2] Ledger entries respect VAT scheme (deferred VAT for Cash Accounting)
- [C3] Zero-rated vs Exempt vs Outside Scope distinction in VAT rates
- [C4] VAT rate type selector on line items

## Accounting Basis
- [D1] Cash/Accrual basis selector in Settings
- [D2] Revenue recognition logic for Cash Basis (defer to payment)

## Period Filtering
- [E1] ReportsCenter uses accounting_date (tax_point > issue_date)
- [E2] HomePage KPIs use accounting_date
- [E3] Alerts: missing supply_date warning for VAT invoices

## Remaining (future sprints)
- VAT Return generator (9 boxes)
- MTD API submission
- Reverse charge for international services
- Balance sheet report
- FRS 102 revenue recognition (5-step model)
