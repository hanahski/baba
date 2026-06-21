
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.table_name);
  END LOOP;
END $$;

GRANT SELECT ON public.ai_tools, public.banner_slides, public.blog_posts, public.courses,
  public.departments, public.faculties, public.library_books, public.library_courses,
  public.market_listings, public.marketplace_categories, public.news_articles,
  public.post_comment_likes, public.post_comments, public.post_likes, public.post_reposts,
  public.posts, public.quiz_questions, public.quizzes, public.study_notes, public.tickets,
  public.tool_prices, public.user_book_chapters, public.user_books
  TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
