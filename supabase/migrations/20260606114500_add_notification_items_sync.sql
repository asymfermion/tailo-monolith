-- Phase 3.6.5/3.6.7: cloud notification storage + cross-device read sync.

create table if not exists public.notification_items (
  notification_item_id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users (app_user_id) on delete cascade,
  source_notification_id text not null,
  kind text not null,
  title text not null,
  body text not null,
  source text not null,
  target jsonb not null default '{}'::jsonb,
  priority text not null default 'normal',
  delivery text not null default 'in_app',
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  sync_version bigint not null default 1 check (sync_version >= 1),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_items_app_user_source_key unique (app_user_id, source_notification_id)
);

create index if not exists notification_items_app_user_updated_idx
  on public.notification_items (app_user_id, updated_at asc, notification_item_id asc);

create index if not exists notification_items_app_user_unread_idx
  on public.notification_items (app_user_id, read_at, created_at desc);

alter table public.notification_items enable row level security;

drop policy if exists notification_items_select_own on public.notification_items;
drop policy if exists notification_items_insert_own on public.notification_items;
drop policy if exists notification_items_update_own on public.notification_items;

create policy notification_items_select_own
  on public.notification_items
  for select
  using (app_user_id = public.current_app_user_id());

create policy notification_items_insert_own
  on public.notification_items
  for insert
  with check (app_user_id = public.current_app_user_id());

create policy notification_items_update_own
  on public.notification_items
  for update
  using (app_user_id = public.current_app_user_id())
  with check (app_user_id = public.current_app_user_id());
