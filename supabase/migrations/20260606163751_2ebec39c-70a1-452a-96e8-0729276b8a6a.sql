
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
