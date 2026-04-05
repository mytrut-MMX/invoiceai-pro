# RLS Audit Checklist — InvoiceSaga

Last updated: 2026-04-05
Related issue: IDOR-001

## Table-level RLS status

| Table | RLS Enabled | Policy | Owner Column | Migration | Verified |
|-------|------------|--------|-------------|-----------|----------|
| profiles | YES | user_id = auth.uid() | user_id | 005 | ☐ |
| business_profiles | YES | user_id = auth.uid() | user_id | 003 | ☐ |
| accounts | YES | user_id = auth.uid()::text | user_id | 001 | ☐ |
| journal_entries | YES | user_id = auth.uid()::text | user_id | 001 | ☐ |
| journal_lines | YES | via journal_entries FK | journal_entry_id | 001 | ☐ |
| customers | YES | user_id = auth.uid()::text | user_id | 004 | ☐ |
| invoices | YES | user_id = auth.uid()::text | user_id | 004 | ☐ |
| quotes | YES | user_id = auth.uid()::text | user_id | 004 | ☐ |
| payments | YES | user_id = auth.uid()::text | user_id | 004 | ☐ |
| expenses | YES | user_id = auth.uid()::text | user_id | 004 | ☐ |
| contact_submissions | YES | false (service_role only) | N/A | 006 | ☐ |
| agent_objectives | YES | false (service_role only) | N/A | 006 | ☐ |
| agent_tasks | YES | false (service_role only) | N/A | 006 | ☐ |

## Catch-all protection

Migration 006 includes a dynamic loop that enables RLS on any public table
not listed above. If a new table is created without RLS, this migration
(when re-run or applied) will enable RLS on it — blocking all access until
a proper policy is added. This is a fail-closed default.

## How to verify

1. Go to Supabase Dashboard > Table Editor > Select table
2. Check "RLS Enabled" badge is present
3. Go to Authentication > Policies > Verify policies match the table above
4. Test with anon key (should return 0 rows, not all rows):

```bash
curl 'https://<PROJECT_REF>.supabase.co/rest/v1/profiles?select=*' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <ANON_KEY>'
```

Expected: `[]` (empty array) — not a list of all profiles.

5. Test service_role tables (should return 0 rows with anon key):

```bash
curl 'https://<PROJECT_REF>.supabase.co/rest/v1/contact_submissions?select=*' \
  -H 'apikey: <ANON_KEY>' \
  -H 'Authorization: Bearer <ANON_KEY>'
```

Expected: `[]` — the `USING (false)` policy blocks all anon/authenticated access.
The service_role key bypasses RLS, so server-side API routes still work.

## Adding new tables

When creating a new table, always:

1. Add `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;` in the migration
2. Add appropriate policies (user-owned or service-only)
3. Update this checklist
4. Migration 006's catch-all will block access to any table that is missed
