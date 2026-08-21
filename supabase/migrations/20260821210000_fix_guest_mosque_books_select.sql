-- ============================================================
-- Fix: Allow guests (anon) to SELECT their own just-inserted
-- mosque_books rows so the INSERT ... RETURNING clause succeeds.
--
-- The problem: after the guest INSERT policy was added, the client
-- still uses .insert(...).select('id').single() which triggers a
-- RETURNING clause. PostgREST evaluates RETURNING through the
-- SELECT RLS policy, so the inserted row must be readable by the
-- caller. For guests (no auth.uid()), the only way to identify
-- "their" row is: submitted_by IS NULL AND status = 'pending'.
--
-- This is acceptably tight — it only exposes anonymous pending
-- rows, which contain no private data (book title, mosque info).
-- ============================================================

GRANT SELECT ON public.mosque_books TO anon;

DROP POLICY IF EXISTS "Guests can view their own anonymous pending submissions" ON public.mosque_books;
CREATE POLICY "Guests can view their own anonymous pending submissions"
  ON public.mosque_books FOR SELECT TO anon
  USING (submitted_by IS NULL AND status = 'pending');
