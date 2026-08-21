-- ============================================================
-- Allow unauthenticated (guest) submissions
-- ============================================================
-- Previously, INSERT policies on books, mosques, and mosque_books
-- required auth.uid() IS NOT NULL (i.e., a logged-in user).
--
-- This migration lifts that restriction so that ANY visitor can
-- submit a book or mosque entry without creating an account.
--
-- Guest submissions always land in the PENDING queue:
--   • submitted_by  → NULL (no auth.uid() for guests)
--   • status        → 'pending' (enforced by the DB default and the
--                     CHECK constraint on the INSERT policy)
--
-- Authenticated volunteers/admins continue to get 'approved' status
-- immediately via application logic in SubmitPage.tsx.
--
-- Idempotent: drops old policies before recreating them.
-- ============================================================

-- Grant INSERT privilege on these tables to the anon role so the
-- Supabase JS client (using the anon key) can call INSERT without
-- a session token.
GRANT INSERT ON public.books     TO anon;
GRANT INSERT ON public.mosques   TO anon;
GRANT INSERT ON public.mosque_books TO anon;

-- ── books ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can insert books" ON public.books;

-- Guests and authenticated users may both insert book records.
-- No sensitive data lives on books (just title/author/category).
CREATE POLICY "Anyone can insert books"
  ON public.books FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ── mosques ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can insert mosques" ON public.mosques;

-- Guests may submit new mosques. submitted_by will be NULL for guests.
-- The column is already nullable (REFERENCES users ON DELETE SET NULL).
CREATE POLICY "Anyone can insert mosques"
  ON public.mosques FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ── mosque_books ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can insert mosque_books" ON public.mosque_books;

-- Guests may insert mosque_books rows. We enforce that guest rows
-- must have status = 'pending' at the policy level so a malicious
-- anon caller cannot self-approve their own entry.
-- Authenticated volunteers/admins set status in app code; the DB
-- column default is already 'pending' so this is belt-and-suspenders.
CREATE POLICY "Anyone can insert mosque_books"
  ON public.mosque_books FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- Guests (no auth.uid) must submit as pending
    (auth.uid() IS NULL AND status = 'pending')
    OR
    -- Authenticated users may submit with any status
    -- (application code enforces role-based approval logic)
    auth.uid() IS NOT NULL
  );
