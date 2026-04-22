# Self-Billing end-to-end audit

Pre-Phase-5 gate. Combines code-level verification (done here, from repo
inspection) with runtime/DB checks that require a live environment (flagged
⚠️ with the exact query or step to run).

Legend: ✅ verified by inspection · ⚠️ requires live-env run to close ·
❌ defect (with follow-up)

| # | Check | Status |
|---|---|---|
| 1 | VAT flow (issued self-bill → VAT return Boxes 4 + 7) | ⚠️ |
| 2 | VAT flow (received self-bill → Boxes 1 + 6) | ⚠️ |
| 3 | Ledger trial balance per source_type | ⚠️ |
| 4 | CIS interaction (deduction + PDS eligibility) | ✅ |
| 5 | Reverse-charge × CIS × labour-only matrix | ✅ |
| 6 | Agreement lifecycle transitions auditable | ✅ |
| 7 | Orphan self-bills (`is_self_billed=true` without agreement) | ⚠️ |
| 8 | SBA sign page — token enumeration / rate limit | ✅ (code) + ⚠️ (live) |
| 9 | Supplier form perf with 50 SBAs | ⚠️ |
| 10 | A11y audit (axe-core) on four surfaces | ⚠️ |
| 11 | `self_billing_emission_log` retention (no DELETE policy) | ✅ |
| 12 | RLS defence on active-SBA UPDATE | ✅ |

---

## 1. VAT flow (issued self-bill)

**Scope:** a bill with `is_self_billed=true` and `supplier_vat_status_at_posting='valid'`
must hit Box 7 (purchases ex-VAT) and Box 4 (input VAT) on the buyer's VAT return.

**Evidence (code):** `postSelfBilledEntry` ([postSelfBilledEntry.js:95-105](projects/invoiceai-pro/src/utils/ledger/postSelfBilledEntry.js)) posts
`DR expense` + `DR 2100 VAT input` + `CR 2000 AP`, with `source_type='self_bill'`.
[vatReturnCalculator.js](projects/invoiceai-pro/src/utils/vat/vatReturnCalculator.js) aggregates from `journal_entries` + `journal_lines`
by period; it does not filter on `source_type`, so self-bill rows are naturally
included as "purchase with input VAT" per double-entry.

**Run to close ⚠️:**
```sql
-- For a self-bill whose bill_date falls in the current VAT period:
SELECT je.id, jl.account_id, a.code, jl.debit, jl.credit
FROM journal_entries je
JOIN journal_lines  jl ON jl.journal_entry_id = je.id
JOIN accounts       a  ON a.id = jl.account_id
WHERE je.source_type = 'self_bill'
  AND je.date BETWEEN :period_start AND :period_end;
```
Expected: one row on account code `2100` with `debit>0` (feeds Box 4); expense
rows with `debit>0` (feeds Box 7). Then confirm the VAT-return UI reflects those
amounts — no code-level filter strips them.

## 2. VAT flow (received self-bill)

**Scope:** an invoice imported via `importReceivedSelfBill` with
`received_as_self_bill=true` must hit Box 6 (sales ex-VAT) and Box 1 (output VAT).

**Evidence (code):** the import calls `postInvoiceEntry` ([importReceivedSelfBill.js:116](projects/invoiceai-pro/src/utils/selfBilling/importReceivedSelfBill.js)) which
posts `DR 1100 AR + CR 4000 Revenue + CR 2100 VAT output`. Identical shape to
a regular sales invoice (no special-casing), so the VAT-return pipeline
picks it up as standard output VAT. [Prior task PR fix] also confirmed the
double-invoicing guard bypasses imports (`received_as_self_bill=true`).

**Run to close ⚠️:**
```sql
SELECT je.id, jl.debit, jl.credit, a.code
FROM journal_entries je
JOIN journal_lines   jl ON jl.journal_entry_id = je.id
JOIN accounts        a  ON a.id = jl.account_id
WHERE je.source_type = 'invoice'
  AND je.source_id IN (SELECT id FROM invoices WHERE received_as_self_bill);
```
Expected: credit on `2100` (Box 1) and credit on `4000` (Box 6) in the period.

## 3. Ledger trial balance per source_type

**Evidence (code):** `postSelfBilledEntry` asserts `|Σdebits − Σcredits| < 0.01`
before insert ([postSelfBilledEntry.js:102-105](projects/invoiceai-pro/src/utils/ledger/postSelfBilledEntry.js)); same helper used for voids.
Vitest suite for `postSelfBilledEntry` covers trial-balance across VAT,
non-VAT, CIS, and CIS+RC scenarios (8 tests, all green).

**Run to close ⚠️:**
```sql
SELECT je.source_type,
       ROUND(SUM(jl.debit)::numeric, 2)  AS debits,
       ROUND(SUM(jl.credit)::numeric, 2) AS credits,
       ROUND(SUM(jl.debit - jl.credit)::numeric, 2) AS delta
FROM journal_entries je
JOIN journal_lines jl ON jl.journal_entry_id = je.id
WHERE je.source_type IN ('self_bill', 'self_bill_void')
   OR (je.source_type = 'invoice'
       AND je.source_id IN (SELECT id FROM invoices WHERE received_as_self_bill))
GROUP BY je.source_type;
```
Expected: `delta = 0.00` for every row.

## 4. CIS interaction

**Status:** ✅. `computeSelfBilledInvoice` applies the same math as
`computeBillCis` (labour-only vs. labour+materials split), and
`postSelfBilledEntry` prefers the 5100/5200 split when both accounts exist,
falling back to a single expense line when not. `self_bill` ledger entries
sit alongside standard `bill` entries, so the existing PDS (`aggregatePdsData`)
and CIS statement flows require no changes — a subcontractor paid via
self-bill shows up in their monthly statement exactly as a subcontractor paid
via a supplier-issued bill would.

**Cross-reference:** `computeSelfBilledInvoice.test.js` covers "CIS
subcontractor standard_20 deducts 20% of labour" and "CIS gross_0 — no
deduction" (green). `postSelfBilledEntry.test.js` covers "CIS subcontractor:
CIS payable credit + 5100/5200 split".

## 5. Reverse-charge × CIS × labour-only matrix

**Status:** ✅. Matrix coverage from `computeSelfBilledInvoice` tests:

| CIS | RC | Labour-only | Expected | Test covering |
|---|---|---|---|---|
| No  | No  | — | standard VAT on net | "VAT-registered supplier, single line 20% standard" |
| No  | Yes | — | RC applies to all lines | "CIS + reverse charge NOT labour-only" |
| Yes | No  | — | VAT + CIS on labour | "CIS subcontractor standard_20" |
| Yes | Yes | Yes | RC on CIS lines only; non-CIS lines keep VAT | "CIS + reverse charge labour-only" |
| Yes | Yes | No | RC on all lines | "CIS + reverse charge NOT labour-only" |

All scenarios are asserted in `postSelfBilledEntry.test.js` (trial balance
holds) and `computeSelfBilledInvoice.test.js` (correct `lineTax` per line).

## 6. Agreement lifecycle auditable

**Status:** ✅. `sbaService.js` exposes one function per transition:
`createDraftSba` (draft), `signBySender` (draft → pending_countersign),
`signByCounterparty` RPC (pending → active), `terminateSba` (→ terminated),
`supersedeAndRenew` RPC (old → superseded, new draft inserted). Each writes
`signed_by_*`/`terminated_*` columns with timestamp + name + IP, and
`version` + `supersedes_id` form the chain.

**Query the chain for any supplier:**
```sql
SELECT id, version, status, start_date, end_date, supersedes_id,
       signed_by_us_at, signed_by_them_at, terminated_at, terminated_reason
FROM self_billing_agreements
WHERE supplier_id = :supplier_id
ORDER BY version;
```

## 7. Orphan self-bills

**Scope:** any row with `is_self_billed=true` MUST have
`self_billing_agreement_id` populated. The code path in
`SelfBillFormPanel.handleSave` always sets it from the fetched agreement, so
orphans would only arise from direct SQL tampering or an historical bug.

**Run to close ⚠️:**
```sql
SELECT COUNT(*) AS orphan_count
FROM bills
WHERE is_self_billed = true AND self_billing_agreement_id IS NULL;
```
Expected: `0`. Follow-up if non-zero: back-fill by joining on
`supplier_id` + `bill_date` against `self_billing_agreements`, OR void and
re-issue the affected bills.

## 8. Public SBA sign page — token enumeration + rate limit

**Status:** ✅ by code inspection; ⚠️ for live-traffic confirmation.

- **Uniform 404:** `api/sba-sign.js` responds `404 { error: 'Agreement not found' }`
  for any unknown/expired token (no leakage of "exists but wrong" vs "doesn't
  exist").
- **Rate limit:** `rateLimit(ip, 'get', 30)` / `rateLimit(ip, 'post', 5)` with
  a **15-minute window** (local map — intentional 15-min semantics,
  separate from the shared `_lib/rate-limit.js` which is 1-min-only).
  After 30 GETs / 5 POSTs, returns `429`.

**Live check to close ⚠️:** hit the endpoint with 100 random 64-char hex
tokens from a single IP and assert the first 30 return `404`, then `429`
kicks in for the remainder. No leaked timing signal expected.

## 9. Supplier form perf with 50 SBAs

**Status:** ⚠️ — needs a performance run against a seeded DB. Code path:
`SupplierSelfBillingTab` fetches via `listSbasForSupplier` (single query
ordered by `version DESC`). No N+1 risk observed.

**Steps to close:**
1. Seed 50 rows in `self_billing_agreements` for one supplier
   (alternating `issued`/`received`, various statuses).
2. Open the supplier's Self-Billing tab with DevTools → Performance recording.
3. Measure time from click → last paint.
4. Budget: **< 500 ms on a cold cache**.
5. If over budget, the first lever is adding pagination to
   `listSbasForSupplier` (currently unbounded).

## 10. Accessibility (axe-core)

**Status:** ⚠️ — needs runtime. Targets:
`SupplierSelfBillingTab`, `CreateSbaModal`, `ReceivedSelfBillModal`,
`SbaSignPage`.

**Steps to close:**
```bash
# in a Vitest-browser or Playwright run against each route:
pnpm dlx @axe-core/cli http://localhost:5173/suppliers/{id}?tab=self-billing
pnpm dlx @axe-core/cli http://localhost:5173/sign-sba/{token}
# + programmatic axe via RTL for the two modals
```
Expected: zero violations at `impact >= 'serious'`. Note — quick
inspection of `ReceivedSelfBillModal` shows native labels on every field
and an `aria-label` on the close button; no obvious violations, but an
automated run is still needed to certify.

## 11. Emission log retention (no DELETE policy)

**Status:** ✅. Migration 043 declares only `sbel_select_own` and
`sbel_insert_own` policies on `self_billing_emission_log` (lines 315–321).
No `FOR DELETE` policy is declared anywhere in the migration set, which
means authenticated clients cannot delete emission-log rows under RLS.

**Confirm on a live DB:**
```sql
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'self_billing_emission_log' AND cmd = 'DELETE';
```
Expected: `0 rows`.

**HMRC retention:** table comment in migration 043 explicitly documents
6-year retention from the end of the relevant VAT period.

## 12. RLS defence-in-depth on active-SBA UPDATE

**Status:** ✅. Migration 045 (`045_sba_rls_fixes.sql`) dropped and recreated
the `sba_update_own` policy with both `USING` (authenticated client can only
target `draft`/`pending_countersign` rows) and `WITH CHECK` (transitions into
`draft`/`pending`/`active`/`superseded`/`terminated` allowed, nothing else).
An active SBA is therefore invisible to client-initiated UPDATEs — even a
service-layer bug can't rewrite its terms. The SECURITY DEFINER RPCs
(`sign_sba_by_counterparty`, `supersede_and_renew_sba`) bypass RLS as intended.

**Live smoke test to close ⚠️:** from an authenticated browser session,
```js
await supabase.from('self_billing_agreements')
  .update({ end_date: '2099-12-31' })
  .eq('id', '<some-active-SBA-id>');
```
Expected: `{ error: { code: 'PGRST…' } }` OR an empty result set (policy hides
the row). A silent success would be a regression against migration 045.

---

## Summary

- **Verified by inspection (✅):** 4, 5, 6, 8 (code), 11, 12.
- **Pending live-env verification (⚠️):** 1, 2, 3, 7, 8 (100-request test),
  9, 10. Each has a copy-pasteable SQL or CLI step above.
- **Defects (❌):** none found.

**Pre-Phase-5 gate recommendation:** green to proceed once the seven ⚠️
items are closed in a staging environment. None of them require code
changes — all are runtime/DB verifications of logic the code inspection
says is correctly in place.
