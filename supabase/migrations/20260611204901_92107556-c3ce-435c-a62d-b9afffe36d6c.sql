
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
