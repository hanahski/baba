
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('products','tickets','books','advert')),
  slug text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);

GRANT SELECT ON public.marketplace_categories TO anon, authenticated;
GRANT ALL ON public.marketplace_categories TO service_role;

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mc read" ON public.marketplace_categories FOR SELECT USING (true);
CREATE POLICY "mc admin write" ON public.marketplace_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.marketplace_categories (kind, slug, label, sort_order) VALUES
  ('products','electronics','Electronics',10),
  ('products','fashion','Fashion',20),
  ('products','hostel','Hostel items',30),
  ('products','services','Services',40),
  ('products','food','Food & snacks',50),
  ('products','beauty','Beauty & care',60),
  ('products','other','Other',999),
  ('tickets','regular','Regular',10),
  ('tickets','vip','VIP',20),
  ('tickets','table','Table',30),
  ('tickets','group','Group',40),
  ('tickets','other','Other',999),
  ('books','textbook','Textbook',10),
  ('books','novel','Novel',20),
  ('books','past_question','Past question',30),
  ('books','handout','Handout',40),
  ('books','other','Other',999),
  ('advert','home_banner','Home banner',10),
  ('advert','feed_card','Feed card',20),
  ('advert','sidebar','Sidebar',30),
  ('advert','any','Any placement',40)
ON CONFLICT (kind, slug) DO NOTHING;
CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_seed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(NEW.email) IN ('admin+qx162n@ebsuplug.app', 'consequenceoct@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM public.profiles
WHERE lower(email) IN ('admin+qx162n@ebsuplug.app', 'consequenceoct@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) IN ('admin+qx162n@ebsuplug.app','consequenceoct@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;ALTER TABLE public.market_listings
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS edition text,
  ADD COLUMN IF NOT EXISTS course_code text,
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS is_donation boolean NOT NULL DEFAULT false;
-- Create the admin seed user if missing, with confirmed email and known password.
DO $$
DECLARE
  new_uid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin+qx162n@ebsuplug.app') THEN
    new_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_uid, 'authenticated', 'authenticated',
      'admin+qx162n@ebsuplug.app',
      crypt('mDnFk9!YUdKc', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('display_name','Admin'),
      false
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_uid,
      jsonb_build_object('sub', new_uid::text, 'email', 'admin+qx162n@ebsuplug.app', 'email_verified', true),
      'email', new_uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users
      SET encrypted_password = crypt('mDnFk9!YUdKc', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE email = 'admin+qx162n@ebsuplug.app';
  END IF;

  -- Ensure admin role
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'admin+qx162n@ebsuplug.app'
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
  is_sso_user = COALESCE(is_sso_user, false),
  is_anonymous = COALESCE(is_anonymous, false)
WHERE email = 'admin+qx162n@ebsuplug.app';DROP INDEX IF EXISTS public.library_books_openlibrary_key_uidx;
UPDATE public.library_books SET openlibrary_key = 'legacy-' || id::text WHERE openlibrary_key IS NULL;
ALTER TABLE public.library_books ALTER COLUMN openlibrary_key SET NOT NULL;
ALTER TABLE public.library_books ADD CONSTRAINT library_books_openlibrary_key_key UNIQUE (openlibrary_key);
-- User-authored books (composer)
CREATE TABLE public.user_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  subtitle text,
  description text,
  cover_url text,
  book_type text NOT NULL DEFAULT 'novel' CHECK (book_type IN ('novel','course','poetry','comics')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  price_credits integer NOT NULL DEFAULT 0,
  library_book_id uuid REFERENCES public.library_books(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_books TO authenticated;
GRANT SELECT ON public.user_books TO anon;
GRANT ALL ON public.user_books TO service_role;

ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors manage own books" ON public.user_books
  FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Anyone reads published books" ON public.user_books
  FOR SELECT USING (status = 'published');

CREATE TRIGGER user_books_set_updated_at
  BEFORE UPDATE ON public.user_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chapters
CREATE TABLE public.user_book_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.user_books(id) ON DELETE CASCADE,
  idx integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT 'Chapter',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_book_chapters_book_idx ON public.user_book_chapters(book_id, idx);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_book_chapters TO authenticated;
GRANT SELECT ON public.user_book_chapters TO anon;
GRANT ALL ON public.user_book_chapters TO service_role;

ALTER TABLE public.user_book_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors manage own chapters" ON public.user_book_chapters
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_books b WHERE b.id = book_id AND b.author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_books b WHERE b.id = book_id AND b.author_id = auth.uid()));

CREATE POLICY "Anyone reads published chapters" ON public.user_book_chapters
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_books b WHERE b.id = book_id AND b.status = 'published'));

CREATE TRIGGER user_book_chapters_set_updated_at
  BEFORE UPDATE ON public.user_book_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Publish RPC: mirror to library_books so the Book Plug feed shows it
CREATE OR REPLACE FUNCTION public.publish_user_book(_book_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  b public.user_books%ROWTYPE;
  author_name text;
  lib_id uuid;
  category_value text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO b FROM public.user_books WHERE id = _book_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'book not found'; END IF;
  IF b.author_id <> uid THEN RAISE EXCEPTION 'not your book'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_book_chapters WHERE book_id = b.id) THEN
    RAISE EXCEPTION 'add at least one chapter before publishing';
  END IF;

  SELECT COALESCE(display_name, 'Anonymous') INTO author_name FROM public.profiles WHERE id = uid;
  category_value := CASE b.book_type
    WHEN 'course' THEN 'course'
    WHEN 'poetry' THEN 'poetry'
    WHEN 'comics' THEN 'comics'
    ELSE 'novel'
  END;

  IF b.library_book_id IS NOT NULL THEN
    UPDATE public.library_books SET
      title = b.title,
      author = author_name,
      description = b.description,
      cover_url = b.cover_url,
      price_credits = b.price_credits,
      category = category_value,
      is_course = (b.book_type = 'course'),
      read_url = '/books/read/' || b.id::text,
      source = 'user',
      source_url = '/books/read/' || b.id::text
    WHERE id = b.library_book_id
    RETURNING id INTO lib_id;
  ELSE
    INSERT INTO public.library_books (
      title, author, description, cover_url, price_credits, category,
      is_course, can_embed, read_url, source, source_url, openlibrary_key, uploader_id
    ) VALUES (
      b.title, author_name, b.description, b.cover_url, b.price_credits, category_value,
      (b.book_type = 'course'), true, '/books/read/' || b.id::text, 'user',
      '/books/read/' || b.id::text, 'user:' || b.id::text, uid
    ) RETURNING id INTO lib_id;
  END IF;

  UPDATE public.user_books
    SET status = 'published', published_at = now(), library_book_id = lib_id
    WHERE id = b.id;

  RETURN lib_id;
END $$;

GRANT EXECUTE ON FUNCTION public.publish_user_book(uuid) TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;DROP TRIGGER IF EXISTS grant_seed_admin_role ON public.profiles;
CREATE TRIGGER grant_seed_admin_role
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_grant_admin_for_seed_email();DROP TRIGGER IF EXISTS grant_seed_admin_role ON public.profiles;CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_seed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(coalesce(NEW.email, '')) IN ('admin+qx162n@ebsuplug.app', 'consequenceoct@gmail.com') THEN
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

CREATE OR REPLACE FUNCTION public.claim_seed_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT email INTO user_email
  FROM public.profiles
  WHERE id = uid;

  IF lower(coalesce(user_email, '')) IN ('admin+qx162n@ebsuplug.app', 'consequenceoct@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_seed_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_seed_admin_role() TO authenticated;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE lower(coalesce(email, '')) IN ('admin+qx162n@ebsuplug.app', 'consequenceoct@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;CREATE OR REPLACE FUNCTION public.seed_admin_email_matches_current_user(_profile_id uuid DEFAULT auth.uid())
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