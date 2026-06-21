CREATE OR REPLACE FUNCTION public.seed_admin_email_matches_current_user(_profile_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _profile_id = auth.uid()
    AND lower(coalesce(auth.jwt() ->> 'email', '')) IN ('admin+qx162n@ebsuplug.app', 'consequenceoct@gmail.com');
$$;

REVOKE ALL ON FUNCTION public.seed_admin_email_matches_current_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_admin_email_matches_current_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_seed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.seed_admin_email_matches_current_user(NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_grant_admin_for_seed_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_grant_admin_for_seed_email() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_seed_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  IF public.seed_admin_email_matches_current_user(uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_seed_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_seed_admin_role() TO authenticated;GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_books TO authenticated;
GRANT ALL ON TABLE public.user_books TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_book_chapters TO authenticated;
GRANT ALL ON TABLE public.user_book_chapters TO service_role;CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_name TEXT NOT NULL DEFAULT 'StudentsPlug Editorial',
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published posts"
ON public.blog_posts FOR SELECT
USING (published = true);

CREATE POLICY "Admins can manage all posts"
ON public.blog_posts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();CREATE SCHEMA IF NOT EXISTS public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO postgres;