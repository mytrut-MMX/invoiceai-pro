-- Migrate existing JSONB data from business_profiles into the normalised
-- tables created in migrations 010-015.
--
-- This migration is idempotent: it uses ON CONFLICT DO NOTHING everywhere.
-- It does NOT delete the original JSONB data — both systems coexist.
-- It runs as SECURITY DEFINER to bypass RLS during the migration.

-- =============================================================================
-- Helper: safe UUID cast — returns NULL for malformed / non-UUID strings
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.safe_uuid(val text)
RETURNS uuid AS $$
BEGIN
  RETURN val::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- Main migration function
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.migrate_jsonb_to_tables()
RETURNS void AS $$
DECLARE
  profile       record;
  inv           jsonb;
  li            jsonb;
  tb            jsonb;
  pay           jsonb;
  exp           jsonb;
  bil           jsonb;
  bli           jsonb;
  cust          jsonb;
  cat           jsonb;
  v_invoice_id  uuid;
  v_bill_id     uuid;
  v_customer_id uuid;
  v_user_id     uuid;
  v_err_msg     text;
BEGIN
  FOR profile IN
    SELECT user_id,
           COALESCE(customers,    '[]'::jsonb) AS customers,
           COALESCE(invoices,     '[]'::jsonb) AS invoices,
           COALESCE(payments,     '[]'::jsonb) AS payments,
           COALESCE(expenses,     '[]'::jsonb) AS expenses,
           COALESCE(bills,        '[]'::jsonb) AS bills,
           COALESCE(catalog_items,'[]'::jsonb) AS catalog_items
    FROM public.business_profiles
  LOOP
    BEGIN  -- per-user block; errors skip the user
      v_user_id := profile.user_id;

      -- =====================================================================
      -- 1. CUSTOMERS
      -- =====================================================================
      FOR cust IN SELECT * FROM jsonb_array_elements(profile.customers)
      LOOP
        INSERT INTO public.customers (
          id, user_id, name, company, email, phone, type,
          billing_address, vat_number,
          cis_registered, cis_utr, notes, created_at
        ) VALUES (
          COALESCE(pg_temp.safe_uuid(cust->>'id'), gen_random_uuid()),
          v_user_id,
          COALESCE(cust->>'name', 'Unknown'),
          cust->>'company',
          cust->>'email',
          cust->>'phone',
          COALESCE(cust->>'type', 'Individual'),
          CASE WHEN cust->'billingAddress' IS NOT NULL
               THEN jsonb_build_object(
                 'street',  COALESCE(cust->'billingAddress'->>'street1', ''),
                 'city',    COALESCE(cust->'billingAddress'->>'city', ''),
                 'postcode',COALESCE(cust->'billingAddress'->>'zip', ''),
                 'county',  COALESCE(cust->'billingAddress'->>'state', ''),
                 'country', COALESCE(cust->'billingAddress'->>'country', '')
               )
               ELSE NULL
          END,
          NULL,  -- vat_number not stored in JSONB
          COALESCE((cust->'cis'->>'registered')::boolean, false),
          cust->'cis'->>'utr',
          cust->>'notes',
          COALESCE(
            (cust->>'created_at')::timestamptz,
            now()
          )
        )
        ON CONFLICT DO NOTHING;
      END LOOP;

      -- =====================================================================
      -- 2. INVOICES + LINE ITEMS + TAX BREAKDOWN
      -- =====================================================================
      FOR inv IN SELECT * FROM jsonb_array_elements(profile.invoices)
      LOOP
        v_invoice_id := COALESCE(pg_temp.safe_uuid(inv->>'id'), gen_random_uuid());

        -- Resolve customer_id from the embedded customer object
        v_customer_id := NULL;
        IF inv->'customer' IS NOT NULL AND inv->'customer' != 'null'::jsonb THEN
          SELECT id INTO v_customer_id
          FROM public.customers
          WHERE user_id = v_user_id
            AND name = COALESCE(inv->'customer'->>'name', '')
          LIMIT 1;

          -- If not found, upsert the inline customer
          IF v_customer_id IS NULL THEN
            v_customer_id := COALESCE(
              pg_temp.safe_uuid(inv->'customer'->>'id'),
              gen_random_uuid()
            );
            INSERT INTO public.customers (
              id, user_id, name, company, email, phone, type,
              billing_address, cis_registered, cis_utr
            ) VALUES (
              v_customer_id,
              v_user_id,
              COALESCE(inv->'customer'->>'name', 'Unknown'),
              inv->'customer'->>'company',
              inv->'customer'->>'email',
              inv->'customer'->>'phone',
              COALESCE(inv->'customer'->>'type', 'Individual'),
              CASE WHEN inv->'customer'->'billingAddress' IS NOT NULL
                   THEN jsonb_build_object(
                     'street',  COALESCE(inv->'customer'->'billingAddress'->>'street1', ''),
                     'city',    COALESCE(inv->'customer'->'billingAddress'->>'city', ''),
                     'postcode',COALESCE(inv->'customer'->'billingAddress'->>'zip', ''),
                     'county',  COALESCE(inv->'customer'->'billingAddress'->>'state', ''),
                     'country', COALESCE(inv->'customer'->'billingAddress'->>'country', '')
                   )
                   ELSE NULL
              END,
              COALESCE((inv->'customer'->'cis'->>'registered')::boolean, false),
              inv->'customer'->'cis'->>'utr'
            )
            ON CONFLICT DO NOTHING;

            -- Re-fetch in case ON CONFLICT skipped due to id collision
            IF NOT FOUND THEN
              SELECT id INTO v_customer_id
              FROM public.customers
              WHERE user_id = v_user_id
                AND name = COALESCE(inv->'customer'->>'name', '')
              LIMIT 1;
            END IF;
          END IF;
        END IF;

        INSERT INTO public.invoices (
          id, user_id, invoice_number, customer_id, status,
          issue_date, due_date, supply_date, tax_point,
          payment_terms, subtotal,
          discount_type, discount_value, discount_amount,
          shipping, total,
          notes, terms, po_number, converted_from_quote,
          cis_deduction, created_at, updated_at
        ) VALUES (
          v_invoice_id,
          v_user_id,
          COALESCE(inv->>'invoice_number', 'MIGRATED-' || v_invoice_id),
          v_customer_id,
          COALESCE(inv->>'status', 'Draft'),
          COALESCE((inv->>'issue_date')::date, CURRENT_DATE),
          (inv->>'due_date')::date,
          (inv->>'supply_date')::date,
          (inv->>'tax_point')::date,
          inv->>'payment_terms',
          (inv->>'subtotal')::decimal(15,2),
          inv->>'discount_type',
          (inv->>'discount_value')::decimal(15,2),
          (inv->>'discountAmount')::decimal(15,2),
          COALESCE((inv->>'shipping')::decimal(15,2), 0),
          (inv->>'total')::decimal(15,2),
          inv->>'notes',
          inv->>'terms',
          inv->>'po_number',
          inv->>'converted_from_quote',
          COALESCE((inv->>'cisDeduction')::decimal(15,2), 0),
          COALESCE((inv->>'created_at')::timestamptz, now()),
          now()
        )
        ON CONFLICT DO NOTHING;

        -- Line items
        IF inv->'line_items' IS NOT NULL AND jsonb_typeof(inv->'line_items') = 'array' THEN
          FOR li IN SELECT * FROM jsonb_array_elements(inv->'line_items')
          LOOP
            INSERT INTO public.invoice_line_items (
              id, invoice_id, description, quantity, rate, amount,
              tax_rate, tax_type, tax_amount, sort_order, cis_applicable
            ) VALUES (
              COALESCE(pg_temp.safe_uuid(li->>'id'), gen_random_uuid()),
              v_invoice_id,
              COALESCE(li->>'description', li->>'name', ''),
              COALESCE((li->>'quantity')::decimal(10,3), 1),
              (li->>'rate')::decimal(15,2),
              (li->>'amount')::decimal(15,2),
              COALESCE((li->>'tax_rate')::decimal(5,2), 0),
              li->>'tax_type',
              COALESCE((li->>'tax_amount')::decimal(15,2), 0),
              COALESCE((li->>'sort_order')::integer, 0),
              COALESCE((li->>'cisApplicable')::boolean, false)
            )
            ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;

        -- Tax breakdown
        IF inv->'taxBreakdown' IS NOT NULL AND jsonb_typeof(inv->'taxBreakdown') = 'array' THEN
          FOR tb IN SELECT * FROM jsonb_array_elements(inv->'taxBreakdown')
          LOOP
            INSERT INTO public.invoice_tax_breakdown (
              id, invoice_id, rate, tax_type, taxable_amount, tax_amount
            ) VALUES (
              gen_random_uuid(),
              v_invoice_id,
              (tb->>'rate')::decimal(5,2),
              tb->>'type',
              NULL,  -- taxable_amount not stored in JSONB breakdown
              (tb->>'amount')::decimal(15,2)
            )
            ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;
      END LOOP;

      -- =====================================================================
      -- 3. PAYMENTS
      -- =====================================================================
      FOR pay IN SELECT * FROM jsonb_array_elements(profile.payments)
      LOOP
        INSERT INTO public.payments (
          id, user_id, payment_number, invoice_id,
          customer_name, amount, date, method,
          reference, status, notes, created_at
        ) VALUES (
          COALESCE(pg_temp.safe_uuid(pay->>'id'), gen_random_uuid()),
          v_user_id,
          pay->>'payment_number',
          pg_temp.safe_uuid(pay->>'invoice_id'),
          pay->>'customer_name',
          COALESCE((pay->>'amount')::decimal(15,2), 0),
          COALESCE((pay->>'date')::date, CURRENT_DATE),
          pay->>'method',
          pay->>'reference',
          COALESCE(pay->>'status', 'Pending'),
          pay->>'notes',
          now()
        )
        ON CONFLICT DO NOTHING;
      END LOOP;

      -- =====================================================================
      -- 4. EXPENSES
      -- =====================================================================
      FOR exp IN SELECT * FROM jsonb_array_elements(profile.expenses)
      LOOP
        -- Resolve customer_id for billable expenses
        v_customer_id := NULL;
        IF exp->'customer' IS NOT NULL AND exp->'customer' != 'null'::jsonb THEN
          SELECT id INTO v_customer_id
          FROM public.customers
          WHERE user_id = v_user_id
            AND name = COALESCE(exp->'customer'->>'name', '')
          LIMIT 1;
        END IF;

        INSERT INTO public.expenses (
          id, user_id, expense_number, date, category,
          vendor, description, expense_type,
          amount, tax_rate, tax_amount, total,
          status, billable, customer_id,
          paid_through, receipt_url,
          is_cis_expense,
          mileage_km, mileage_rate, mileage_from, mileage_to,
          created_at
        ) VALUES (
          COALESCE(pg_temp.safe_uuid(exp->>'id'), gen_random_uuid()),
          v_user_id,
          exp->>'expense_number',
          COALESCE((exp->>'date')::date, CURRENT_DATE),
          COALESCE(exp->>'category', 'Uncategorised'),
          exp->>'vendor',
          exp->>'description',
          COALESCE(
            CASE WHEN exp->>'expense_type' = 'regular' THEN 'standard'
                 ELSE exp->>'expense_type'
            END,
            'standard'
          ),
          (exp->>'amount')::decimal(15,2),
          COALESCE((exp->>'tax_rate')::decimal(5,2), 0),
          COALESCE((exp->>'tax_amount')::decimal(15,2), 0),
          (exp->>'total')::decimal(15,2),
          COALESCE(exp->>'status', 'Draft'),
          COALESCE((exp->>'billable')::boolean, false),
          v_customer_id,
          exp->>'paid_through',
          exp->>'receipt_url',
          COALESCE((exp->>'is_cis_expense')::boolean, false),
          (exp->>'mileage_km')::decimal(10,2),
          (exp->>'mileage_rate')::decimal(5,2),
          exp->>'mileage_from',
          exp->>'mileage_to',
          COALESCE((exp->>'created_at')::timestamptz, now())
        )
        ON CONFLICT DO NOTHING;
      END LOOP;

      -- =====================================================================
      -- 5. BILLS + BILL LINE ITEMS
      -- =====================================================================
      FOR bil IN SELECT * FROM jsonb_array_elements(profile.bills)
      LOOP
        v_bill_id := COALESCE(pg_temp.safe_uuid(bil->>'id'), gen_random_uuid());

        INSERT INTO public.bills (
          id, user_id, bill_number, supplier_name,
          bill_date, due_date, category, status,
          description, reference,
          amount, tax_rate, tax_amount, total,
          created_at
        ) VALUES (
          v_bill_id,
          v_user_id,
          bil->>'bill_number',
          bil->>'supplier_name',
          COALESCE((bil->>'bill_date')::date, CURRENT_DATE),
          (bil->>'due_date')::date,
          bil->>'category',
          COALESCE(bil->>'status', 'Draft'),
          bil->>'description',
          bil->>'reference',
          (bil->>'amount')::decimal(15,2),
          COALESCE((bil->>'tax_rate')::decimal(5,2), 0),
          COALESCE((bil->>'tax_amount')::decimal(15,2), 0),
          (bil->>'total')::decimal(15,2),
          now()
        )
        ON CONFLICT DO NOTHING;

        -- Bill line items (if present)
        IF bil->'line_items' IS NOT NULL AND jsonb_typeof(bil->'line_items') = 'array' THEN
          FOR bli IN SELECT * FROM jsonb_array_elements(bil->'line_items')
          LOOP
            INSERT INTO public.bill_line_items (
              id, bill_id, description, quantity, rate, amount,
              tax_rate, tax_type, tax_amount, sort_order
            ) VALUES (
              COALESCE(pg_temp.safe_uuid(bli->>'id'), gen_random_uuid()),
              v_bill_id,
              COALESCE(bli->>'description', ''),
              COALESCE((bli->>'quantity')::decimal(10,3), 1),
              (bli->>'rate')::decimal(15,2),
              (bli->>'amount')::decimal(15,2),
              COALESCE((bli->>'tax_rate')::decimal(5,2), 0),
              bli->>'tax_type',
              COALESCE((bli->>'tax_amount')::decimal(15,2), 0),
              COALESCE((bli->>'sort_order')::integer, 0)
            )
            ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;
      END LOOP;

      -- =====================================================================
      -- 6. CATALOG ITEMS
      -- =====================================================================
      FOR cat IN SELECT * FROM jsonb_array_elements(profile.catalog_items)
      LOOP
        INSERT INTO public.catalog_items (
          id, user_id, name, description, type, rate, unit,
          tax_rate, active,
          cis_enabled, cis_labour_pct,
          account_category, photo, created_at
        ) VALUES (
          COALESCE(pg_temp.safe_uuid(cat->>'id'), gen_random_uuid()),
          v_user_id,
          COALESCE(cat->>'name', 'Unnamed Item'),
          cat->>'description',
          cat->>'type',
          (cat->>'rate')::decimal(15,2),
          cat->>'unit',
          COALESCE((cat->>'taxRate')::decimal(5,2), 0),
          COALESCE((cat->>'active')::boolean, true),
          COALESCE((cat->'cis'->>'enabled')::boolean, false),
          (cat->'cis'->>'labour')::decimal(5,2),
          cat->>'account',
          cat->>'photo',
          now()
        )
        ON CONFLICT DO NOTHING;
      END LOOP;

    EXCEPTION WHEN others THEN
      GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT;
      RAISE WARNING 'migrate_jsonb_to_tables: skipping user_id=% — %',
                    v_user_id, v_err_msg;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Execute the migration
-- =============================================================================
SELECT pg_temp.migrate_jsonb_to_tables();
