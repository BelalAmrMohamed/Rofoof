-- Repair public API grants and RLS policies for the browser client.
-- This is idempotent so it can safely repair an already deployed project.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.users, public.books, public.mosques TO anon, authenticated;
GRANT INSERT ON public.books, public.mosques, public.mosque_books TO authenticated;
GRANT UPDATE ON public.users, public.mosque_books TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_submissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_submission(UUID, submission_status, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Books are viewable by everyone" ON public.books;
CREATE POLICY "Books are viewable by everyone"
  ON public.books FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert books" ON public.books;
CREATE POLICY "Authenticated users can insert books"
  ON public.books FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Mosques are viewable by everyone" ON public.mosques;
CREATE POLICY "Mosques are viewable by everyone"
  ON public.mosques FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert mosques" ON public.mosques;
CREATE POLICY "Authenticated users can insert mosques"
  ON public.mosques FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Approved mosque_books are viewable by everyone" ON public.mosque_books;
CREATE POLICY "Approved mosque_books are viewable by everyone"
  ON public.mosque_books FOR SELECT TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "Authenticated users can insert mosque_books" ON public.mosque_books;
CREATE POLICY "Authenticated users can insert mosque_books"
  ON public.mosque_books FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

UPDATE public.users
SET role = 'admin'
WHERE lower(email) = lower('belalamrofficial@gmail.com');
