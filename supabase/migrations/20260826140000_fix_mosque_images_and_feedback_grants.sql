-- ============================================================
-- Fix missing GRANTs on mosque_images and feedback
-- ============================================================
-- Supabase (Postgres via PostgREST) requires BOTH of the following for a
-- role to touch a table over the REST API:
--   1. A SQL-level GRANT on the table to that role (anon / authenticated)
--   2. A passing RLS policy for the operation being performed
--
-- 20260826120000_mosque_images_table.sql created mosque_images with RLS
-- policies but never GRANTed SELECT/INSERT/DELETE to anon/authenticated,
-- so every request hit RLS-enabled-but-ungranted and Postgres returned
-- "permission denied for table mosque_images" (42501) before RLS was
-- even evaluated. Symptom: the mosque list load in BrowsePage.tsx fetches
-- mosques, mosque_books, AND mosque_images in a single Promise.all — the
-- mosque_images failure threw and aborted that whole load, which is also
-- why the profile-prefilled location (read later in the same effect)
-- never got applied to the "تحديد الموقع" hero button on the home page.
--
-- The initial-schema feedback table (20260819153229) has the same bug:
-- an INSERT policy with no matching GRANT, causing 403s from the About
-- page feedback form.
-- ============================================================

-- ── mosque_images ──────────────────────────────────────────────
-- Public read (mirrors mosques/mosque_books SELECT access).
GRANT SELECT ON public.mosque_images TO anon, authenticated;

-- Insert: align with the rest of the submission flow, which allows guest
-- (anon) submissions for books/mosques/mosque_books. A guest uploading a
-- mosque photo via SubmitPage must be able to insert its mosque_images
-- row the same way they can insert the mosque itself.
GRANT INSERT ON public.mosque_images TO anon, authenticated;

DROP POLICY IF EXISTS "Authenticated users can insert mosque images" ON public.mosque_images;
CREATE POLICY "Anyone can insert mosque images"
  ON public.mosque_images FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Delete: only the row's own submitter, and only if they're logged in
-- (guests have no identity to own a delete against).
GRANT DELETE ON public.mosque_images TO authenticated;

-- ── feedback ───────────────────────────────────────────────────
-- Anyone (guest or logged-in) can submit feedback from the About page.
GRANT INSERT ON public.feedback TO anon, authenticated;
