alter table public.pets
  add column if not exists profile_photo_local_asset_id text;
