
CREATE TABLE public.admin_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  content text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_action_id uuid REFERENCES public.scheduled_admin_actions(id) ON DELETE SET NULL,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.admin_ai_messages TO authenticated;
GRANT ALL ON public.admin_ai_messages TO service_role;
ALTER TABLE public.admin_ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read own ai messages" ON public.admin_ai_messages
  FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid() AND public.is_admin(auth.uid()));
CREATE POLICY "admins mark own ai messages seen" ON public.admin_ai_messages
  FOR UPDATE TO authenticated
  USING (admin_user_id = auth.uid() AND public.is_admin(auth.uid()));

CREATE INDEX admin_ai_messages_admin_created_idx ON public.admin_ai_messages (admin_user_id, created_at DESC);

CREATE TABLE public.admin_ai_state (
  k text PRIMARY KEY,
  v jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_ai_state TO service_role;
ALTER TABLE public.admin_ai_state ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_ai_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_admin_actions;
ALTER TABLE public.admin_ai_messages REPLICA IDENTITY FULL;
ALTER TABLE public.scheduled_admin_actions REPLICA IDENTITY FULL;
