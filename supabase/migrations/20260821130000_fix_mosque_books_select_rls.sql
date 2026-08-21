-- Add SELECT policies to mosque_books to allow users to view their own submissions
-- and admins to view all submissions. This prevents 403 errors when inserting
-- pending submissions (which would otherwise fail the SELECT policy on RETURNING).

DROP POLICY IF EXISTS "Users can view their own submissions" ON public.mosque_books;
CREATE POLICY "Users can view their own submissions"
  ON public.mosque_books FOR SELECT TO authenticated USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Admins can view all submissions" ON public.mosque_books;
CREATE POLICY "Admins can view all submissions"
  ON public.mosque_books FOR SELECT TO authenticated USING (
    public.user_role_for(auth.uid()) = 'admin'
  );
