-- ============================================================
-- Storage: mosque-images bucket policies
-- ============================================================
-- The bucket itself must be created manually in Supabase Dashboard
-- → Storage → New bucket → name: "mosque-images" → Public: ON
--
-- This migration adds the RLS policies on the storage.objects table
-- so anon and authenticated users can upload to that bucket,
-- and everyone can read from it.
-- ============================================================

-- Allow anyone (anon + authenticated) to upload to mosque-images
-- File size and mime-type limits should be set in the bucket settings (Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mosque-images', 'mosque-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Mosque images are publicly readable" ON storage.objects;
CREATE POLICY "Mosque images are publicly readable"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'mosque-images');

DROP POLICY IF EXISTS "Anyone can upload mosque images" ON storage.objects;
CREATE POLICY "Anyone can upload mosque images"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'mosque-images');
