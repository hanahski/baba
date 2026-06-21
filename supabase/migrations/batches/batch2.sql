ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_thread_reads;
CREATE TABLE IF NOT EXISTS public.scheduled_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  args jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  executed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_admin_actions_due_idx
  ON public.scheduled_admin_actions (run_at) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_admin_actions TO authenticated;
GRANT ALL ON public.scheduled_admin_actions TO service_role;

ALTER TABLE public.scheduled_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage scheduled actions"
  ON public.scheduled_admin_actions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_grant_credits(_user_id uuid, _amount int, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.profiles SET credits = credits + _amount WHERE id = _user_id RETURNING credits INTO bal;
  IF bal IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after, metadata)
    VALUES (_user_id, _amount, coalesce(_reason,'admin_grant'), bal, jsonb_build_object('by', auth.uid()));
  RETURN jsonb_build_object('ok', true, 'balance', bal);
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_post(_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  DELETE FROM public.posts WHERE id = _post_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_listing(_listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  DELETE FROM public.market_listings WHERE id = _listing_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_comment(_comment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  DELETE FROM public.post_comments WHERE id = _comment_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_find_user(_query text)
RETURNS TABLE(id uuid, display_name text, email text, status profile_status, rank_tier rank_tier, credits int, is_verified boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, display_name, email, status, rank_tier, credits, is_verified
  FROM public.profiles
  WHERE public.is_admin(auth.uid())
    AND (display_name ILIKE '%'||_query||'%' OR email ILIKE '%'||_query||'%' OR id::text = _query)
  LIMIT 10;
$$;
DO $$
DECLARE
  v_email   text := 'admin+qx162n@ebsuplug.app';
  v_pass    text := 'mDnFk9!YUdKc';
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, crypt(v_pass, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email', v_user_id::text, now(), now(), now());
  ELSE
    UPDATE auth.users
       SET encrypted_password = crypt(v_pass, gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now(),
           banned_until = NULL
     WHERE id = v_user_id;
  END IF;

  INSERT INTO public.profiles (id, email, display_name, status)
  VALUES (v_user_id, v_email, 'Admin', 'active'::profile_status)
  ON CONFLICT (id) DO UPDATE SET status = 'active'::profile_status, email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
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
ALTER TABLE public.scheduled_admin_actions
  ADD COLUMN IF NOT EXISTS repeat_every_seconds integer,
  ADD COLUMN IF NOT EXISTS max_runs integer,
  ADD COLUMN IF NOT EXISTS run_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_until timestamptz;
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
ALTER TABLE public.banner_slides ALTER COLUMN image_url DROP NOT NULL;
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

-- Enums
DO $$ BEGIN
  CREATE TYPE public.news_category AS ENUM ('ebsu','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.news_status AS ENUM ('draft','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- news_articles
CREATE TABLE IF NOT EXISTS public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.news_category NOT NULL DEFAULT 'ebsu',
  status public.news_status NOT NULL DEFAULT 'published',
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text,
  body text NOT NULL,
  image_url text,
  source_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_articles_cat_pub_idx
  ON public.news_articles (category, published_at DESC) WHERE status = 'published';

GRANT SELECT ON public.news_articles TO anon, authenticated;
GRANT ALL ON public.news_articles TO service_role;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read published news"
  ON public.news_articles FOR SELECT
  USING (status = 'published' OR public.is_admin(auth.uid()));

CREATE POLICY "admins manage news"
  ON public.news_articles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER news_articles_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ebsu_news_sources
CREATE TABLE IF NOT EXISTS public.ebsu_news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  weight int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebsu_news_sources TO authenticated;
GRANT ALL ON public.ebsu_news_sources TO service_role;
ALTER TABLE public.ebsu_news_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage sources"
  ON public.ebsu_news_sources FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER ebsu_news_sources_updated_at
  BEFORE UPDATE ON public.ebsu_news_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed starter sources
INSERT INTO public.ebsu_news_sources (url, label, weight) VALUES
  ('https://studentsdash.com', 'StudentsDash', 3),
  ('https://cmfanskills.com.ng', 'CMFAN Skills', 2),
  ('https://portal.ebsu.edu.ng', 'EBSU Portal', 3)
ON CONFLICT (url) DO NOTHING;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS picture_url text;