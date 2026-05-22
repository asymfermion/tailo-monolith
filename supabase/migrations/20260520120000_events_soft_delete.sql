-- Soft-delete for cloud-rejected moments and future user-initiated deletes (B2.11).

alter table public.events
  add column if not exists deleted_at timestamptz;

create index if not exists events_user_active_updated_at_idx
  on public.events (user_id, updated_at asc)
  where deleted_at is null;
