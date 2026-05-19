-- Phase 2 events (minimal for uploads) + private event-media bucket (B2.1.4 partial, B2.2.x)

create table if not exists public.events (
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pet_id uuid not null references public.pets (pet_id) on delete cascade,
  source_local_event_id text not null,
  timestamp timestamptz not null default now(),
  source text not null default 'camera_roll'
    check (source in ('camera_roll', 'in_app', 'manual')),
  event_type text not null default 'unknown'
    check (event_type in ('walk', 'play', 'rest', 'eating', 'unknown')),
  caption text,
  caption_source text check (caption_source in ('user', 'ai', 'placeholder')),
  is_favorite boolean not null default false,
  user_edited_caption boolean not null default false,
  user_edited_event_type boolean not null default false,
  sync_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_user_source_local_event_id_key unique (user_id, source_local_event_id)
);

create index if not exists events_user_updated_at_idx
  on public.events (user_id, updated_at desc);

alter table public.events enable row level security;

create policy events_select_own
  on public.events
  for select
  using (auth.uid() = user_id);

create policy events_insert_own
  on public.events
  for insert
  with check (auth.uid() = user_id);

create policy events_update_own
  on public.events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.events to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-media',
  'event-media',
  false,
  3145728,
  array['image/jpeg']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy event_media_objects_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy event_media_objects_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy event_media_objects_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'event-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
