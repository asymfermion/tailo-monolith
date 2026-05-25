alter table public.event_media
  add column if not exists media_fingerprint text;

create index if not exists event_media_media_fingerprint_idx
  on public.event_media (media_fingerprint)
  where media_fingerprint is not null;
