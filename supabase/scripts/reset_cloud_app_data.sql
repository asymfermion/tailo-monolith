-- Optional: wipe Phase 2 app data on a dev/staging project (keeps auth.users + app_users).
-- Run in Supabase SQL editor when you want a clean slate before re-running migrations.
-- Does NOT remove storage bucket objects — clear event-media in Dashboard if needed.

begin;

truncate table public.ai_jobs cascade;
truncate table public.event_media cascade;
truncate table public.events cascade;
truncate table public.pets cascade;

-- Legacy Phase 1 bridge
delete from public.anonymous_id_links;

-- Tailo identity layer (re-created on next ensure-current-user)
delete from public.account_profiles;
delete from public.user_identities;
delete from public.app_users;

commit;
