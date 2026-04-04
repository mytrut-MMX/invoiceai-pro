create table if not exists public.business_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_settings jsonb,
  onboarding_done boolean not null default false,
  customers jsonb not null default '[]'::jsonb,
  catalog_items jsonb not null default '[]'::jsonb,
  invoices jsonb not null default '[]'::jsonb,
  quotes jsonb not null default '[]'::jsonb,
  payments jsonb not null default '[]'::jsonb,
  custom_pay_methods jsonb not null default '[]'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  pdf_template text not null default 'classic',
  company_logo text,
  company_logo_size integer not null default 52,
  invoice_prefix text not null default 'INV-',
  quote_prefix text not null default 'QUO-',
  invoice_start_num integer not null default 1,
  quote_start_num integer not null default 1,
  default_inv_terms text not null default '',
  default_quote_terms text not null default '',
  default_payment_terms text not null default 'Net 30',
  footer_text text not null default '',
  invoice_template_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;

drop policy if exists "users_own_business_profiles_select" on public.business_profiles;
create policy "users_own_business_profiles_select"
  on public.business_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "users_own_business_profiles_insert" on public.business_profiles;
create policy "users_own_business_profiles_insert"
  on public.business_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users_own_business_profiles_update" on public.business_profiles;
create policy "users_own_business_profiles_update"
  on public.business_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users_own_business_profiles_delete" on public.business_profiles;
create policy "users_own_business_profiles_delete"
  on public.business_profiles
  for delete
  using (auth.uid() = user_id);
