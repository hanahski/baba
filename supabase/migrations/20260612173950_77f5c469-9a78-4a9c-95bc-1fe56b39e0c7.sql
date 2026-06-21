CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_seed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(coalesce(NEW.email, '')) IN ('admin+qx162n@ebsuplug.app', 'consequenceoct@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_admin_for_seed_email ON public.profiles;
CREATE TRIGGER trg_auto_grant_admin_for_seed_email
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_grant_admin_for_seed_email();

CREATE OR REPLACE FUNCTION public.claim_seed_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT email INTO user_email
  FROM public.profiles
  WHERE id = uid;

  IF lower(coalesce(user_email, '')) IN ('admin+qx162n@ebsuplug.app', 'consequenceoct@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_seed_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_seed_admin_role() TO authenticated;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE lower(coalesce(email, '')) IN ('admin+qx162n@ebsuplug.app', 'consequenceoct@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;