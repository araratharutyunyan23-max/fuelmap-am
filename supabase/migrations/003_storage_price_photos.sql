-- ============================================================================
-- FuelMap Armenia — Phase 2.5: storage for price-tag photos
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

-- Create / update the bucket. Public so confirmed reports can show the photo
-- to anonymous visitors. 5 MB limit; image MIME types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'price-photos',
  'price-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================================
-- Row Level Security on storage.objects (for this bucket)
-- ============================================================================

drop policy if exists "price photos are public"   on storage.objects;
drop policy if exists "users upload own photos"   on storage.objects;
drop policy if exists "users delete own photos"   on storage.objects;

-- Anyone can read photos.
create policy "price photos are public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'price-photos');

-- Authenticated users can only upload into a folder named after their UUID.
-- We'll use paths like price-photos/<auth.uid>/<uuid>.jpg from the client.
create policy "users upload own photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'price-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete only their own files (e.g. to retake before submit).
create policy "users delete own photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'price-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
