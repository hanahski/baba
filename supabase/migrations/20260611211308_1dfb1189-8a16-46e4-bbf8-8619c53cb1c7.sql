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