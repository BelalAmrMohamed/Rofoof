-- ============================================================
-- Admins can add, remove, and reorder mosque images from the
-- Mosque page.
--
-- mosque_images already has:
--   - public SELECT (20260826120000)
--   - INSERT for anon/authenticated (20260826140000)
--   - admin DELETE (20260827090000, "Admins can delete any mosque image")
--
-- What's missing: an UPDATE policy. Without it, reordering images
-- (writing a new sort_order per row) silently fails with a
-- permission-denied error for every user, including admins — there
-- was never an UPDATE policy on this table at all, not even for
-- the row's own submitter.
-- ============================================================

GRANT UPDATE ON public.mosque_images TO authenticated;

DROP POLICY IF EXISTS "Admins can update any mosque image" ON public.mosque_images;
CREATE POLICY "Admins can update any mosque image"
  ON public.mosque_images FOR UPDATE TO authenticated
  USING (public.user_role_for(auth.uid()) = 'admin')
  WITH CHECK (public.user_role_for(auth.uid()) = 'admin');

NOTIFY pgrst, 'reload schema';
