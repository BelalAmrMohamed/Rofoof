-- ============================================================
-- Issue tracker fixes (1, 2) + Volunteer request feature
-- ============================================================
-- 1. Feedback has no review path
--    Add a SECURITY DEFINER RPC (matching admin_get_all_submissions)
--    that lets only admins read the feedback table.
--
-- 2. Admins cannot edit or delete existing mosques/books
--    Add UPDATE/DELETE RLS policies on mosques, books, mosque_books
--    scoped to role = 'admin', using the existing user_role_for() helper.
--
-- 3. New feature: non-volunteers can request to become a volunteer
--    from the Submit page. Admins can accept/decline the request from
--    the Requests page (mirrors the existing submission-review flow).
-- ============================================================


-- ── 1. Feedback admin read ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_all_feedback()
RETURNS SETOF public.feedback
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
  SELECT f.* FROM public.feedback f ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_feedback() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_feedback() TO authenticated;

-- Join submitter display info (fullname) for feedback rows with a user_id.
-- Returned as a view-shaped RPC so the client gets everything in one call.
CREATE OR REPLACE FUNCTION public.admin_get_all_feedback_with_submitter()
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
    WHERE user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT f.id, f.user_id, f.message, f.email, f.rating, f.created_at, u.fullname
  FROM public.feedback f
  LEFT JOIN public.users u ON u.user_id = f.user_id
  ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_feedback_with_submitter() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_feedback_with_submitter() TO authenticated;


-- ── 2. Admin UPDATE/DELETE on mosques, books, mosque_books ──────

GRANT UPDATE, DELETE ON public.mosques, public.books, public.mosque_books TO authenticated;

DROP POLICY IF EXISTS "Admins can update mosques" ON public.mosques;
CREATE POLICY "Admins can update mosques"
  ON public.mosques FOR UPDATE TO authenticated
  USING (public.user_role_for(auth.uid()) = 'admin')
  WITH CHECK (public.user_role_for(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can delete mosques" ON public.mosques;
CREATE POLICY "Admins can delete mosques"
  ON public.mosques FOR DELETE TO authenticated
  USING (public.user_role_for(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can update books" ON public.books;
CREATE POLICY "Admins can update books"
  ON public.books FOR UPDATE TO authenticated
  USING (public.user_role_for(auth.uid()) = 'admin')
  WITH CHECK (public.user_role_for(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can delete books" ON public.books;
CREATE POLICY "Admins can delete books"
  ON public.books FOR DELETE TO authenticated
  USING (public.user_role_for(auth.uid()) = 'admin');

-- mosque_books already has an admin UPDATE path via admin_review_submission,
-- but that RPC only touches status/rejection/review fields. Admins also need
-- to edit arbitrary fields (edition/publisher) and delete entries directly,
-- so add general admin UPDATE/DELETE policies here (distinct from the
-- volunteer "own pending submission" policy already in place).
DROP POLICY IF EXISTS "Admins can update any mosque_books entry" ON public.mosque_books;
CREATE POLICY "Admins can update any mosque_books entry"
  ON public.mosque_books FOR UPDATE TO authenticated
  USING (public.user_role_for(auth.uid()) = 'admin')
  WITH CHECK (public.user_role_for(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can delete mosque_books entries" ON public.mosque_books;
CREATE POLICY "Admins can delete mosque_books entries"
  ON public.mosque_books FOR DELETE TO authenticated
  USING (public.user_role_for(auth.uid()) = 'admin');

-- mosque_images: deleting a mosque cascades here (ON DELETE CASCADE already
-- set on mosque_id), but an admin editing a mosque may also want to clear
-- its images directly. Add an explicit admin DELETE policy for completeness.
DROP POLICY IF EXISTS "Admins can delete any mosque image" ON public.mosque_images;
CREATE POLICY "Admins can delete any mosque image"
  ON public.mosque_images FOR DELETE TO authenticated
  USING (public.user_role_for(auth.uid()) = 'admin');


-- ── 3. Volunteer requests ────────────────────────────────────────
-- A visitor asks (from the Submit page) to become a volunteer. Admins
-- accept or decline the request from the Requests page. Mirrors the
-- mosque_books review pattern: a status enum, a SECURITY DEFINER admin
-- review RPC that also promotes the user's role on acceptance, and RLS
-- limited to "insert your own" / "admins see and act on all".

CREATE TABLE IF NOT EXISTS public.volunteer_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  message         TEXT,                                   -- optional note from the requester
  status          submission_status NOT NULL DEFAULT 'pending',
  rejection_note  TEXT,
  reviewed_by     UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- A user can only have one open (pending) request at a time. A plain
-- UNIQUE(user_id, status) would also block ever having more than one
-- approved/rejected row per user, so use a partial unique index that only
-- applies while status = 'pending' — history can repeat freely.
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_volunteer_request_per_user
  ON public.volunteer_requests (user_id)
  WHERE status = 'pending';

CREATE TRIGGER volunteer_requests_updated_at
  BEFORE UPDATE ON public.volunteer_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_volunteer_requests_status ON public.volunteer_requests (status);
CREATE INDEX IF NOT EXISTS idx_volunteer_requests_user    ON public.volunteer_requests (user_id);

ALTER TABLE public.volunteer_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.volunteer_requests TO authenticated;

-- A logged-in visitor/volunteer can submit a request for themselves.
DROP POLICY IF EXISTS "Users can submit their own volunteer request" ON public.volunteer_requests;
CREATE POLICY "Users can submit their own volunteer request"
  ON public.volunteer_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Users can see their own requests (to show status on their side, e.g. Submit page).
DROP POLICY IF EXISTS "Users can view their own volunteer requests" ON public.volunteer_requests;
CREATE POLICY "Users can view their own volunteer requests"
  ON public.volunteer_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can see all requests.
DROP POLICY IF EXISTS "Admins can view all volunteer requests" ON public.volunteer_requests;
CREATE POLICY "Admins can view all volunteer requests"
  ON public.volunteer_requests FOR SELECT TO authenticated
  USING (public.user_role_for(auth.uid()) = 'admin');

-- Admin accept/decline action — SECURITY DEFINER, mirrors admin_review_submission.
-- On acceptance, also promotes the requesting user's role to 'volunteer'
-- (unless they are already an admin, in which case role is left untouched).
CREATE OR REPLACE FUNCTION public.admin_review_volunteer_request(
  p_request_id      UUID,
  p_status          submission_status,
  p_rejection_note  TEXT DEFAULT NULL
)
RETURNS public.volunteer_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.volunteer_requests;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'p_status must be approved or rejected';
  END IF;

  UPDATE public.volunteer_requests
  SET status = p_status,
      rejection_note = p_rejection_note,
      reviewed_by = auth.uid(),
      reviewed_at = NOW()
  WHERE id = p_request_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No volunteer_requests row with id %', p_request_id;
  END IF;

  IF p_status = 'approved' THEN
    UPDATE public.users
    SET role = 'volunteer'
    WHERE user_id = v_row.user_id
      AND role = 'visitor';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_volunteer_request(UUID, submission_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_volunteer_request(UUID, submission_status, TEXT) TO authenticated;

-- Admin read helper that also returns the requester's display info, for the
-- Requests page (mirrors admin_submissions_view / admin_get_all_submissions).
CREATE OR REPLACE FUNCTION public.admin_get_all_volunteer_requests()
RETURNS TABLE (
  id              UUID,
  status          submission_status,
  message         TEXT,
  rejection_note  TEXT,
  created_at      TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  user_id         UUID,
  fullname        VARCHAR,
  email           VARCHAR,
  reviewed_by_name VARCHAR
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
    u.user_id, u.fullname, u.email,
    u_rev.fullname AS reviewed_by_name
  FROM public.volunteer_requests vr
  JOIN public.users u ON u.user_id = vr.user_id
  LEFT JOIN public.users u_rev ON u_rev.user_id = vr.reviewed_by
  ORDER BY vr.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_volunteer_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_volunteer_requests() TO authenticated;

-- Pending count helper, mirroring admin_get_pending_count, for a possible
-- future badge on the Requests page tab.
CREATE OR REPLACE FUNCTION public.admin_get_pending_volunteer_request_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.volunteer_requests
  WHERE status = 'pending';

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_pending_volunteer_request_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_pending_volunteer_request_count() TO authenticated;