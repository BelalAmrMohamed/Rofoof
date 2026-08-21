-- Grant SELECT on public.mosque_books to anon and authenticated
-- This was missing from the previous grant repairs and causes 403 Forbidden
-- during INSERT ... RETURNING id because the client cannot select the inserted row.

GRANT SELECT ON public.mosque_books TO anon, authenticated;
