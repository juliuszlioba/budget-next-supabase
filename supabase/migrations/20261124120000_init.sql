-- Budget app schema. Single user, but every row is owned and guarded by RLS.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0),
  icon text not null default '📦',
  color text not null default '#8a8a8f',
  is_essential boolean not null default false,
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  savings numeric(12,2) not null default 0,
  opening_balance numeric(12,2),
  created_at timestamptz not null default now(),
  unique (user_id, year, month),
  unique (id, user_id)
);

create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  month_id uuid not null,
  label text not null,
  amount numeric(12,2) not null,
  is_recurring boolean not null default true,
  sort_order int not null default 0,
  foreign key (month_id, user_id) references public.months (id, user_id) on delete cascade
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0),
  default_amount numeric(12,2) not null default 0,
  category_id uuid not null,
  is_credit_card boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  unique (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id)
);

create unique index bills_one_active_credit_card
  on public.bills (user_id) where is_credit_card and active;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  month_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  amount numeric(12,2) not null,
  category_id uuid not null,
  date date not null,
  paid boolean not null default true,
  is_estimate boolean not null default false,
  bill_id uuid,
  parent_item_id uuid,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (month_id, user_id) references public.months (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories (id, user_id),
  foreign key (bill_id, user_id) references public.bills (id, user_id) on delete set null (bill_id),
  foreign key (parent_item_id, user_id) references public.items (id, user_id) on delete cascade,
  check (parent_item_id is null or parent_item_id <> id)
);

create index items_month_idx on public.items (month_id);
create index items_parent_idx on public.items (parent_item_id);
create index items_user_name_idx on public.items (user_id, lower(name), created_at desc);
create index income_entries_month_idx on public.income_entries (month_id);
create index months_user_year_idx on public.months (user_id, year, month);

-- Row level security: only the owner, only when logged in.
do $$
declare t text;
begin
  foreach t in array array['categories','months','income_entries','bills','items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
