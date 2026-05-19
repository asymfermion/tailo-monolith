-- Phase 2 event_media + ai_jobs (B2.1.5, B2.1.6)

create table if not exists public.event_media (
  event_media_id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (event_id) on delete cascade,
  source_local_asset_id text not null,
  storage_path text not null,
  thumbnail_path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  is_primary boolean not null default false,
  detected_pet_type text check (detected_pet_type in ('dog', 'cat')),
  created_at timestamptz not null default now(),
  constraint event_media_event_source_local_asset_key unique (event_id, source_local_asset_id)
);

create index if not exists event_media_event_id_idx on public.event_media (event_id);

alter table public.event_media enable row level security;

create policy event_media_select_own
  on public.event_media
  for select
  using (
    exists (
      select 1
      from public.events
      where events.event_id = event_media.event_id
        and events.user_id = auth.uid()
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
        and events.user_id = auth.uid()
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
        and events.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.events
      where events.event_id = event_media.event_id
        and events.user_id = auth.uid()
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
        and events.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.event_media to authenticated;

create table if not exists public.ai_jobs (
  ai_job_id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (event_id) on delete cascade,
  job_type text not null default 'caption_event'
    check (job_type in ('caption_event')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  leased_until timestamptz,
  last_error text,
  input_snapshot jsonb,
  result_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_jobs_status_next_attempt_idx
  on public.ai_jobs (status, next_attempt_at);

create index if not exists ai_jobs_event_id_idx on public.ai_jobs (event_id);

alter table public.ai_jobs enable row level security;

create policy ai_jobs_select_own
  on public.ai_jobs
  for select
  using (
    exists (
      select 1
      from public.events
      where events.event_id = ai_jobs.event_id
        and events.user_id = auth.uid()
    )
  );

grant select on public.ai_jobs to authenticated;
