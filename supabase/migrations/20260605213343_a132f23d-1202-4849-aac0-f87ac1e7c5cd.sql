
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
