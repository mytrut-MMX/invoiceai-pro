create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  paddle_subscription_id text unique,
  paddle_customer_id text,
  plan_id text,
  status text, -- active, canceled, past_due, trialing
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users see own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);
