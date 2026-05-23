-- Phase 1 identity foundation (B2.1.11, B2.1.12, B2.1.17 partial)
-- Canonical Tailo app_user_id + provider identity mappings.
-- Existing pets/events still key on auth.users.id until B2.1.13.

create table if not exists public.app_users (
  app_user_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.user_identities (
  identity_id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users (app_user_id) on delete cascade,
  provider text not null check (
    provider in ('supabase_auth', 'email', 'apple', 'google')
  ),
  provider_subject text not null,
  provider_email text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  constraint user_identities_provider_subject_key unique (provider, provider_subject)
);

create index if not exists user_identities_app_user_id_idx
  on public.user_identities (app_user_id);

create unique index if not exists user_identities_supabase_auth_subject_idx
  on public.user_identities (provider_subject)
  where provider = 'supabase_auth';

create table if not exists public.account_profiles (
  app_user_id uuid primary key references public.app_users (app_user_id) on delete cascade,
  display_name text,
  preferred_locale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.anonymous_id_links
  add column if not exists app_user_id uuid references public.app_users (app_user_id) on delete cascade;

create index if not exists anonymous_id_links_app_user_id_idx
  on public.anonymous_id_links (app_user_id);

-- Resolve auth.uid() → canonical app_user_id (null until ensure runs).
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select ui.app_user_id
  from public.user_identities ui
  where ui.provider = 'supabase_auth'
    and ui.provider_subject = auth.uid()::text
  limit 1;
$$;

-- Service-side ensure: map Supabase auth subject → app_user_id (+ optional email identity).
create or replace function public.ensure_app_user_for_auth(
  p_supabase_user_id uuid,
  p_email text default null,
  p_email_confirmed boolean default false
)
returns table (
  app_user_id uuid,
  created_app_user boolean,
  created_supabase_identity boolean,
  created_email_identity boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_resolved_user_id uuid;
  v_created_app_user boolean := false;
  v_created_supabase_identity boolean := false;
  v_created_email_identity boolean := false;
  v_email text;
begin
  if p_supabase_user_id is null then
    raise exception 'supabase_user_id is required';
  end if;

  select ui.app_user_id
  into v_resolved_user_id
  from public.user_identities ui
  where ui.provider = 'supabase_auth'
    and ui.provider_subject = p_supabase_user_id::text;

  if v_resolved_user_id is null then
    insert into public.app_users default values
    returning app_users.app_user_id into v_resolved_user_id;

    v_created_app_user := true;

    insert into public.user_identities (
      app_user_id,
      provider,
      provider_subject,
      last_seen_at
    )
    values (
      v_resolved_user_id,
      'supabase_auth',
      p_supabase_user_id::text,
      now()
    );

    v_created_supabase_identity := true;

    insert into public.account_profiles (app_user_id)
    values (v_resolved_user_id)
    on conflict (app_user_id) do nothing;
  else
    update public.user_identities ui
    set last_seen_at = now()
    where ui.provider = 'supabase_auth'
      and ui.provider_subject = p_supabase_user_id::text;
  end if;

  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');

  if p_email_confirmed and v_email is not null then
    if exists (
      select 1
      from public.user_identities ui
      where ui.provider = 'email'
        and ui.provider_subject = v_email
        and ui.app_user_id = v_resolved_user_id
    ) then
      update public.user_identities ui
      set
        provider_email = v_email,
        last_seen_at = now()
      where ui.provider = 'email'
        and ui.provider_subject = v_email
        and ui.app_user_id = v_resolved_user_id;
    else
      insert into public.user_identities (
        app_user_id,
        provider,
        provider_subject,
        provider_email,
        last_seen_at
      )
      values (
        v_resolved_user_id,
        'email',
        v_email,
        v_email,
        now()
      )
      on conflict (provider, provider_subject) do update
      set
        provider_email = excluded.provider_email,
        last_seen_at = now()
      where user_identities.app_user_id = v_resolved_user_id;

      v_created_email_identity := found;
    end if;
  end if;

  return query
  select
    v_resolved_user_id,
    v_created_app_user,
    v_created_supabase_identity,
    v_created_email_identity;
end;
$$;

revoke all on function public.ensure_app_user_for_auth(uuid, text, boolean) from public;
grant execute on function public.ensure_app_user_for_auth(uuid, text, boolean) to service_role;

alter table public.app_users enable row level security;
alter table public.user_identities enable row level security;
alter table public.account_profiles enable row level security;

create policy app_users_select_own
  on public.app_users
  for select
  using (app_user_id = public.current_app_user_id());

create policy user_identities_select_own
  on public.user_identities
  for select
  using (app_user_id = public.current_app_user_id());

create policy account_profiles_select_own
  on public.account_profiles
  for select
  using (app_user_id = public.current_app_user_id());

create policy account_profiles_update_own
  on public.account_profiles
  for update
  using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());

grant select on public.app_users to authenticated;
grant select on public.user_identities to authenticated;
grant select, update on public.account_profiles to authenticated;

-- Backfill existing Supabase users that already touched profiles or legacy links.
do $$
declare
  r record;
begin
  for r in
    select distinct user_id
    from (
      select user_id from public.profiles
      union
      select user_id from public.anonymous_id_links
    ) seeded
  loop
    perform public.ensure_app_user_for_auth(r.user_id, null, false);
  end loop;
end;
$$;

update public.anonymous_id_links l
set app_user_id = ui.app_user_id
from public.user_identities ui
where ui.provider = 'supabase_auth'
  and ui.provider_subject = l.user_id::text
  and l.app_user_id is null;
