GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_books TO authenticated;
GRANT ALL ON TABLE public.user_books TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_book_chapters TO authenticated;
GRANT ALL ON TABLE public.user_book_chapters TO service_role;