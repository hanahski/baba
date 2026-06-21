UPDATE public.profiles SET picture_url = NULL WHERE picture_url IS NOT NULL;

DROP POLICY IF EXISTS "courses auth insert" ON public.courses;

DELETE FROM public.courses c
USING public.departments d, public.faculties f
WHERE c.department_id = d.id
  AND d.faculty_id = f.id
  AND f.name <> 'Faculty of Science';

DELETE FROM public.courses c
USING public.departments d, public.faculties f
WHERE c.department_id = d.id
  AND d.faculty_id = f.id
  AND f.name = 'Faculty of Science';

WITH official_faculties(name) AS (
  VALUES
    ('Faculty of Science'),
    ('Faculty of Agricultural and Natural Resource Management'),
    ('Faculty of Health Sciences and Technology'),
    ('Faculty of Social Sciences and Humanities'),
    ('Faculty of Basic Medical Sciences'),
    ('Faculty of Clinical Medicine'),
    ('Faculty of Education'),
    ('Faculty of Management Sciences'),
    ('Faculty of Law')
)
DELETE FROM public.courses c
USING public.departments d, public.faculties f
WHERE c.department_id = d.id
  AND d.faculty_id = f.id
  AND NOT EXISTS (SELECT 1 FROM official_faculties of WHERE of.name = f.name);

WITH official_faculties(name) AS (
  VALUES
    ('Faculty of Science'),
    ('Faculty of Agricultural and Natural Resource Management'),
    ('Faculty of Health Sciences and Technology'),
    ('Faculty of Social Sciences and Humanities'),
    ('Faculty of Basic Medical Sciences'),
    ('Faculty of Clinical Medicine'),
    ('Faculty of Education'),
    ('Faculty of Management Sciences'),
    ('Faculty of Law')
)
DELETE FROM public.departments d
USING public.faculties f
WHERE d.faculty_id = f.id
  AND NOT EXISTS (SELECT 1 FROM official_faculties of WHERE of.name = f.name);

WITH official_faculties(name) AS (
  VALUES
    ('Faculty of Science'),
    ('Faculty of Agricultural and Natural Resource Management'),
    ('Faculty of Health Sciences and Technology'),
    ('Faculty of Social Sciences and Humanities'),
    ('Faculty of Basic Medical Sciences'),
    ('Faculty of Clinical Medicine'),
    ('Faculty of Education'),
    ('Faculty of Management Sciences'),
    ('Faculty of Law')
)
DELETE FROM public.faculties f
WHERE NOT EXISTS (SELECT 1 FROM official_faculties of WHERE of.name = f.name);

WITH science AS (SELECT id FROM public.faculties WHERE name = 'Faculty of Science'),
course_rows(department_name, code, title) AS (VALUES
  ('Applied Biology','BIO 101','GENERAL BIOLOGY I'),
  ('Applied Biology','BIO 191','GENERAL BIOLOGY PRACTICAL I'),
  ('Applied Biology','ICH 101','GENERAL CHEMISTRY (INORGANIC)'),
  ('Applied Biology','PHY 101','GENERAL PHYSICS I'),
  ('Applied Biology','MAT 101','ALGEBRA AND MATRICES'),
  ('Applied Biology','CSC 101','INTRODUCTION TO COMPUTER SCIENCE'),
  ('Applied Biology','BIO 102','GENERAL BIOLOGY II'),
  ('Applied Biology','BIO 201','INVERTEBRATE BIOLOGY'),
  ('Applied Biology','BIO 203','SEEDLESS PLANTS'),
  ('Applied Biology','BIO 211','GENERAL CELL BIOLOGY'),
  ('Applied Biology','BIO 202','VERTEBRATE BIOLOGY'),
  ('Applied Biology','BIO 204','SEED PLANTS'),
  ('Applied Biology','BIO 301','WRITING AND RESEARCH SKILLS FOR BIOLOGISTS'),
  ('Applied Biology','BIO 398','SIWES (6 MONTHS)'),
  ('Applied Biology','BIO 498','RESEARCH PROJECT'),
  ('Applied Microbiology','AMB 102','Introductory Microbiology'),
  ('Applied Microbiology','AMB 211','General Microbiology I'),
  ('Applied Microbiology','AMB 351','Microbial Physiology and Metabolism'),
  ('Applied Microbiology','AMB 361','Principles of Biotechnology'),
  ('Applied Microbiology','AMB 421','Pharmaceutical Microbiology'),
  ('Applied Microbiology','AMB 425','General Virology'),
  ('Applied Microbiology','AMB 498','Research Project'),
  ('Biochemistry','BCH 102','Introductory Biochemistry'),
  ('Biochemistry','BCH 201','General Biochemistry 1'),
  ('Biochemistry','BCH 202','General Biochemistry II'),
  ('Biochemistry','BCH 311','Metabolism of Carbohydrates'),
  ('Biochemistry','BCH 333','Enzymology'),
  ('Biochemistry','BCH 398','SIWES'),
  ('Biochemistry','BCH 498','Research Project'),
  ('Computer Science','CSC 101','Introduction to Computer Science'),
  ('Computer Science','CSC 102','Introduction to Computer Systems'),
  ('Computer Science','CSC 112','Problem Solving and Programming'),
  ('Computer Science','CSC 213','Sequential Programming and File Processing'),
  ('Computer Science','CSC 215','Low Level Programming'),
  ('Computer Science','CSC 221','Information Technology & Internet Concepts'),
  ('Computer Science','CSC 231','Data Structure & Algorithms'),
  ('Computer Science','CSC 204','Database Creation & Management'),
  ('Computer Science','CSC 216','Internet Programming'),
  ('Computer Science','CSC 311','Object Oriented Programming'),
  ('Computer Science','CSC 323','Operating System I'),
  ('Computer Science','CSC 325','Software Engineering'),
  ('Computer Science','CSC 398','SIWES'),
  ('Computer Science','CSC 498','Research Project'),
  ('Industrial Physics','PHY 101','General Physics I'),
  ('Industrial Physics','PHY 201','Mathematical Methods in Physics I'),
  ('Industrial Physics','PHY 211','Structure of Matter'),
  ('Industrial Physics','PHY 261','Elementary Modern Physics'),
  ('Industrial Physics','PHY 262','Electric Circuits and Electronics'),
  ('Industrial Physics','PHY 311','Solid State Physics'),
  ('Industrial Physics','PHY 398','SIWES'),
  ('Industrial Physics','PHY 491','Research Techniques')
), target_depts AS (
  SELECT d.id, d.name FROM public.departments d JOIN science s ON d.faculty_id = s.id
)
INSERT INTO public.courses (department_id, code, title)
SELECT d.id, cr.code, cr.title
FROM course_rows cr JOIN target_depts d ON d.name = cr.department_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.courses c WHERE c.department_id = d.id AND c.code = cr.code
);
-- 1. Ticket scan audit log (successful verifications only)
CREATE TABLE IF NOT EXISTS public.ticket_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  scanner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ticket_scans TO authenticated;
GRANT ALL ON public.ticket_scans TO service_role;

ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scans admin read" ON public.ticket_scans;
CREATE POLICY "scans admin read" ON public.ticket_scans
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "scans self read" ON public.ticket_scans;
CREATE POLICY "scans self read" ON public.ticket_scans
  FOR SELECT TO authenticated
  USING (scanner_id = auth.uid());

DROP POLICY IF EXISTS "scans insert auth" ON public.ticket_scans;
CREATE POLICY "scans insert auth" ON public.ticket_scans
  FOR INSERT TO authenticated
  WITH CHECK (scanner_id = auth.uid());

CREATE INDEX IF NOT EXISTS ticket_scans_ticket_at_idx ON public.ticket_scans (ticket_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS ticket_scans_scanner_at_idx ON public.ticket_scans (scanner_id, scanned_at DESC);

-- 2. verify_ticket: log successful scans and return buyer display name
CREATE OR REPLACE FUNCTION public.verify_ticket(_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t public.tickets%ROWTYPE;
  buyer_name text;
BEGIN
  SELECT * INTO t FROM public.tickets WHERE qr_token = _qr_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  SELECT display_name INTO buyer_name FROM public.profiles WHERE id = t.buyer_id;
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.ticket_scans (ticket_id, scanner_id)
    VALUES (t.id, auth.uid());
  END IF;
  RETURN jsonb_build_object(
    'valid', true,
    'ticket_id', t.id,
    'title', t.title,
    'buyer_id', t.buyer_id,
    'buyer', buyer_name
  );
END
$function$;

-- 3. Allow verified students to propose new courses (admins still allowed by existing policy)
DROP POLICY IF EXISTS "courses verified insert" ON public.courses;
CREATE POLICY "courses verified insert" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_verified = true
    )
  );

-- 4. Subject column for the universal report composer
ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS subject text;

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