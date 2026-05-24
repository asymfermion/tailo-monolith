-- current_app_user_id() is used inside RLS policies, including the policy on
-- user_identities itself. Run it as the function owner so the lookup does not
-- recursively invoke user_identities_select_own.
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ui.app_user_id
  from public.user_identities ui
  where ui.provider = 'supabase_auth'
    and ui.provider_subject = auth.uid()::text
  limit 1;
$$;

grant execute on function public.current_app_user_id() to authenticated;
