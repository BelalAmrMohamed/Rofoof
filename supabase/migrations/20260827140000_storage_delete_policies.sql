-- ============================================================
-- Storage: allow admins to actually delete the underlying files
-- in mosque-images and book-images, not just their DB rows.
--
-- Both buckets (20260821220000_mosque_images_storage.sql and
-- 20260826121000_book_images_storage.sql) only ever got SELECT and
-- INSERT policies on storage.objects — never DELETE. So removing an
-- image from the Mosque/Book admin edit UI deletes the mosque_images
-- (or clears books.book_image) DB row successfully, but the actual
-- file object in Storage has no RLS grant to be removed and is left
-- behind forever. This adds the missing DELETE policies, scoped to
-- admins, matching the DB-level admin policies already in place.
-- ============================================================

DROP POLICY IF EXISTS "Admins can delete mosque images" ON storage.objects;
CREATE POLICY "Admins can delete mosque images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mosque-images' AND public.user_role_for(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can delete book images" ON storage.objects;
CREATE POLICY "Admins can delete book images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'book-images' AND public.user_role_for(auth.uid()) = 'admin');
