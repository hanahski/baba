
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
