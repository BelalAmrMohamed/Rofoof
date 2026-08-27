-- Fix 400 error from admin_get_all_volunteer_requests: PostgREST/pg was
-- rejecting the RETURNS TABLE shape, most likely a VARCHAR/TEXT column
-- type mismatch between the declared return columns and the underlying
-- users.fullname/users.email columns. Cast everything explicitly to TEXT
-- to remove any ambiguity, and drop+recreate since return type changed.

DROP FUNCTION IF EXISTS public.admin_get_all_volunteer_requests();

CREATE FUNCTION public.admin_get_all_volunteer_requests()
RETURNS TABLE (
  id              UUID,
  status          submission_status,
  message         TEXT,
  rejection_note  TEXT,
  created_at      TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  user_id         UUID,
  fullname        TEXT,
  email           TEXT,
  reviewed_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    vr.id, vr.status, vr.message, vr.rejection_note, vr.created_at, vr.reviewed_at,
    u.user_id, u.fullname::TEXT, u.email::TEXT,
    u_rev.fullname::TEXT AS reviewed_by_name
  FROM public.volunteer_requests vr
  JOIN public.users u ON u.user_id = vr.user_id
  LEFT JOIN public.users u_rev ON u_rev.user_id = vr.reviewed_by
  ORDER BY vr.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_volunteer_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_volunteer_requests() TO authenticated;
