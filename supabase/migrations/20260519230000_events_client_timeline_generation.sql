-- Client timeline generation: user wipe (e.g. Redetect) overrides stale cloud state.
alter table public.events
  add column if not exists client_timeline_generation integer not null default 0;
