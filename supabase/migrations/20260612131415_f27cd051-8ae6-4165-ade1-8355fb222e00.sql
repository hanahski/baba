DROP INDEX IF EXISTS public.library_books_openlibrary_key_uidx;
UPDATE public.library_books SET openlibrary_key = 'legacy-' || id::text WHERE openlibrary_key IS NULL;
ALTER TABLE public.library_books ALTER COLUMN openlibrary_key SET NOT NULL;
ALTER TABLE public.library_books ADD CONSTRAINT library_books_openlibrary_key_key UNIQUE (openlibrary_key);