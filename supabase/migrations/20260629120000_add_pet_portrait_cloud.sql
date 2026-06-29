-- Add portrait_url to pets + public pet-portraits storage bucket

alter table public.pets
  add column if not exists portrait_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-portraits',
  'pet-portraits',
  true,
  524288,
  array['image/jpeg']
)
on conflict (id) do nothing;

-- Authenticated users upload/replace their own portrait via signed URL (service role
-- generates the signed URL, so RLS is bypassed for the upload itself). These policies
-- cover any direct-client writes and are defence-in-depth.
create policy pet_portraits_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pet-portraits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy pet_portraits_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pet-portraits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
