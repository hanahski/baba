REVOKE ALL ON public.dm_threads FROM anon;
REVOKE ALL ON public.dm_thread_members FROM anon;
REVOKE ALL ON public.dm_messages FROM anon;
REVOKE ALL ON public.dm_thread_reads FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_thread_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_thread_reads TO authenticated;
GRANT ALL ON public.dm_threads TO service_role;
GRANT ALL ON public.dm_thread_members TO service_role;
GRANT ALL ON public.dm_messages TO service_role;
GRANT ALL ON public.dm_thread_reads TO service_role;

DROP POLICY IF EXISTS "dt read" ON public.dm_threads;
DROP POLICY IF EXISTS "dt ins" ON public.dm_threads;
DROP POLICY IF EXISTS "dt upd" ON public.dm_threads;
DROP POLICY IF EXISTS "dtm read" ON public.dm_thread_members;
DROP POLICY IF EXISTS "dtm ins" ON public.dm_thread_members;
DROP POLICY IF EXISTS "dtm del" ON public.dm_thread_members;
DROP POLICY IF EXISTS "dm read" ON public.dm_messages;
DROP POLICY IF EXISTS "dm ins" ON public.dm_messages;
DROP POLICY IF EXISTS "dm del" ON public.dm_messages;
DROP POLICY IF EXISTS "dtr self" ON public.dm_thread_reads;

CREATE POLICY "dm_threads_participants_read"
ON public.dm_threads
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_a
  OR auth.uid() = user_b
  OR auth.uid() = owner_id
  OR public.is_dm_thread_member(id, auth.uid())
);

CREATE POLICY "dm_threads_participants_create"
ON public.dm_threads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    (is_group = false AND auth.uid() = user_a AND user_b IS NOT NULL)
    OR
    (is_group = true AND auth.uid() = owner_id)
  )
);

CREATE POLICY "dm_threads_participants_update"
ON public.dm_threads
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_a
  OR auth.uid() = user_b
  OR auth.uid() = owner_id
  OR public.is_dm_thread_member(id, auth.uid())
)
WITH CHECK (
  auth.uid() = user_a
  OR auth.uid() = user_b
  OR auth.uid() = owner_id
  OR public.is_dm_thread_member(id, auth.uid())
);

CREATE POLICY "dm_thread_members_members_read"
ON public.dm_thread_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_dm_thread_member(thread_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.dm_threads t
    WHERE t.id = dm_thread_members.thread_id
      AND t.owner_id = auth.uid()
  )
);

CREATE POLICY "dm_thread_members_group_owner_create"
ON public.dm_thread_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dm_threads t
    WHERE t.id = dm_thread_members.thread_id
      AND t.owner_id = auth.uid()
      AND t.is_group = true
  )
);

CREATE POLICY "dm_thread_members_self_or_owner_delete"
ON public.dm_thread_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.dm_threads t
    WHERE t.id = dm_thread_members.thread_id
      AND t.owner_id = auth.uid()
  )
);

CREATE POLICY "dm_messages_participants_read"
ON public.dm_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dm_threads t
    WHERE t.id = dm_messages.thread_id
      AND (
        t.user_a = auth.uid()
        OR t.user_b = auth.uid()
        OR t.owner_id = auth.uid()
        OR public.is_dm_thread_member(t.id, auth.uid())
      )
  )
);

CREATE POLICY "dm_messages_participants_create"
ON public.dm_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.dm_threads t
    WHERE t.id = dm_messages.thread_id
      AND (
        t.user_a = auth.uid()
        OR t.user_b = auth.uid()
        OR t.owner_id = auth.uid()
        OR public.is_dm_thread_member(t.id, auth.uid())
      )
  )
);

CREATE POLICY "dm_messages_sender_delete"
ON public.dm_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "dm_thread_reads_self_manage"
ON public.dm_thread_reads
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.dm_threads t
    WHERE t.id = dm_thread_reads.thread_id
      AND (
        t.user_a = auth.uid()
        OR t.user_b = auth.uid()
        OR t.owner_id = auth.uid()
        OR public.is_dm_thread_member(t.id, auth.uid())
      )
  )
);