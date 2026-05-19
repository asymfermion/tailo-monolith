-- Phase 2 pets table (B2.1.3)

create table if not exists public.pets (
  pet_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_local_pet_id text not null,
  name text not null,
  type text not null check (type in ('dog', 'cat')),
  gender text check (gender in ('male', 'female', 'unknown')),
  profile_media_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pets_user_source_local_pet_id_key unique (user_id, source_local_pet_id)
);

create index if not exists pets_user_id_idx on public.pets (user_id);

alter table public.pets enable row level security;

create policy pets_select_own
  on public.pets
  for select
  using (auth.uid() = user_id);

create policy pets_insert_own
  on public.pets
  for insert
  with check (auth.uid() = user_id);

create policy pets_update_own
  on public.pets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.pets to authenticated;
