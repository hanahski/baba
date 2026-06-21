-- Storage RLS policies for app buckets.
-- Buckets: banners, post-images, post-media, covers, book-covers, blog-images, tickets, post-files, book-pdfs

-- Public/anon read access (works once buckets are public; harmless otherwise) for display buckets
CREATE POLICY "Public read display buckets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('banners','post-images','post-media','covers','book-covers','blog-images','book-pdfs'));

-- Authenticated read for sensitive buckets (signed URLs)
CREATE POLICY "Authenticated read private buckets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN ('tickets','post-files'));

-- Authenticated users can upload to any app bucket
CREATE POLICY "Authenticated upload app buckets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('banners','post-images','post-media','covers','book-covers','blog-images','tickets','post-files','book-pdfs'));

-- Authenticated users can update/replace their own uploads
CREATE POLICY "Authenticated update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('banners','post-images','post-media','covers','book-covers','blog-images','tickets','post-files','book-pdfs') AND owner = auth.uid())
WITH CHECK (bucket_id IN ('banners','post-images','post-media','covers','book-covers','blog-images','tickets','post-files','book-pdfs'));

-- Authenticated users can delete their own uploads
CREATE POLICY "Authenticated delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('banners','post-images','post-media','covers','book-covers','blog-images','tickets','post-files','book-pdfs') AND owner = auth.uid());CREATE OR REPLACE FUNCTION public.claim_ad_reward(_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  earned_today int;
  new_bal int;
  daily_cap int := 200;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _amount NOT IN (10, 25, 50) THEN RAISE EXCEPTION 'invalid reward amount'; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO earned_today
  FROM public.credit_transactions
  WHERE user_id = uid AND reason = 'ad_reward' AND created_at::date = current_date;

  IF earned_today + _amount > daily_cap THEN
    RAISE EXCEPTION 'DAILY_LIMIT_REACHED';
  END IF;

  UPDATE public.profiles SET credits = credits + _amount WHERE id = uid RETURNING credits INTO new_bal;
  IF new_bal IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after, metadata)
  VALUES (uid, _amount, 'ad_reward', new_bal, jsonb_build_object('source', 'reward_ad'));

  RETURN jsonb_build_object('ok', true, 'credits_added', _amount, 'balance', new_bal, 'earned_today', earned_today + _amount, 'daily_cap', daily_cap);
END $$;

REVOKE ALL ON FUNCTION public.claim_ad_reward(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_ad_reward(integer) TO authenticated;
CREATE TABLE public.tool_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_key text UNIQUE NOT NULL,
  label text,
  cost integer NOT NULL DEFAULT 0 CHECK (cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tool_prices TO authenticated, anon;
GRANT ALL ON public.tool_prices TO service_role;
ALTER TABLE public.tool_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tool prices" ON public.tool_prices FOR SELECT USING (true);
CREATE POLICY "Admins manage tool prices" ON public.tool_prices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tool_prices_updated_at BEFORE UPDATE ON public.tool_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ai_tools ADD COLUMN IF NOT EXISTS credits_cost integer NOT NULL DEFAULT 0 CHECK (credits_cost >= 0);

INSERT INTO public.tool_prices (tool_key, label, cost) VALUES
  ('/tools/pdf', 'Text → PDF', 10),
  ('/tools/ocr', 'Image → Text', 10),
  ('/tools/audio-convert', 'Audio Converter', 0),
  ('/tools/qr', 'QR / Ticket Scanner', 0),
  ('/tools/vocal-split', 'Vocal Remover', 0),
  ('/tools/voice-clone', 'Voice Cloning', 0),
  ('/tools/notif-clean', 'iPhone Notification Remover', 0),
  ('/tools/youtube', 'YouTube Downloader', 0),
  ('/tools/calculator', 'Scientific Calculator', 0),
  ('/tools/planets', 'Planet Explorer', 0),
  ('/tools/dictionary', 'Dictionary', 0),
  ('/tools/vnum1', 'Virtual Number', 0),
  ('/tools/vnum2', 'Virtual Number 2', 0),
  ('/tools/vnum3', 'Virtual Number 3', 0)
ON CONFLICT (tool_key) DO NOTHING;

-- Seed Faculty of Engineering (idempotent)
INSERT INTO public.faculties (name, icon)
SELECT 'Faculty of Engineering', '⚙️'
WHERE NOT EXISTS (SELECT 1 FROM public.faculties WHERE name = 'Faculty of Engineering');

WITH f AS (SELECT id FROM public.faculties WHERE name = 'Faculty of Engineering'),
deps(name) AS (VALUES
  ('Agricultural & Bioresources Engineering'),
  ('Chemical Engineering'),
  ('Civil Engineering'),
  ('Computer Engineering'),
  ('Electrical / Electronic Engineering'),
  ('Mechanical Engineering'),
  ('Mechatronics Engineering'),
  ('Petroleum Engineering')
)
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, deps.name FROM f, deps
WHERE NOT EXISTS (
  SELECT 1 FROM public.departments d WHERE d.faculty_id = f.id AND d.name = deps.name
);

-- Courses per department
WITH dep AS (
  SELECT d.id, d.name FROM public.departments d
  JOIN public.faculties f ON f.id = d.faculty_id
  WHERE f.name = 'Faculty of Engineering'
),
courses(dep_name, code, title) AS (VALUES
  ('Agricultural & Bioresources Engineering','ABE 101','Introduction to Agricultural Engineering'),
  ('Agricultural & Bioresources Engineering','ABE 201','Engineering Drawing'),
  ('Agricultural & Bioresources Engineering','ABE 202','Applied Mechanics'),
  ('Agricultural & Bioresources Engineering','ABE 301','Farm Power & Machinery'),
  ('Agricultural & Bioresources Engineering','ABE 302','Soil & Water Engineering'),
  ('Agricultural & Bioresources Engineering','ABE 303','Post-Harvest Engineering'),
  ('Agricultural & Bioresources Engineering','ABE 401','Bioresources Processing Engineering'),
  ('Agricultural & Bioresources Engineering','ABE 402','Project'),
  ('Chemical Engineering','CHE 201','Introduction to Chemical Engineering'),
  ('Chemical Engineering','CHE 202','Material & Energy Balances'),
  ('Chemical Engineering','CHE 301','Chemical Engineering Thermodynamics'),
  ('Chemical Engineering','CHE 302','Fluid Mechanics'),
  ('Chemical Engineering','CHE 303','Heat Transfer'),
  ('Chemical Engineering','CHE 304','Mass Transfer'),
  ('Chemical Engineering','CHE 401','Chemical Reaction Engineering'),
  ('Chemical Engineering','CHE 402','Process Control'),
  ('Chemical Engineering','CHE 403','Project'),
  ('Civil Engineering','CVE 201','Engineering Mechanics'),
  ('Civil Engineering','CVE 202','Strength of Materials'),
  ('Civil Engineering','CVE 301','Structural Analysis I'),
  ('Civil Engineering','CVE 302','Soil Mechanics'),
  ('Civil Engineering','CVE 303','Hydraulics'),
  ('Civil Engineering','CVE 304','Highway Engineering'),
  ('Civil Engineering','CVE 401','Reinforced Concrete Design'),
  ('Civil Engineering','CVE 402','Foundation Engineering'),
  ('Civil Engineering','CVE 403','Project'),
  ('Computer Engineering','CPE 201','Introduction to Computer Engineering'),
  ('Computer Engineering','CPE 202','Digital Logic Design'),
  ('Computer Engineering','CPE 301','Computer Architecture'),
  ('Computer Engineering','CPE 302','Microprocessors & Assembly Language'),
  ('Computer Engineering','CPE 303','Data Structures'),
  ('Computer Engineering','CPE 304','Computer Networks'),
  ('Computer Engineering','CPE 401','Embedded Systems'),
  ('Computer Engineering','CPE 402','Digital Signal Processing'),
  ('Computer Engineering','CPE 403','Project'),
  ('Electrical / Electronic Engineering','EEE 201','Circuit Theory I'),
  ('Electrical / Electronic Engineering','EEE 202','Electrical Machines I'),
  ('Electrical / Electronic Engineering','EEE 301','Electromagnetic Fields & Waves'),
  ('Electrical / Electronic Engineering','EEE 302','Electronics I'),
  ('Electrical / Electronic Engineering','EEE 303','Measurements & Instrumentation'),
  ('Electrical / Electronic Engineering','EEE 304','Power Systems I'),
  ('Electrical / Electronic Engineering','EEE 401','Control Systems'),
  ('Electrical / Electronic Engineering','EEE 402','Communication Principles'),
  ('Electrical / Electronic Engineering','EEE 403','Project'),
  ('Mechanical Engineering','MEE 201','Engineering Drawing & Graphics'),
  ('Mechanical Engineering','MEE 202','Engineering Mechanics (Dynamics)'),
  ('Mechanical Engineering','MEE 301','Thermodynamics I'),
  ('Mechanical Engineering','MEE 302','Mechanics of Machines'),
  ('Mechanical Engineering','MEE 303','Strength of Materials'),
  ('Mechanical Engineering','MEE 304','Manufacturing Technology'),
  ('Mechanical Engineering','MEE 401','Machine Design'),
  ('Mechanical Engineering','MEE 402','Heat & Mass Transfer'),
  ('Mechanical Engineering','MEE 403','Project'),
  ('Mechatronics Engineering','MCE 201','Introduction to Mechatronics'),
  ('Mechatronics Engineering','MCE 301','Sensors & Actuators'),
  ('Mechatronics Engineering','MCE 302','Microcontroller Systems'),
  ('Mechatronics Engineering','MCE 303','Robotics I'),
  ('Mechatronics Engineering','MCE 401','Industrial Automation'),
  ('Mechatronics Engineering','MCE 402','Mechatronic System Design'),
  ('Mechatronics Engineering','MCE 403','Project'),
  ('Petroleum Engineering','PTE 201','Introduction to Petroleum Engineering'),
  ('Petroleum Engineering','PTE 301','Reservoir Engineering I'),
  ('Petroleum Engineering','PTE 302','Drilling Engineering I'),
  ('Petroleum Engineering','PTE 303','Production Engineering I'),
  ('Petroleum Engineering','PTE 401','Petroleum Economics'),
  ('Petroleum Engineering','PTE 402','Natural Gas Engineering'),
  ('Petroleum Engineering','PTE 403','Project')
)
INSERT INTO public.courses (department_id, code, title)
SELECT dep.id, courses.code, courses.title
FROM courses JOIN dep ON dep.name = courses.dep_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.courses c WHERE c.department_id = dep.id AND c.code = courses.code
);
-- EBSU does not offer a Faculty of Engineering. Remove the seeded
-- Engineering faculty along with its departments and courses to keep
-- the catalogue aligned with ebsu.edu.ng/faculties.
DELETE FROM public.courses
 WHERE department_id IN (
   SELECT d.id FROM public.departments d
   JOIN public.faculties f ON f.id = d.faculty_id
   WHERE f.name ILIKE 'Faculty of Engineering'
 );
DELETE FROM public.departments
 WHERE faculty_id IN (
   SELECT id FROM public.faculties WHERE name ILIKE 'Faculty of Engineering'
 );
DELETE FROM public.faculties WHERE name ILIKE 'Faculty of Engineering';UPDATE public.profiles SET picture_url = NULL WHERE picture_url IS NOT NULL;

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
