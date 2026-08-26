-- ============================================================
-- Storage: book-images bucket policies
-- ============================================================
-- Mirrors 20260821220000_mosque_images_storage.sql, but for book cover
-- photos (books.book_image) instead of mosque photos. Kept as a separate
-- bucket rather than reusing "mosque-images" so storage stays organized
-- and each bucket's size/type limits can be tuned independently later.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-images', 'book-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Book images are publicly readable" ON storage.objects;
CREATE POLICY "Book images are publicly readable"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'book-images');

DROP POLICY IF EXISTS "Anyone can upload book images" ON storage.objects;
CREATE POLICY "Anyone can upload book images"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'book-images');
