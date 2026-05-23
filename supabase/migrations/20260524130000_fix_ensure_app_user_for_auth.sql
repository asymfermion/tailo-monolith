-- Repair: ensure_app_user_for_auth had ambiguous app_user_id (RETURNS TABLE vs columns).
-- Safe to run if 20260523120000 already applied an older function body.

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
