-- Drop the legacy Supabase-auth profile mirror.
-- Tailo account ownership now lives in app_users + user_identities, with
-- editable preferences in account_profiles.
drop table if exists public.profiles;
