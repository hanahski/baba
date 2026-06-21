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
DELETE FROM public.faculties WHERE name ILIKE 'Faculty of Engineering';