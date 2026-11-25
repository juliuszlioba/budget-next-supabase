-- Demo account: a user marked with app_metadata.demo = true sees made-up data and can't change it.
--
-- seed_demo_data(uid) replaces everything the user owns with about two years of made-up data, dated
-- relative to today (January of last year up to this month). Only the database owner can run it
-- (supabase/demo.sql does); it isn't callable through the API.

create or replace function public.seed_demo_data(uid uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  today constant date := current_date;
  first_month constant date := make_date(extract(year from current_date)::int - 1, 1, 1);
  this_month constant date := date_trunc('month', current_date)::date;
  bill_days constant jsonb := '{"Credit card":10,"Rent":1,"Electricity":5,"Internet":28,"Phone":15,
    "Streaming":12,"Gym":30,"Home insurance":3,"Transit pass":1}';
  cat record;
  c jsonb := '{}';
  ms date;
  y int;
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

  delete from public.months where user_id = uid;  -- cascades to items and income
  delete from public.bills where user_id = uid;
  delete from public.categories where user_id = uid;

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

  -- Regular bills
  insert into public.bills (user_id, name, default_amount, category_id, is_credit_card, sort_order)
  select uid, t.name, t.amount, (c->>t.cat)::uuid, t.card, t.ord
  from (values
    ('Credit card',      420.00, 'Credit card',         true,  1),
    ('Rent',             980.00, 'Housing & utilities', false, 2),
    ('Electricity',       58.00, 'Housing & utilities', false, 3),
    ('Internet',          34.90, 'Housing & utilities', false, 4),
    ('Phone',             19.90, 'Subscriptions',       false, 5),
    ('Streaming',         13.99, 'Subscriptions',       false, 6),
    ('Gym',               34.90, 'Subscriptions',       false, 7),
    ('Home insurance',    27.50, 'Insurance',           false, 8),
    ('Transit pass',      36.50, 'Transport',           false, 9)
  ) as t(name, amount, cat, card, ord);

  ms := first_month;
  while ms <= this_month loop
    y := extract(year from ms)::int;
    m := extract(month from ms)::int;
    bonus := m in (6, 11);

    insert into public.months (user_id, year, month, savings, opening_balance)
    values (uid, y, m, 0, case when ms = first_month then 340 end)
    returning id into mid;

    insert into public.income_entries (user_id, month_id, label, amount, is_recurring, sort_order)
    values (uid, mid, 'Salary', case when y < extract(year from today) then 3050 else 3200 end, true, 1);
    if bonus then
      insert into public.income_entries (user_id, month_id, label, amount, is_recurring, sort_order)
      values (uid, mid, case when m = 6 then 'Holiday pay' else 'Christmas bonus' end, 2400, false, 2);
    end if;
    if random() < 0.4 then
      insert into public.income_entries (user_id, month_id, label, amount, is_recurring, sort_order)
      values (uid, mid, 'Freelance', round((150 + random() * 300)::numeric, 0), false, 3);
    end if;

    -- Regular bills; the card bill pays last month's card purchases
    for bill in
      select bi.id, bi.name, bi.default_amount, bi.category_id, bi.is_credit_card, (bill_days->>bi.name)::int as day
      from public.bills bi where bi.user_id = uid order by bi.sort_order
    loop
      d := make_date(y, m, least(bill.day, extract(day from (ms + interval '1 month - 1 day'))::int));
      if bill.is_credit_card then
        insert into public.items (user_id, month_id, name, amount, category_id, date, paid, bill_id)
        values (uid, mid, bill.name, 0, bill.category_id, d, d <= today, bill.id)
        returning id into card_item;
        tracked := 0;
        for purchase in
          select * from (values
            ('Restaurant',      'Food',          46),
            ('Takeaway',        'Food',          24),
            ('Clothing',        'Shopping',      79),
            ('Online order',    'Shopping',      38),
            ('Pharmacy',        'Health & care', 21),
            ('Cinema',          'Fun & trips',   28),
            ('Concert tickets', 'Fun & trips',   65),
            ('Train tickets',   'Transport',     49),
            ('Books',           'Shopping',      32),
            ('Hairdresser',     'Health & care', 35)
          ) as t(name, cat, amount)
          where random() < 0.55
        loop
          amt := round((purchase.amount * (0.7 + random() * 0.7))::numeric, 2);
          tracked := tracked + amt;
          insert into public.items (user_id, month_id, parent_item_id, name, amount, category_id, date, paid)
          values (uid, mid, card_item, purchase.name, amt, (c->>purchase.cat)::uuid,
                  (ms - interval '1 month')::date + (2 + floor(random() * 24))::int, true);
        end loop;
        update public.items set amount = tracked + round((40 + random() * 90)::numeric, 2) where id = card_item;
      else
        amt := case when bill.name = 'Electricity'
                 then round((bill.default_amount * (0.8 + random() * 0.5))::numeric, 2)
                 else bill.default_amount end;
        insert into public.items (user_id, month_id, name, amount, category_id, date, paid, bill_id)
        values (uid, mid, bill.name, amt, bill.category_id, d, d <= today, bill.id);
      end if;
    end loop;

    -- Weekly groceries and the odd one-off, paid by debit card, up to today
    for wk in 0..3 loop
      d := make_date(y, m, 2 + wk * 7);
      if d <= today then
        insert into public.items (user_id, month_id, name, amount, category_id, date, paid)
        values (uid, mid, 'Groceries', round((55 + random() * 45)::numeric, 2), (c->>'Food')::uuid, d, true);
      end if;
    end loop;
    d := make_date(y, m, 20);
    if random() < 0.5 and d <= today then
      insert into public.items (user_id, month_id, name, amount, category_id, date, paid)
      values (uid, mid, 'Coffee beans', 18.50, (c->>'Food')::uuid, d, true);
    end if;
    d := make_date(y, m, 14);
    if m in (3, 8) and d <= today then
      insert into public.items (user_id, month_id, name, amount, category_id, date, paid)
      values (uid, mid, case when m = 3 then 'Ski weekend' else 'Summer trip' end,
              case when m = 3 then 420 else 860 end, (c->>'Fun & trips')::uuid, d, true);
    end if;

    ms := (ms + interval '1 month')::date;
  end loop;

  -- Save whatever is left each month, in round €50 steps, so the carried-over balance stays small.
  update public.months mo
  set savings = greatest(0, floor((inc.total - sp.total - 60 - random() * 80) / 50) * 50)
  from (select month_id, sum(amount) total from public.income_entries where user_id = uid group by month_id) inc,
       (select month_id, sum(amount) total from public.items where user_id = uid and parent_item_id is null group by month_id) sp
  where mo.user_id = uid and inc.month_id = mo.id and sp.month_id = mo.id;
end;
$$;

-- Only the database owner (seed scripts, reset_demo_data) may run the generator.
revoke all on function public.seed_demo_data(uuid) from public, anon, authenticated;

-- True when the request comes from the demo account.
create or replace function public.is_demo()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'demo')::boolean, false)
$$;

-- The demo account is read-only: these restrictive policies apply on top of the owner policies.
do $$
declare t text;
begin
  foreach t in array array['categories','months','income_entries','bills','items'] loop
    execute format('create policy "%1$s_demo_no_insert" on public.%1$I as restrictive for insert to authenticated with check (not (select public.is_demo()))', t);
    execute format('create policy "%1$s_demo_no_update" on public.%1$I as restrictive for update to authenticated using (not (select public.is_demo()))', t);
    execute format('create policy "%1$s_demo_no_delete" on public.%1$I as restrictive for delete to authenticated using (not (select public.is_demo()))', t);
  end loop;
end $$;
