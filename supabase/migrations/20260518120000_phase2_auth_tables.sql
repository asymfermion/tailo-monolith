-- Phase 2 auth tables: profiles + legacy anonymous_id_links (B2.1.1, B2.1.2)

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  using (auth.uid() = user_id);

create policy profiles_insert_own
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

create table if not exists public.anonymous_id_links (
  anonymous_user_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  linked_at timestamptz not null default now()
);

create index if not exists anonymous_id_links_user_id_idx
  on public.anonymous_id_links (user_id);

alter table public.anonymous_id_links enable row level security;

create policy anonymous_id_links_select_own
  on public.anonymous_id_links
  for select
  using (auth.uid() = user_id);

create policy anonymous_id_links_insert_own
  on public.anonymous_id_links
  for insert
  with check (auth.uid() = user_id);

grant select, insert on public.profiles to authenticated;
grant select, insert on public.anonymous_id_links to authenticated;
