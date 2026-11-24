-- Local development seed: recreated on every `supabase db reset`.
-- The only user (sign-ups are disabled). Change the password before going online.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'f24e571b-57e8-4bf4-b36f-fd55d653a207',
  'authenticated', 'authenticated', 'test@email.com',
  crypt('123456', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'f24e571b-57e8-4bf4-b36f-fd55d653a207',
  'f24e571b-57e8-4bf4-b36f-fd55d653a207',
  '{"sub":"f24e571b-57e8-4bf4-b36f-fd55d653a207","email":"test@email.com","email_verified":true}',
  'email', now(), now(), now()
);

-- Default categories
insert into public.categories (user_id, name, icon, color, is_essential, sort_order)
select 'f24e571b-57e8-4bf4-b36f-fd55d653a207', name, icon, color, essential, ord
from (values
  ('Housing & utilities', 'house', '#f2b340', true,  1),
  ('Food',                'shopping-cart', '#e8954a', false, 2),
  ('Transport',           'train-front', '#c9a46a', false, 3),
  ('Subscriptions',       'tv', '#b8875c', false, 4),
  ('Insurance',           'shield', '#8e8c87', false, 5),
  ('Shopping',            'shopping-bag', '#d97a4a', false, 6),
  ('Health & care',       'pill', '#e0c27a', false, 7),
  ('Fun & trips',         'gamepad-2', '#f0a35e', false, 8),
  ('Credit card',         'credit-card', '#6e6c68', false, 9),
  ('Other',               'package', '#a8a49c', false, 10)
) as c(name, icon, color, essential, ord);

-- Regular bills
insert into public.bills (user_id, name, default_amount, category_id, is_credit_card, sort_order)
select 'f24e571b-57e8-4bf4-b36f-fd55d653a207', b.name, b.amount, c.id, b.card, b.ord
from (values
  ('Credit',               300.00, 'Credit card',         true,  1),
  ('Groceries',            350.00, 'Food',                false, 2),
  ('Rent',                 800.00, 'Housing & utilities', false, 3),
  ('Electricity',           45.00, 'Housing & utilities', false, 4),
  ('Gas',                   30.00, 'Housing & utilities', false, 5),
  ('Internet',              35.00, 'Housing & utilities', false, 6),
  ('Insurance',             25.00, 'Insurance',           false, 7),
  ('Phone',                 20.00, 'Subscriptions',       false, 8),
  ('Gym',                   35.00, 'Subscriptions',       false, 9),
  ('Streaming',             12.99, 'Subscriptions',       false, 10)
) as b(name, amount, cat, card, ord)
join public.categories c
  on c.name = b.cat and c.user_id = 'f24e571b-57e8-4bf4-b36f-fd55d653a207';
