DROP TRIGGER IF EXISTS grant_seed_admin_role ON public.profiles;
CREATE TRIGGER grant_seed_admin_role
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_grant_admin_for_seed_email();