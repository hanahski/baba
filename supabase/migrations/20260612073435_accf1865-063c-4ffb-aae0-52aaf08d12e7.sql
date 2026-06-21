INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) IN ('admin+qx162n@ebsuplug.app','consequenceoct@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;