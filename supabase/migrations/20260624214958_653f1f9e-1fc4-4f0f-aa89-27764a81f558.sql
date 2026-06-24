REVOKE EXECUTE ON FUNCTION public.create_dm_group(text, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_dm_group_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_dm_group_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rename_dm_group(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_dm_group(text, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_dm_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_dm_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rename_dm_group(uuid, text) TO authenticated, service_role;