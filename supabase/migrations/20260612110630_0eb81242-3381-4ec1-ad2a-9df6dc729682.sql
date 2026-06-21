
-- Create the admin seed user if missing, with confirmed email and known password.
DO $$
DECLARE
  new_uid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin+qx162n@ebsuplug.app') THEN
    new_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_uid, 'authenticated', 'authenticated',
      'admin+qx162n@ebsuplug.app',
      crypt('mDnFk9!YUdKc', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('display_name','Admin'),
      false
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_uid,
      jsonb_build_object('sub', new_uid::text, 'email', 'admin+qx162n@ebsuplug.app', 'email_verified', true),
      'email', new_uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users
      SET encrypted_password = crypt('mDnFk9!YUdKc', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE email = 'admin+qx162n@ebsuplug.app';
  END IF;

  -- Ensure admin role
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'admin+qx162n@ebsuplug.app'
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
