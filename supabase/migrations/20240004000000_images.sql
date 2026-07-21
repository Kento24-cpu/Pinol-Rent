-- Migration 4: Storage bucket for car images
-- Note: storage schema/bootstrap must be run as supabase_admin before migrations.
-- Run manually: GRANT CREATE ON SCHEMA storage TO postgres;
-- Then run:    supabase migration up

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('car-images', 'car-images', true, 5242880, '{"image/png","image/jpeg","image/webp","image/heic","image/heif"}')
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own images
CREATE POLICY "car_images_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'car-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read car images
CREATE POLICY "car_images_select_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'car-images');

CREATE POLICY "car_images_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'car-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "car_images_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'car-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
