CREATE OR REPLACE FUNCTION public.seed_admin_email_matches_current_user(_profile_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _profile_id = auth.uid()
    AND lower(coalesce(auth.jwt() ->> 'email', '')) IN ('admin+qx162n@ebsuplug.app', 'consequenceoct@gmail.com');
$$;

REVOKE ALL ON FUNCTION public.seed_admin_email_matches_current_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_admin_email_matches_current_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_seed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.seed_admin_email_matches_current_user(NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_grant_admin_for_seed_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_grant_admin_for_seed_email() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_seed_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  IF public.seed_admin_email_matches_current_user(uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_seed_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_seed_admin_role() TO authenticated;