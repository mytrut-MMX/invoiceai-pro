-- Secure public.profiles for client-side usage.
-- Ensures rows are owner-scoped by auth.users.id and protected with RLS.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table existed previously without user_id, add it.
alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists name text;

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- Best-effort backfill for legacy rows keyed only by email.
update public.profiles p
set user_id = u.id
from auth.users u
where p.user_id is null
  and p.email is not null
  and lower(u.email) = lower(p.email);

-- Ensure one profile row per auth user.
create unique index if not exists profiles_user_id_unique on public.profiles(user_id);

-- Make user_id mandatory once backfill has completed.
do $$
begin
  if not exists (select 1 from public.profiles where user_id is null) then
    alter table public.profiles alter column user_id set not null;
  end if;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "users_own_profiles_select" on public.profiles;
create policy "users_own_profiles_select"
  on public.profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "users_own_profiles_insert" on public.profiles;
create policy "users_own_profiles_insert"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users_own_profiles_update" on public.profiles;
create policy "users_own_profiles_update"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users_own_profiles_delete" on public.profiles;
create policy "users_own_profiles_delete"
  on public.profiles
  for delete
  using (auth.uid() = user_id);
