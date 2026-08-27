-- Fix 42702 "column reference user_id is ambiguous" on
-- admin_get_all_volunteer_requests(). The RETURNS TABLE output column is
-- named user_id, which collides with vr.user_id / u.user_id inside the
-- function body. Qualify with the table alias explicitly (u.user_id was
-- already qualified, but PL/pgSQL still treats it as ambiguous against the
-- OUT parameter of the same name) by renaming the OUT parameter reference
-- via explicit column aliasing in the SELECT list.

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
    WHERE public.users.user_id = auth.uid()
      AND public.users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    vr.id,
    vr.status,
    vr.message,
    vr.rejection_note,
    vr.created_at,
    vr.reviewed_at,
    vr.user_id AS user_id,
    u.fullname::TEXT,
    u.email::TEXT,
    u_rev.fullname::TEXT AS reviewed_by_name
  FROM public.volunteer_requests vr
  JOIN public.users u ON u.user_id = vr.user_id
  LEFT JOIN public.users u_rev ON u_rev.user_id = vr.reviewed_by;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_volunteer_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_volunteer_requests() TO authenticated;
