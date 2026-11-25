-- Demo account with made-up data (the README screenshots use it).
-- Loaded by `supabase db reset` after seed.sql. Re-runnable on an existing database: it creates the
-- demo user if needed, resets its password and regenerates its data. Nobody else's data is touched.
--
--   docker exec -i supabase_db_budget-next-supabase psql -U postgres -d postgres < supabase/demo.sql
--
-- Log in as demo@example.com / demo-password, or use "Try the demo" on the login page
-- (set DEMO_EMAIL and DEMO_PASSWORD in .env.local). app_metadata.demo marks the account: the database
-- makes it read-only and the app shows a demo banner. The data is dated up to the month this runs in,
-- so run it again now and then to keep it current.

do $$
declare
  uid constant uuid := 'de300000-0000-4000-8000-000000000001';
  demo_email constant text := 'demo@example.com';
  demo_password constant text := 'demo-password';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', demo_email,
    crypt(demo_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"],"demo":true}', '{}', now(), now(), '', '', '', ''
  )
  on conflict (id) do update set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    raw_app_meta_data = auth.users.raw_app_meta_data || '{"demo":true}',
    updated_at = now();

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), uid, uid,
    jsonb_build_object('sub', uid, 'email', demo_email, 'email_verified', true),
    'email', now(), now(), now()
  where not exists (select 1 from auth.identities where user_id = uid and provider = 'email');

  perform public.seed_demo_data(uid);
end $$;
