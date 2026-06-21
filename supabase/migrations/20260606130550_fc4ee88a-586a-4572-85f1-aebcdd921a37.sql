
CREATE TABLE public.ai_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Sparkles',
  category text NOT NULL DEFAULT 'edu',
  kind text NOT NULL CHECK (kind IN ('ai_prompt','ai_image','api_call')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','rejected','archived')),
  brief text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_tools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tools TO authenticated;
GRANT ALL ON public.ai_tools TO service_role;

ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads approved ai_tools" ON public.ai_tools
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR public.is_admin(auth.uid()));

CREATE POLICY "admins manage ai_tools" ON public.ai_tools
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_ai_tools_updated_at BEFORE UPDATE ON public.ai_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
