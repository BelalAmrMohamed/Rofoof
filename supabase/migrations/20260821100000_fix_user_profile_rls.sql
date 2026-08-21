-- Keep role protection out of the users UPDATE policy's recursive query.
CREATE OR REPLACE FUNCTION public.user_role_for(target_user_id UUID)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE user_id = target_user_id;
$$;

REVOKE ALL ON FUNCTION public.user_role_for(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_role_for(UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = public.user_role_for(auth.uid())
  );

GRANT SELECT, UPDATE ON TABLE public.users TO authenticated;