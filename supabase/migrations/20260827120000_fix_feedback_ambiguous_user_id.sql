-- ============================================================
-- Fix ambiguous "user_id" column reference in
-- admin_get_all_feedback_with_submitter(), same bug class as
-- 20260827110000_fix_volunteer_requests_ambiguous_user_id.sql.
--
-- The function's RETURNS TABLE declares an output column named
-- "user_id", and the admin check used a bare "user_id = auth.uid()",
-- which Postgres can't resolve between the table column and the
-- OUT parameter (error 42702). This only surfaces at call time,
-- which is why the migration itself applied cleanly but every
-- call to the RPC 400s.
-- ============================================================

DROP FUNCTION IF EXISTS public.admin_get_all_feedback_with_submitter();

CREATE FUNCTION public.admin_get_all_feedback_with_submitter()
RETURNS TABLE (
  id          UUID,
  user_id     UUID,
  message     TEXT,
  email       VARCHAR,
  rating      SMALLINT,
  created_at  TIMESTAMPTZ,
  submitter_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.user_id = auth.uid()
      AND public.users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT f.id, f.user_id AS user_id, f.message, f.email, f.rating, f.created_at, u.fullname
  FROM public.feedback f
  LEFT JOIN public.users u ON u.user_id = f.user_id
  ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_feedback_with_submitter() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_feedback_with_submitter() TO authenticated;

NOTIFY pgrst, 'reload schema';
