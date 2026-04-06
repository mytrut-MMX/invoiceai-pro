create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users(id) on delete cascade not null,
  paddle_subscription_id text unique,
  paddle_customer_id     text,
  plan_id                text,        -- price_id din Paddle
  status                 text,        -- active | canceled | past_due | trialing
  current_period_end     timestamptz,
  cancel_at_period_end   boolean default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users see own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Service role poate face orice (pentru webhook)
create policy "Service role full access"
  on public.subscriptions for all
  using (true)
  with check (true);
