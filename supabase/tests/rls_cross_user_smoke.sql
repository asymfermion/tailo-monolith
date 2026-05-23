-- B2.1.10 — RLS smoke: authenticated user B cannot read or write user A's rows.
-- No pgTAP required. Wrapped in a transaction and rolled back (no persistent test data).
--
-- Run (repo root):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_cross_user_smoke.sql
--   npm run test:supabase:rls

begin;

create or replace function pg_temp.test_user_a () returns uuid
language sql
stable
as $$
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
$$;

create or replace function pg_temp.test_user_b () returns uuid
language sql
stable
as $$
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;
$$;

create or replace function pg_temp.authenticate_as (p_user_id uuid) returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
end;
$$;

create or replace function pg_temp.assert_count (
  p_sql text,
  p_expected bigint,
  p_label text
) returns void
language plpgsql
as $$
declare
  v_actual bigint;
begin
  execute format('select count(*)::bigint from (%s) q', p_sql) into v_actual;

  if v_actual is distinct from p_expected then
    raise exception 'RLS smoke failed (%): expected % rows, got %', p_label, p_expected, v_actual;
  end if;
end;
$$;

create or replace function pg_temp.assert_empty (p_sql text, p_label text) returns void
language plpgsql
as $$
declare
  v_rec record;
begin
  for v_rec in execute p_sql loop
    raise exception 'RLS smoke failed (%): expected 0 rows, got at least 1', p_label;
  end loop;
end;
$$;

create or replace function pg_temp.assert_raises_rls (p_sql text, p_label text) returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
    raise exception 'RLS smoke failed (%): expected RLS error, statement succeeded', p_label;
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

create or replace function pg_temp.seed_auth_users () returns void
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
declare
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  )
  values
    (
      pg_temp.test_user_a(),
      v_instance_id,
      'authenticated',
      'authenticated',
      'rls-smoke-a@tailo.test',
      extensions.crypt('rls-smoke-test', extensions.gen_salt('bf')),
      now(),
      now(),
      now()
    ),
    (
      pg_temp.test_user_b(),
      v_instance_id,
      'authenticated',
      'authenticated',
      'rls-smoke-b@tailo.test',
      extensions.crypt('rls-smoke-test', extensions.gen_salt('bf')),
      now(),
      now(),
      now()
    )
  on conflict (id) do nothing;
end;
$$;

create or replace function pg_temp.user_a_pet_id () returns uuid
language sql
stable
as $$
  select current_setting('test.user_a_pet_id', true)::uuid;
$$;

create or replace function pg_temp.user_a_event_id () returns uuid
language sql
stable
as $$
  select current_setting('test.user_a_event_id', true)::uuid;
$$;

create or replace function pg_temp.test_app_user_a () returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ui.app_user_id
  from public.user_identities ui
  where ui.provider = 'supabase_auth'
    and ui.provider_subject = pg_temp.test_user_a()::text;
$$;

create or replace function pg_temp.test_app_user_b () returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ui.app_user_id
  from public.user_identities ui
  where ui.provider = 'supabase_auth'
    and ui.provider_subject = pg_temp.test_user_b()::text;
$$;

create or replace function pg_temp.seed_user_a_data () returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid;
  v_pet_id uuid;
  v_event_id uuid;
begin
  select e.app_user_id
  into v_app_user_id
  from public.ensure_app_user_for_auth(pg_temp.test_user_a(), null, false) e;

  insert into public.profiles (user_id)
  values (pg_temp.test_user_a())
  on conflict (user_id) do nothing;

  insert into public.anonymous_id_links (anonymous_user_id, user_id, app_user_id)
  values ('anon-smoke-a', pg_temp.test_user_a(), v_app_user_id)
  on conflict (anonymous_user_id) do nothing;

  insert into public.pets (app_user_id, source_local_pet_id, name, type)
  values (v_app_user_id, 'pet-a', 'Smoke A', 'dog')
  returning pet_id into v_pet_id;

  perform set_config('test.user_a_pet_id', v_pet_id::text, true);

  insert into public.events (
    app_user_id,
    pet_id,
    source_local_event_id,
    timestamp,
    source,
    event_type
  )
  values (
    v_app_user_id,
    v_pet_id,
    'event-a',
    now(),
    'camera_roll',
    'unknown'
  )
  returning event_id into v_event_id;

  perform set_config('test.user_a_event_id', v_event_id::text, true);

  insert into public.event_media (
    event_id,
    source_local_asset_id,
    storage_path,
    thumbnail_path,
    width,
    height,
    is_primary
  )
  values (
    v_event_id,
    'asset-a',
    v_app_user_id::text || '/events/x/original.jpg',
    v_app_user_id::text || '/events/x/thumb.jpg',
    100,
    100,
    true
  );

  insert into public.ai_jobs (event_id, status, next_attempt_at)
  values (v_event_id, 'pending', now());
end;
$$;

create or replace function pg_temp.seed_user_b_pet () returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid;
begin
  select e.app_user_id
  into v_app_user_id
  from public.ensure_app_user_for_auth(pg_temp.test_user_b(), null, false) e;

  insert into public.pets (app_user_id, source_local_pet_id, name, type)
  values (v_app_user_id, 'pet-b', 'Smoke B', 'cat')
  on conflict (app_user_id, source_local_pet_id) do nothing;
end;
$$;

select pg_temp.seed_auth_users();
select pg_temp.seed_user_a_data();
select pg_temp.seed_user_b_pet();

select pg_temp.authenticate_as(pg_temp.test_user_b());

select pg_temp.assert_count(
  $$
    select 1 from public.pets
    where app_user_id = pg_temp.test_app_user_a()
  $$,
  0,
  'user B cannot select user A pets'
);

select pg_temp.assert_count(
  $$
    select 1 from public.events
    where app_user_id = pg_temp.test_app_user_a()
  $$,
  0,
  'user B cannot select user A events'
);

select pg_temp.assert_count(
  $$
    select 1
    from public.event_media em
    join public.events e on e.event_id = em.event_id
    where e.app_user_id = pg_temp.test_app_user_a()
  $$,
  0,
  'user B cannot select user A event_media'
);

select pg_temp.assert_count(
  $$
    select 1
    from public.ai_jobs j
    join public.events e on e.event_id = j.event_id
    where e.app_user_id = pg_temp.test_app_user_a()
  $$,
  0,
  'user B cannot select user A ai_jobs'
);

select pg_temp.assert_count(
  $$
    select 1 from public.profiles
    where user_id = pg_temp.test_user_a()
  $$,
  0,
  'user B cannot select user A profiles'
);

select pg_temp.assert_count(
  $$
    select 1 from public.anonymous_id_links
    where user_id = pg_temp.test_user_a()
  $$,
  0,
  'user B cannot select user A anonymous_id_links'
);

select pg_temp.assert_count(
  $$
    select 1 from public.pets
    where app_user_id = pg_temp.test_app_user_b()
  $$,
  1,
  'user B can select own pet'
);

select pg_temp.assert_empty(
  $$
    update public.events
    set caption = 'stolen'
    where app_user_id = pg_temp.test_app_user_a()
    returning event_id
  $$,
  'user B cannot update user A events'
);

select pg_temp.assert_empty(
  $$
    update public.pets
    set name = 'stolen'
    where app_user_id = pg_temp.test_app_user_a()
    returning pet_id
  $$,
  'user B cannot update user A pets'
);

select pg_temp.assert_empty(
  $$
    delete from public.event_media em
    using public.events e
    where e.event_id = em.event_id
      and e.app_user_id = pg_temp.test_app_user_a()
    returning em.event_media_id
  $$,
  'user B cannot delete user A event_media'
);

select pg_temp.assert_raises_rls(
  $$
    insert into public.pets (app_user_id, source_local_pet_id, name, type)
    values (
      pg_temp.test_app_user_a(),
      'hijack-pet',
      'Hijack',
      'dog'
    )
  $$,
  'user B cannot insert pet owned by user A'
);

select pg_temp.assert_raises_rls(
  format(
    $$
      insert into public.events (
        app_user_id,
        pet_id,
        source_local_event_id,
        timestamp,
        source,
        event_type
      )
      values (
        pg_temp.test_app_user_a(),
        %L::uuid,
        'hijack-event',
        now(),
        'camera_roll',
        'unknown'
      )
    $$,
    pg_temp.user_a_pet_id()
  ),
  'user B cannot insert event owned by user A'
);

select pg_temp.assert_raises_rls(
  format(
    $$
      insert into public.event_media (
        event_id,
        source_local_asset_id,
        storage_path,
        thumbnail_path,
        width,
        height
      )
      values (
        %L::uuid,
        'hijack-asset',
        'b/hijack/original.jpg',
        'b/hijack/thumb.jpg',
        10,
        10
      )
    $$,
    pg_temp.user_a_event_id()
  ),
  'user B cannot insert event_media on user A event'
);

select pg_temp.assert_raises_rls(
  $$
    insert into public.profiles (user_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)
  $$,
  'user B cannot insert profile for user A'
);

select pg_temp.assert_raises_rls(
  $$
    insert into public.anonymous_id_links (anonymous_user_id, user_id)
    values ('anon-hijack', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)
  $$,
  'user B cannot insert anonymous_id_link for user A'
);

do $owned$
begin
  insert into public.pets (app_user_id, source_local_pet_id, name, type)
  values (pg_temp.test_app_user_b(), 'pet-b-owned', 'Owned B', 'cat');
exception
  when unique_violation then
    null;
end;
$owned$;

do $done$
begin
  raise notice 'RLS cross-user smoke: all assertions passed';
end;
$done$;

rollback;
