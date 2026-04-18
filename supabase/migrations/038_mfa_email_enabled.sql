-- Adds the email-OTP 2FA preference column to public.profiles, and — for
-- environments where migration 005_secure_profiles_rls.sql was never applied
-- (the live Supabase project shipped with only `public."Profiles"` and never
-- received the lowercase `public.profiles` table) — creates the table from
-- scratch with RLS so subsequent client calls actually resolve.
--
-- Idempotent end-state:
--   public.profiles: user_id (PK), email, name, mfa_email_enabled boolean
--                    + owner-scoped RLS (auth.uid() = user_id)

-- 1. Drop the empty, legacy capital-P table if it's still there. We confirmed
--    it has zero rows; Postgres treats `Profiles` and `profiles` as separate
--    identifiers because of how the original UI tooling created it.
drop table if exists public."Profiles";

-- 2. Recreate (or add to) the lowercase `profiles` table.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  mfa_email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- For environments that already had the lowercase `profiles` from migration
-- 005, just add the new column.
alter table public.profiles
  add column if not exists mfa_email_enabled boolean not null default false;

-- 3. RLS — copy of 005_secure_profiles_rls.sql (idempotent on re-run).
alter table public.profiles enable row level security;

drop policy if exists "users_own_profiles_select" on public.profiles;
create policy "users_own_profiles_select"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "users_own_profiles_insert" on public.profiles;
create policy "users_own_profiles_insert"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "users_own_profiles_update" on public.profiles;
create policy "users_own_profiles_update"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users_own_profiles_delete" on public.profiles;
create policy "users_own_profiles_delete"
  on public.profiles for delete
  using (auth.uid() = user_id);
