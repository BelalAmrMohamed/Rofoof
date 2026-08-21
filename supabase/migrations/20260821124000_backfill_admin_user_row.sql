-- Backfill a public.users row for any auth.users that don't have one yet
-- (i.e. accounts that existed before the on_auth_user_created trigger was added).
-- Also ensures the admin email is promoted to 'admin'.

INSERT INTO public.users (user_id, email, fullname)
SELECT
  au.id,
  au.email,
  COALESCE(
    NULLIF(au.raw_user_meta_data ->> 'fullname', ''),
    NULLIF(au.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(au.raw_user_meta_data ->> 'name', ''),
    split_part(COALESCE(au.email, 'مستخدم'), '@', 1)
  )
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.user_id = au.id
);

-- Now promote the admin (safe to run even if it already was admin)
UPDATE public.users
SET role = 'admin'
WHERE lower(email) = lower('belalamrofficial@gmail.com');
