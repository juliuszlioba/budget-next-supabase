-- Demo account with made-up data, used for the README screenshots.
-- Re-runnable: it deletes and recreates the demo user. Your own data is not touched.
--
--   docker exec -i supabase_db_budget-next-supabase psql -U postgres -d postgres < scripts/demo-data.sql
--
-- Log in as demo@example.com / demo-password

do $$
declare
  uid constant uuid := 'de300000-0000-4000-8000-000000000001';
  today constant date := date '2026-11-24';
  cat record;
  c jsonb := '{}';
  b jsonb := '{}';
  m int;
  mid uuid;
  card_item uuid;
  bonus boolean;
  d date;
  wk int;
  amt numeric;
  tracked numeric;
  bill record;
  purchase record;
begin
  perform setseed(0.42);
  delete from auth.users where id = uid;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'demo@example.com',
    crypt('demo-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid,
    jsonb_build_object('sub', uid, 'email', 'demo@example.com', 'email_verified', true),
    'email', now(), now(), now());

  -- Categories
  for cat in
    select * from (values
      ('Housing & utilities', 'house',         '#f2b340', true,  1),
      ('Food',                'shopping-cart', '#e8954a', false, 2),
      ('Transport',           'train-front',   '#c9a46a', false, 3),
      ('Subscriptions',       'tv',            '#b8875c', false, 4),
      ('Insurance',           'shield',        '#8e8c87', false, 5),
      ('Shopping',            'shopping-bag',  '#d97a4a', false, 6),
      ('Health & care',       'pill',          '#e0c27a', false, 7),
      ('Fun & trips',         'gamepad-2',     '#f0a35e', false, 8),
      ('Credit card',         'credit-card',   '#6e6c68', false, 9),
      ('Other',               'package',       '#a8a49c', false, 10)
    ) as t(name, icon, color, essential, ord)
  loop
    with ins as (
      insert into public.categories (user_id, name, icon, color, is_essential, sort_order)
      values (uid, cat.name, cat.icon, cat.color, cat.essential, cat.ord) returning id
    ) select c || jsonb_build_object(cat.name, id) into c from ins;
  end loop;

  -- Regular bills: name, amount, category, day of month, is card
  create temp table demo_bills (name text, amount numeric, cat text, day int, card boolean, ord int) on commit drop;
  insert into demo_bills values
    ('Credit card',      420.00, 'Credit card',         10, true,  1),
    ('Rent',             980.00, 'Housing & utilities',  1, false, 2),
    ('Electricity',       58.00, 'Housing & utilities',  5, false, 3),
    ('Internet',          34.90, 'Housing & utilities', 28, false, 4),
    ('Phone',             19.90, 'Subscriptions',       15, false, 5),
    ('Streaming',         13.99, 'Subscriptions',       12, false, 6),
    ('Gym',               34.90, 'Subscriptions',       30, false, 7),
    ('Home insurance',    27.50, 'Insurance',            3, false, 8),
    ('Transit pass',      36.50, 'Transport',            1, false, 9);

  for bill in select * from demo_bills order by ord loop
    with ins as (
      insert into public.bills (user_id, name, default_amount, category_id, is_credit_card, sort_order)
      values (uid, bill.name, bill.amount, (c->>bill.cat)::uuid, bill.card, bill.ord) returning id
    ) select b || jsonb_build_object(bill.name, id) into b from ins;
  end loop;

  -- Card purchases pool: name, category, base amount
  create temp table demo_card (name text, cat text, amount numeric) on commit drop;
  insert into demo_card values
    ('Restaurant',        'Food',          46),
    ('Takeaway',          'Food',          24),
    ('Clothing',          'Shopping',      79),
    ('Online order',      'Shopping',      38),
    ('Pharmacy',          'Health & care', 21),
    ('Cinema',            'Fun & trips',   28),
    ('Concert tickets',   'Fun & trips',   65),
    ('Train tickets',     'Transport',     49),
    ('Books',             'Shopping',      32),
    ('Hairdresser',       'Health & care', 35);

  for m in 1..11 loop
    bonus := m in (6, 11);
    insert into public.months (user_id, year, month, savings, opening_balance)
    values (uid, 2026, m, case when bonus then 2600 else 900 + 100 * floor(random() * 3) end,
            case when m = 1 then 340 end)
    returning id into mid;

    insert into public.income_entries (user_id, month_id, label, amount, is_recurring, sort_order)
    values (uid, mid, 'Salary', 3200, true, 1);
    if bonus then
      insert into public.income_entries (user_id, month_id, label, amount, is_recurring, sort_order)
      values (uid, mid, case when m = 6 then 'Holiday pay' else 'Christmas bonus' end, 2400, false, 2);
    end if;
    if random() < 0.4 then
      insert into public.income_entries (user_id, month_id, label, amount, is_recurring, sort_order)
      values (uid, mid, 'Freelance', round((150 + random() * 300)::numeric, 0), false, 3);
    end if;

    -- Regular bills
    for bill in select * from demo_bills order by ord loop
      d := make_date(2026, m, least(bill.day, extract(day from (make_date(2026, m, 1) + interval '1 month - 1 day'))::int));
      if bill.card then
        insert into public.items (user_id, month_id, name, amount, category_id, date, paid, is_estimate, bill_id)
        values (uid, mid, bill.name, 0, (c->>bill.cat)::uuid, d, d <= today, false, (b->>bill.name)::uuid)
        returning id into card_item;
        -- Last month's card purchases
        tracked := 0;
        for purchase in select * from demo_card where random() < 0.55 loop
          amt := round((purchase.amount * (0.7 + random() * 0.7))::numeric, 2);
          tracked := tracked + amt;
          insert into public.items (user_id, month_id, parent_item_id, name, amount, category_id, date, paid)
          values (uid, mid, card_item, purchase.name, amt, (c->>purchase.cat)::uuid,
                  make_date(case when m = 1 then 2025 else 2026 end, case when m = 1 then 12 else m - 1 end, 3 + floor(random() * 24)::int), true);
        end loop;
        update public.items set amount = tracked + round((40 + random() * 90)::numeric, 2) where id = card_item;
      else
        amt := case when bill.name = 'Electricity' then round((bill.amount * (0.8 + random() * 0.5))::numeric, 2) else bill.amount end;
        insert into public.items (user_id, month_id, name, amount, category_id, date, paid, bill_id)
        values (uid, mid, bill.name, amt, (c->>bill.cat)::uuid, d, d <= today, (b->>bill.name)::uuid);
      end if;
    end loop;

    -- Weekly groceries and the odd one-off, paid by debit card
    for wk in 0..3 loop
      d := make_date(2026, m, 2 + wk * 7);
      if d <= today then
        insert into public.items (user_id, month_id, name, amount, category_id, date, paid)
        values (uid, mid, 'Groceries', round((55 + random() * 45)::numeric, 2), (c->>'Food')::uuid, d, true);
      end if;
    end loop;
    if random() < 0.5 then
      insert into public.items (user_id, month_id, name, amount, category_id, date, paid)
      values (uid, mid, 'Coffee beans', 18.50, (c->>'Food')::uuid, make_date(2026, m, 20), true);
    end if;
    if m in (3, 8) then
      insert into public.items (user_id, month_id, name, amount, category_id, date, paid)
      values (uid, mid, case when m = 3 then 'Ski weekend' else 'Summer trip' end,
              case when m = 3 then 420 else 860 end, (c->>'Fun & trips')::uuid, make_date(2026, m, 14), true);
    end if;
  end loop;

  -- Save whatever is left each month, in round €50 steps, so the carried-over balance stays small.
  update public.months mo
  set savings = greatest(0, floor((inc.total - sp.total - 60 - random() * 80) / 50) * 50)
  from (select month_id, sum(amount) total from public.income_entries where user_id = uid group by month_id) inc,
       (select month_id, sum(amount) total from public.items where user_id = uid and parent_item_id is null group by month_id) sp
  where mo.user_id = uid and inc.month_id = mo.id and sp.month_id = mo.id;
end $$;
