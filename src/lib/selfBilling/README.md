# `src/lib/selfBilling/`

HMRC self-billing (VAT Notice 700/62): agreements, numbering, VAT-registered-only
invoice emission, ledger posting, and renewal alerts.

## Module layout

| File | Phase | Responsibility |
|------|-------|----------------|
| `sbaService.js`              | 1.1 | SBA CRUD + lifecycle (draft → pending_countersign → active → superseded / terminated / expired) |
| `generateSbaPdf.js`          | 1.2 | Agreement PDF per HMRC VAT Notice 700/62 §8 |
| `computeSelfBilledInvoice.js`| 2.1 | Pure VAT / CIS / reverse-charge composition engine |
| `generateSelfBilledPdf.js`   | 2.2 | Invoice PDF with mandatory HMRC marker strings |
| `postSelfBilledEntry.js`     | 2.3 | Ledger posting (`journal_entries.source_type = 'self_bill'`) |
| `sbaVatVerify.js`            | 4.3 | VAT number verification with 90-day cache (`VAT_VERIFICATION_STALE_DAYS`) |
| `sbaAlerts.js`               | 4.4 | Renewal reminders at T-30 / T-14 / T-7 / T-1 (`SBA_RENEWAL_WARNING_DAYS`) |
| `errors.js`                  | 0.2 | User-facing error dictionary + `SelfBillingError` class |
| `../../constants/selfBilling.js` | 0.2 | HMRC markers, status enums, format tokens |

## Design principles

- **Pure PDF generators.** `generateSbaPdf.js` and `generateSelfBilledPdf.js` take
  plain data in and return bytes/blob out. No Supabase calls, no DOM, no `fetch`,
  no `window`. Persistence and emission logging happen in the caller.
- **`userId` is the first argument** on any service that talks to Supabase —
  never read it from a module-level session. Keeps the module testable and
  prevents cross-tenant leaks.
- **Errors are typed.** Throw `SelfBillingError(code, ctx)` with a code from
  `SB_ERRORS`. Never throw raw `Error`, never build user-visible strings from
  concatenation at the throw site — let `getSbError` interpolate.
- **No hardcoded HMRC strings.** Marker phrases, enums, format tokens, and clause
  bodies live in `src/constants/selfBilling.js`. Changing any of them is a
  regulated change: single-file edit, single review, single commit.
- **Additive schema only.** All new columns on `bills` / `customers` / `invoices`
  are nullable with sensible defaults; legacy `suppliers.self_billing_*` columns
  are backfilled, not dropped (see migration 043).

## Do NOT

- **Do not scatter HMRC marker strings** as literals in PDF generators, emails,
  or tests. Import from `src/constants/selfBilling.js`. This has been a recurring
  compliance-leak pattern elsewhere in the codebase (e.g. VAT-return wording).
- **Do not allocate self-bill numbers in JS.** Always call the
  `next_selfbill_number(user_id, supplier_id)` RPC — it holds a `FOR UPDATE`
  row lock and handles yearly reset atomically. JS-side counters will drift.
- **Do not bypass RLS** with the service-role key for user-scoped reads. Same
  rule as the rest of the app. The `SECURITY DEFINER` functions in migration
  043 already enforce `auth.uid()` checks internally.
- **Do not mutate agreements in status `active`.** The schema blocks it via RLS;
  do not reach for the service-role key to "just fix" one. Supersede instead
  (create a new row with `supersedes_id` set).
- **Do not import Supabase from `errors.js` or `constants/selfBilling.js`.**
  Both are leaf modules consumed by client + server + tests.
- **Do not add retry / fallback logic around `next_selfbill_number`.** If it
  fails it fails — surface `SEQUENCE_LOCKED` to the user. Silent retries cause
  gap-and-collision bugs.