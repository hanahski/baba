
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
