
CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_seed_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'admin+qx162n@ebsuplug.app' THEN
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

-- Back-fill: if the seed admin already signed up before this trigger existed.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE email = 'admin+qx162n@ebsuplug.app'
ON CONFLICT (user_id, role) DO NOTHING;
