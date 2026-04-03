-- Harden RLS for core business tables when they exist.
-- This migration is defensive/idempotent and only applies policies when
-- the target table (and required ownership columns) are available.

do $$
declare
  t text;
begin
  foreach t in array array[
    'customers',
    'invoices',
    'quotes',
    'payments',
    'expenses'
  ]
  loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);

      if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = t
          and column_name = 'user_id'
      ) then
        execute format('drop policy if exists %I on public.%I', 'users_select_own_' || t, t);
        execute format(
          'create policy %I on public.%I for select using (user_id::text = auth.uid()::text)',
          'users_select_own_' || t,
          t
        );

        execute format('drop policy if exists %I on public.%I', 'users_insert_own_' || t, t);
        execute format(
          'create policy %I on public.%I for insert with check (user_id::text = auth.uid()::text)',
          'users_insert_own_' || t,
          t
        );

        execute format('drop policy if exists %I on public.%I', 'users_update_own_' || t, t);
        execute format(
          'create policy %I on public.%I for update using (user_id::text = auth.uid()::text) with check (user_id::text = auth.uid()::text)',
          'users_update_own_' || t,
          t
        );

        execute format('drop policy if exists %I on public.%I', 'users_delete_own_' || t, t);
        execute format(
          'create policy %I on public.%I for delete using (user_id::text = auth.uid()::text)',
          'users_delete_own_' || t,
          t
        );
      end if;
    end if;
  end loop;
end $$;

-- Line-item tables usually inherit ownership through their parent document.
do $$
begin
  if to_regclass('public.invoice_line_items') is not null
     and to_regclass('public.invoices') is not null then
    alter table public.invoice_line_items enable row level security;

    drop policy if exists users_select_own_invoice_line_items on public.invoice_line_items;
    create policy users_select_own_invoice_line_items
      on public.invoice_line_items
      for select
      using (
        exists (
          select 1
          from public.invoices i
          where i.id = invoice_line_items.invoice_id
            and i.user_id::text = auth.uid()::text
        )
      );

    drop policy if exists users_insert_own_invoice_line_items on public.invoice_line_items;
    create policy users_insert_own_invoice_line_items
      on public.invoice_line_items
      for insert
      with check (
        exists (
          select 1
          from public.invoices i
          where i.id = invoice_line_items.invoice_id
            and i.user_id::text = auth.uid()::text
        )
      );

    drop policy if exists users_update_own_invoice_line_items on public.invoice_line_items;
    create policy users_update_own_invoice_line_items
      on public.invoice_line_items
      for update
      using (
        exists (
          select 1
          from public.invoices i
          where i.id = invoice_line_items.invoice_id
            and i.user_id::text = auth.uid()::text
        )
      )
      with check (
        exists (
          select 1
          from public.invoices i
          where i.id = invoice_line_items.invoice_id
            and i.user_id::text = auth.uid()::text
        )
      );

    drop policy if exists users_delete_own_invoice_line_items on public.invoice_line_items;
    create policy users_delete_own_invoice_line_items
      on public.invoice_line_items
      for delete
      using (
        exists (
          select 1
          from public.invoices i
          where i.id = invoice_line_items.invoice_id
            and i.user_id::text = auth.uid()::text
        )
      );
  end if;

  if to_regclass('public.quote_line_items') is not null
     and to_regclass('public.quotes') is not null then
    alter table public.quote_line_items enable row level security;

    drop policy if exists users_select_own_quote_line_items on public.quote_line_items;
    create policy users_select_own_quote_line_items
      on public.quote_line_items
      for select
      using (
        exists (
          select 1
          from public.quotes q
          where q.id = quote_line_items.quote_id
            and q.user_id::text = auth.uid()::text
        )
      );

    drop policy if exists users_insert_own_quote_line_items on public.quote_line_items;
    create policy users_insert_own_quote_line_items
      on public.quote_line_items
      for insert
      with check (
        exists (
          select 1
          from public.quotes q
          where q.id = quote_line_items.quote_id
            and q.user_id::text = auth.uid()::text
        )
      );

    drop policy if exists users_update_own_quote_line_items on public.quote_line_items;
    create policy users_update_own_quote_line_items
      on public.quote_line_items
      for update
      using (
        exists (
          select 1
          from public.quotes q
          where q.id = quote_line_items.quote_id
            and q.user_id::text = auth.uid()::text
        )
      )
      with check (
        exists (
          select 1
          from public.quotes q
          where q.id = quote_line_items.quote_id
            and q.user_id::text = auth.uid()::text
        )
      );

    drop policy if exists users_delete_own_quote_line_items on public.quote_line_items;
    create policy users_delete_own_quote_line_items
      on public.quote_line_items
      for delete
      using (
        exists (
          select 1
          from public.quotes q
          where q.id = quote_line_items.quote_id
            and q.user_id::text = auth.uid()::text
        )
      );
  end if;
end $$;
