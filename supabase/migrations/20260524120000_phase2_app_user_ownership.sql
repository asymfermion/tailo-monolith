-- B2.1.13–B2.1.16: canonical ownership on app_user_id; RLS via current_app_user_id(); storage paths.

-- ---------------------------------------------------------------------------
-- pets + events: add app_user_id, backfill, drop user_id
-- ---------------------------------------------------------------------------

alter table public.pets
  add column if not exists app_user_id uuid references public.app_users (app_user_id) on delete cascade;

alter table public.events
  add column if not exists app_user_id uuid references public.app_users (app_user_id) on delete cascade;

update public.pets p
set app_user_id = ui.app_user_id
from public.user_identities ui
where ui.provider = 'supabase_auth'
  and ui.provider_subject = p.user_id::text
  and p.app_user_id is null;

update public.events e
set app_user_id = ui.app_user_id
from public.user_identities ui
where ui.provider = 'supabase_auth'
  and ui.provider_subject = e.user_id::text
  and e.app_user_id is null;

do $$
declare
  r record;
begin
  for r in
    select distinct user_id
    from (
      select user_id from public.pets where app_user_id is null
      union
      select user_id from public.events where app_user_id is null
    ) missing
  loop
    perform public.ensure_app_user_for_auth(r.user_id, null, false);
  end loop;
end;
$$;

update public.pets p
set app_user_id = ui.app_user_id
from public.user_identities ui
where ui.provider = 'supabase_auth'
  and ui.provider_subject = p.user_id::text
  and p.app_user_id is null;

update public.events e
set app_user_id = ui.app_user_id
from public.user_identities ui
where ui.provider = 'supabase_auth'
  and ui.provider_subject = e.user_id::text
  and e.app_user_id is null;

alter table public.pets
  alter column app_user_id set not null;

alter table public.events
  alter column app_user_id set not null;

alter table public.pets
  drop constraint if exists pets_user_source_local_pet_id_key;

alter table public.events
  drop constraint if exists events_user_source_local_event_id_key;

drop index if exists public.pets_user_id_idx;
drop index if exists public.events_user_updated_at_idx;
drop index if exists public.events_user_active_updated_at_idx;

alter table public.pets
  add constraint pets_app_user_source_local_pet_id_key unique (app_user_id, source_local_pet_id);

alter table public.events
  add constraint events_app_user_source_local_event_id_key unique (app_user_id, source_local_event_id);

create index if not exists pets_app_user_id_idx on public.pets (app_user_id);

create index if not exists events_app_user_updated_at_idx
  on public.events (app_user_id, updated_at desc);

create index if not exists events_app_user_active_updated_at_idx
  on public.events (app_user_id, updated_at asc)
  where deleted_at is null;

-- Drop policies that still reference user_id before dropping the column.
drop policy if exists pets_select_own on public.pets;
drop policy if exists pets_insert_own on public.pets;
drop policy if exists pets_update_own on public.pets;

drop policy if exists events_select_own on public.events;
drop policy if exists events_insert_own on public.events;
drop policy if exists events_update_own on public.events;

drop policy if exists event_media_select_own on public.event_media;
drop policy if exists event_media_insert_own on public.event_media;
drop policy if exists event_media_update_own on public.event_media;
drop policy if exists event_media_delete_own on public.event_media;

drop policy if exists ai_jobs_select_own on public.ai_jobs;

drop policy if exists event_media_objects_select_own on storage.objects;
drop policy if exists event_media_objects_insert_own on storage.objects;
drop policy if exists event_media_objects_update_own on storage.objects;

alter table public.pets drop column if exists user_id;
alter table public.events drop column if exists user_id;

-- ---------------------------------------------------------------------------
-- RLS: pets + events
-- ---------------------------------------------------------------------------

create policy pets_select_own
  on public.pets
  for select
  using (app_user_id = public.current_app_user_id());

create policy pets_insert_own
  on public.pets
  for insert
  with check (app_user_id = public.current_app_user_id());

create policy pets_update_own
  on public.pets
  for update
  using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());

create policy events_select_own
  on public.events
  for select
  using (app_user_id = public.current_app_user_id());

create policy events_insert_own
  on public.events
  for insert
  with check (app_user_id = public.current_app_user_id());

create policy events_update_own
  on public.events
  for update
  using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());

-- ---------------------------------------------------------------------------
-- RLS: event_media + ai_jobs (via events.app_user_id)
-- ---------------------------------------------------------------------------

create policy event_media_select_own
  on public.event_media
  for select
  using (
    exists (
      select 1
      from public.events
      where events.event_id = event_media.event_id
        and events.app_user_id = public.current_app_user_id()
    )
  );

create policy event_media_insert_own
  on public.event_media
  for insert
  with check (
    exists (
      select 1
      from public.events
      where events.event_id = event_media.event_id
        and events.app_user_id = public.current_app_user_id()
    )
  );

create policy event_media_update_own
  on public.event_media
  for update
  using (
    exists (
      select 1
      from public.events
      where events.event_id = event_media.event_id
        and events.app_user_id = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1
      from public.events
      where events.event_id = event_media.event_id
        and events.app_user_id = public.current_app_user_id()
    )
  );

create policy event_media_delete_own
  on public.event_media
  for delete
  using (
    exists (
      select 1
      from public.events
      where events.event_id = event_media.event_id
        and events.app_user_id = public.current_app_user_id()
    )
  );

create policy ai_jobs_select_own
  on public.ai_jobs
  for select
  using (
    exists (
      select 1
      from public.events
      where events.event_id = ai_jobs.event_id
        and events.app_user_id = public.current_app_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: event-media paths use app_user_id prefix
-- ---------------------------------------------------------------------------

create policy event_media_objects_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = public.current_app_user_id()::text
  );

create policy event_media_objects_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = public.current_app_user_id()::text
  );

create policy event_media_objects_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = public.current_app_user_id()::text
  )
  with check (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = public.current_app_user_id()::text
  );
