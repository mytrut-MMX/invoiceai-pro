create table public.feedback_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  email       text not null,
  category    text not null,
  subject     text,
  message     text not null,
  created_at  timestamptz default now()
);

-- RLS: only service role can read (admin panel) — public can insert via API
alter table public.feedback_submissions enable row level security;

-- No select policy for public — submissions visible only via service role key
-- (same pattern as contact_submissions table)
