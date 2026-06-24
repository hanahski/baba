REVOKE ALL ON public.dm_threads FROM PUBLIC;
REVOKE ALL ON public.dm_thread_members FROM PUBLIC;
REVOKE ALL ON public.dm_messages FROM PUBLIC;
REVOKE ALL ON public.dm_thread_reads FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_thread_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_thread_reads TO authenticated;
GRANT ALL ON public.dm_threads TO service_role;
GRANT ALL ON public.dm_thread_members TO service_role;
GRANT ALL ON public.dm_messages TO service_role;
GRANT ALL ON public.dm_thread_reads TO service_role;