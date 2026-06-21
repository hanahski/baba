
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.rank_tier AS ENUM ('newbie','normal','active','legend','pro','sure_plug');
CREATE TYPE public.profile_status AS ENUM ('active','blocked','deactivated');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Student',
  email TEXT,
  avatar_key TEXT NOT NULL DEFAULT 'default',
  cover_url TEXT,
  department_id UUID,
  bio TEXT,
  rank_tier public.rank_tier NOT NULL DEFAULT 'newbie',
  rank_step INT NOT NULL DEFAULT 1,
  approved_post_count INT NOT NULL DEFAULT 0,
  show_online BOOLEAN NOT NULL DEFAULT true,
  credits INT NOT NULL DEFAULT 0,
  seen_welcome BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  status public.profile_status NOT NULL DEFAULT 'active',
  referral_code TEXT UNIQUE,
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  share_location BOOLEAN NOT NULL DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  current_zone TEXT,
  location_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS cover_video_url text,
  ADD COLUMN IF NOT EXISTS academic_level text,
  ADD COLUMN IF NOT EXISTS is_star boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_legit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sure_plug boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tool_consent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.faculties (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, icon text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.departments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), faculty_id uuid REFERENCES public.faculties(id) ON DELETE CASCADE, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE, code text NOT NULL, title text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, post_type text NOT NULL DEFAULT 'text', title text, body text, course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL, file_url text, file_name text, image_url text, media_url text, media_type text, link_url text, view_count integer NOT NULL DEFAULT 0, like_count integer NOT NULL DEFAULT 0, comment_count integer NOT NULL DEFAULT 0, repost_count integer NOT NULL DEFAULT 0, is_official boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.post_likes (post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (post_id, user_id));
CREATE TABLE IF NOT EXISTS public.post_reposts (post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (post_id, user_id));
CREATE TABLE IF NOT EXISTS public.post_comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE, author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE, body text NOT NULL, like_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.post_comment_likes (comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (comment_id, user_id));
CREATE TABLE IF NOT EXISTS public.dm_threads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_a uuid REFERENCES auth.users(id) ON DELETE CASCADE, user_b uuid REFERENCES auth.users(id) ON DELETE CASCADE, is_group boolean NOT NULL DEFAULT false, name text, photo_url text, owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, last_message_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.dm_thread_members (thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role text NOT NULL DEFAULT 'member', created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (thread_id, user_id));
CREATE TABLE IF NOT EXISTS public.dm_thread_reads (user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE, last_read_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, thread_id));
CREATE TABLE IF NOT EXISTS public.dm_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.hide_seek_pings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, message text, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.banner_slides (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, subtitle text, image_url text NOT NULL, link_url text, is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.tickets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, title text NOT NULL, description text, photo_url text, price numeric NOT NULL DEFAULT 0, pay_mode text NOT NULL DEFAULT 'credits', contact text, is_sold boolean NOT NULL DEFAULT false, buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, qr_token text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.ticket_purchases (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE, buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, price_paid numeric NOT NULL DEFAULT 0, qr_token text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.library_books (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, author text, category text NOT NULL DEFAULT 'other', cover_url text, file_url text, description text, price_credits integer NOT NULL DEFAULT 0, uploader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.library_book_purchases (book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (book_id, user_id));
CREATE TABLE IF NOT EXISTS public.market_listings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, title text NOT NULL, description text, price numeric NOT NULL DEFAULT 0, category text NOT NULL DEFAULT 'other', listing_kind text NOT NULL DEFAULT 'product', photos jsonb NOT NULL DEFAULT '[]'::jsonb, cover_url text, contact text, is_sold boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.saved_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, item_type text NOT NULL, item_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, item_type, item_id));
CREATE TABLE IF NOT EXISTS public.study_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL, title text NOT NULL, body text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.note_views (note_id uuid NOT NULL REFERENCES public.study_notes(id) ON DELETE CASCADE, viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (note_id, viewer_id));
CREATE TABLE IF NOT EXISTS public.badge_applications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, badge text NOT NULL, reason text, reg_number text, contact text, status text NOT NULL DEFAULT 'pending', reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.user_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, category text NOT NULL, reason text, target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, target_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL, target_listing_id uuid REFERENCES public.market_listings(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'pending', reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.referrals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, invitee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.content_removals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, reason text, acknowledged boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.quizzes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE, title text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.quiz_questions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE, prompt text NOT NULL, options jsonb NOT NULL DEFAULT '[]'::jsonb, correct_index integer NOT NULL DEFAULT 0, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.quiz_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, score integer NOT NULL DEFAULT 0, total integer NOT NULL DEFAULT 0, answers jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.ocr_corrections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, original_text text, corrected_text text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.tool_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, tool text NOT NULL, file_name text, file_size_bytes integer, settings jsonb, duration_ms integer, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.library_courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text, cover_url text, category text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.library_course_progress (course_id uuid NOT NULL REFERENCES public.library_courses(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, progress jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (course_id, user_id));

GRANT SELECT ON public.faculties, public.departments, public.courses, public.posts, public.post_comments, public.banner_slides, public.tickets, public.library_books, public.market_listings, public.study_notes, public.quizzes, public.quiz_questions, public.library_courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses, public.posts, public.post_comments, public.tickets, public.market_listings, public.study_notes, public.quizzes, public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.post_likes, public.post_reposts, public.post_comment_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_threads, public.dm_thread_members, public.dm_thread_reads, public.dm_messages, public.hide_seek_pings TO authenticated;
GRANT SELECT, INSERT ON public.ticket_purchases, public.library_book_purchases, public.note_views, public.referrals, public.quiz_attempts, public.ocr_corrections, public.tool_jobs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faculties, public.departments, public.banner_slides, public.library_books, public.library_courses TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.badge_applications, public.user_reports, public.library_course_progress TO authenticated;
GRANT SELECT, UPDATE ON public.content_removals TO authenticated;
GRANT ALL ON public.faculties, public.departments, public.courses, public.posts, public.post_likes, public.post_reposts, public.post_comments, public.post_comment_likes, public.dm_threads, public.dm_thread_members, public.dm_thread_reads, public.dm_messages, public.hide_seek_pings, public.banner_slides, public.tickets, public.ticket_purchases, public.library_books, public.library_book_purchases, public.market_listings, public.saved_items, public.study_notes, public.note_views, public.badge_applications, public.user_reports, public.referrals, public.content_removals, public.quizzes, public.quiz_questions, public.quiz_attempts, public.ocr_corrections, public.tool_jobs, public.library_courses, public.library_course_progress TO service_role;

ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_thread_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hide_seek_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_book_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_removals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faculties read" ON public.faculties FOR SELECT USING (true);
CREATE POLICY "faculties admin" ON public.faculties FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "departments read" ON public.departments FOR SELECT USING (true);
CREATE POLICY "departments admin" ON public.departments FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "courses read" ON public.courses FOR SELECT USING (true);
CREATE POLICY "courses auth insert" ON public.courses FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "courses admin" ON public.courses FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "posts read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts insert own" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts update own" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_id OR has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = author_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "posts delete own" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id OR has_role(auth.uid(),'admin'));
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "pl read" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "pl ins" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pl del" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pr read" ON public.post_reposts FOR SELECT USING (true);
CREATE POLICY "pr ins" ON public.post_reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pr del" ON public.post_reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pc read" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "pc ins" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "pc del" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "pcl read" ON public.post_comment_likes FOR SELECT USING (true);
CREATE POLICY "pcl ins" ON public.post_comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pcl del" ON public.post_comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "dt ins" ON public.dm_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dt upd" ON public.dm_threads FOR UPDATE TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b OR auth.uid() = owner_id);
CREATE POLICY "dtm ins" ON public.dm_thread_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dtm del" ON public.dm_thread_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = thread_id AND t.owner_id = auth.uid()));
CREATE POLICY "dtr self" ON public.dm_thread_reads FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "dm ins" ON public.dm_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "dm del" ON public.dm_messages FOR DELETE TO authenticated USING (sender_id = auth.uid());
CREATE POLICY "hsp read" ON public.hide_seek_pings FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "hsp ins" ON public.hide_seek_pings FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "hsp upd" ON public.hide_seek_pings FOR UPDATE TO authenticated USING (receiver_id = auth.uid()) WITH CHECK (receiver_id = auth.uid());
CREATE POLICY "bs read" ON public.banner_slides FOR SELECT USING (true);
CREATE POLICY "bs admin" ON public.banner_slides FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "tk read" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "tk ins" ON public.tickets FOR INSERT TO authenticated WITH CHECK (uploader_id = auth.uid());
CREATE POLICY "tk upd" ON public.tickets FOR UPDATE TO authenticated USING (uploader_id = auth.uid() OR buyer_id = auth.uid() OR has_role(auth.uid(),'admin')) WITH CHECK (uploader_id = auth.uid() OR buyer_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "tk del" ON public.tickets FOR DELETE TO authenticated USING (uploader_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "tp read" ON public.ticket_purchases FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "tp ins" ON public.ticket_purchases FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "lb read" ON public.library_books FOR SELECT USING (true);
CREATE POLICY "lb admin" ON public.library_books FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "lbp read" ON public.library_book_purchases FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "lbp ins" ON public.library_book_purchases FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ml read" ON public.market_listings FOR SELECT USING (true);
CREATE POLICY "ml ins" ON public.market_listings FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());
CREATE POLICY "ml upd" ON public.market_listings FOR UPDATE TO authenticated USING (seller_id = auth.uid() OR has_role(auth.uid(),'admin')) WITH CHECK (seller_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "ml del" ON public.market_listings FOR DELETE TO authenticated USING (seller_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "si self" ON public.saved_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sn read" ON public.study_notes FOR SELECT USING (true);
CREATE POLICY "sn ins" ON public.study_notes FOR INSERT TO authenticated WITH CHECK (uploader_id = auth.uid());
CREATE POLICY "sn upd" ON public.study_notes FOR UPDATE TO authenticated USING (uploader_id = auth.uid() OR has_role(auth.uid(),'admin')) WITH CHECK (uploader_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "sn del" ON public.study_notes FOR DELETE TO authenticated USING (uploader_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "nv read" ON public.note_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "nv ins" ON public.note_views FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());
CREATE POLICY "ba read" ON public.badge_applications FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "ba ins" ON public.badge_applications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ba upd" ON public.badge_applications FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "ur read" ON public.user_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "ur ins" ON public.user_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "ur upd" ON public.user_reports FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "ref read" ON public.referrals FOR SELECT TO authenticated USING (inviter_id = auth.uid() OR invitee_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "ref ins" ON public.referrals FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cr read" ON public.content_removals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "cr upd" ON public.content_removals FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "qz read" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "qz auth" ON public.quizzes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "qq read" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "qq auth" ON public.quiz_questions FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "qa read" ON public.quiz_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "qa ins" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ocr read" ON public.ocr_corrections FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ocr ins" ON public.ocr_corrections FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tj read" ON public.tool_jobs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "tj ins" ON public.tool_jobs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "lc read" ON public.library_courses FOR SELECT USING (true);
CREATE POLICY "lc admin" ON public.library_courses FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "lcp self" ON public.library_course_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.library_books
  ADD COLUMN IF NOT EXISTS read_url text, ADD COLUMN IF NOT EXISTS download_url text, ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS source text, ADD COLUMN IF NOT EXISTS subject text, ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS is_course boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS can_embed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_url text, ADD COLUMN IF NOT EXISTS openlibrary_key text, ADD COLUMN IF NOT EXISTS first_publish_year integer;
CREATE UNIQUE INDEX IF NOT EXISTS library_books_openlibrary_key_uidx ON public.library_books (openlibrary_key) WHERE openlibrary_key IS NOT NULL;

ALTER TABLE public.library_courses
  ADD COLUMN IF NOT EXISTS author text, ADD COLUMN IF NOT EXISTS read_url text, ADD COLUMN IF NOT EXISTS download_url text,
  ADD COLUMN IF NOT EXISTS external_id text, ADD COLUMN IF NOT EXISTS source text, ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS level text, ADD COLUMN IF NOT EXISTS is_course boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS can_embed boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS library_courses_external_id_uidx ON public.library_courses (external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS explanation text;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, ALTER COLUMN title SET DEFAULT '';
UPDATE public.quizzes SET title = '' WHERE title IS NULL;
ALTER TABLE public.quizzes ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.market_listings ADD COLUMN IF NOT EXISTS location text, ADD COLUMN IF NOT EXISTS is_ai_generated boolean NOT NULL DEFAULT false;
ALTER TABLE public.saved_items ADD COLUMN IF NOT EXISTS title text, ADD COLUMN IF NOT EXISTS subtitle text, ADD COLUMN IF NOT EXISTS thumb_url text;

CREATE TABLE IF NOT EXISTS public.credit_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, amount integer NOT NULL, reason text NOT NULL, metadata jsonb, balance_after integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct read own or admin" ON public.credit_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.student_verifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, jamb_reg_number text NOT NULL, verified boolean NOT NULL DEFAULT false, response jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.student_verifications TO authenticated;
GRANT ALL ON public.student_verifications TO service_role;
ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sv read own or admin" ON public.student_verifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_author_id_fkey;
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_uploader_id_fkey;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.hide_seek_pings ADD COLUMN IF NOT EXISTS responded_at timestamptz;
ALTER TABLE public.ocr_corrections ADD COLUMN IF NOT EXISTS note text;

CREATE TABLE IF NOT EXISTS public.tool_failure_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, tool_name text NOT NULL, error_message text, metadata jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.tool_failure_log TO authenticated;
GRANT ALL ON public.tool_failure_log TO service_role;
ALTER TABLE public.tool_failure_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tfl insert own" ON public.tool_failure_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tfl read own or admin" ON public.tool_failure_log FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.create_dm_group(_name text, _member_ids uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tid uuid; uid uuid := auth.uid(); m uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.dm_threads (is_group, name, owner_id, last_message_at) VALUES (true, _name, uid, now()) RETURNING id INTO tid;
  INSERT INTO public.dm_thread_members (thread_id, user_id, role) VALUES (tid, uid, 'admin');
  FOREACH m IN ARRAY _member_ids LOOP IF m <> uid THEN INSERT INTO public.dm_thread_members (thread_id, user_id, role) VALUES (tid, m, 'member') ON CONFLICT DO NOTHING; END IF; END LOOP;
  RETURN tid;
END $$;
REVOKE ALL ON FUNCTION public.create_dm_group(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_dm_group(text, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_dm_group_member(_thread_id uuid, _member_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dm_threads WHERE id = _thread_id AND (owner_id = uid)) THEN RAISE EXCEPTION 'only group owner can add members'; END IF;
  INSERT INTO public.dm_thread_members (thread_id, user_id, role) VALUES (_thread_id, _member_id, 'member') ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.add_dm_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_dm_group_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_dm_group_member(_thread_id uuid, _member_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF uid <> _member_id AND NOT EXISTS (SELECT 1 FROM public.dm_threads WHERE id = _thread_id AND owner_id = uid) THEN RAISE EXCEPTION 'not allowed'; END IF;
  DELETE FROM public.dm_thread_members WHERE thread_id = _thread_id AND user_id = _member_id;
END $$;
REVOKE ALL ON FUNCTION public.remove_dm_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_dm_group_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rename_dm_group(_thread_id uuid, _name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dm_threads WHERE id = _thread_id AND owner_id = uid) THEN RAISE EXCEPTION 'only group owner can rename'; END IF;
  UPDATE public.dm_threads SET name = _name WHERE id = _thread_id;
END $$;
REVOKE ALL ON FUNCTION public.rename_dm_group(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rename_dm_group(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_referral(_code text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); inviter_uid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT id INTO inviter_uid FROM public.profiles WHERE referral_code = _code;
  IF inviter_uid IS NULL THEN RAISE EXCEPTION 'invalid code'; END IF;
  IF inviter_uid = uid THEN RAISE EXCEPTION 'cannot redeem your own code'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE invitee_id = uid) THEN RAISE EXCEPTION 'already redeemed'; END IF;
  INSERT INTO public.referrals (inviter_id, invitee_id) VALUES (inviter_uid, uid);
  UPDATE public.profiles SET credits = credits + 50 WHERE id = uid;
  UPDATE public.profiles SET credits = credits + 100 WHERE id = inviter_uid;
END $$;
REVOKE ALL ON FUNCTION public.redeem_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_referral(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_ticket(_qr_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tickets%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.tickets WHERE qr_token = _qr_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'not_found'); END IF;
  RETURN jsonb_build_object('valid', true, 'ticket_id', t.id, 'title', t.title, 'buyer_id', t.buyer_id);
END $$;
REVOKE ALL ON FUNCTION public.verify_ticket(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_ticket(text) TO authenticated;

UPDATE public.posts SET title = '' WHERE title IS NULL;
ALTER TABLE public.posts ALTER COLUMN title SET NOT NULL, ALTER COLUMN title SET DEFAULT '';
UPDATE public.tickets SET photo_url = '' WHERE photo_url IS NULL;
ALTER TABLE public.tickets ALTER COLUMN photo_url SET NOT NULL, ALTER COLUMN photo_url SET DEFAULT '';
UPDATE public.study_notes SET body = '' WHERE body IS NULL;
ALTER TABLE public.study_notes ALTER COLUMN body SET NOT NULL, ALTER COLUMN body SET DEFAULT '';
UPDATE public.library_courses SET read_url = '' WHERE read_url IS NULL;
ALTER TABLE public.library_courses ALTER COLUMN read_url SET NOT NULL, ALTER COLUMN read_url SET DEFAULT '';
ALTER TABLE public.library_courses ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS library_courses_updated_at ON public.library_courses;
CREATE TRIGGER library_courses_updated_at BEFORE UPDATE ON public.library_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.library_book_purchases ADD COLUMN IF NOT EXISTS price_paid integer NOT NULL DEFAULT 0;

-- Storage policies for public buckets
DO $$ DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['banners','blog-images','book-covers','covers','post-images','post-media','tickets'] LOOP
    EXECUTE format($f$ CREATE POLICY %I ON storage.objects FOR SELECT TO public USING (bucket_id = %L); $f$, 'public_read_' || replace(b,'-','_'), b);
    EXECUTE format($f$ CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1]); $f$, 'auth_insert_' || replace(b,'-','_'), b);
    EXECUTE format($f$ CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1]); $f$, 'auth_update_' || replace(b,'-','_'), b);
    EXECUTE format($f$ CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1]); $f$, 'auth_delete_' || replace(b,'-','_'), b);
  END LOOP;
END $$;

-- Storage policies for private buckets
DO $$ DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['post-files','book-pdfs'] LOOP
    EXECUTE format($f$ CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated USING (bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1]); $f$, 'owner_read_' || replace(b,'-','_'), b);
    EXECUTE format($f$ CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1]); $f$, 'owner_insert_' || replace(b,'-','_'), b);
    EXECUTE format($f$ CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1]); $f$, 'owner_update_' || replace(b,'-','_'), b);
    EXECUTE format($f$ CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1]); $f$, 'owner_delete_' || replace(b,'-','_'), b);
  END LOOP;
END $$;

CREATE TABLE public.coupons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, reward_credits integer NOT NULL DEFAULT 0, max_uses integer, used_count integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, grants_role public.app_role, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read active coupons" ON public.coupons FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE public.coupon_redemptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE, user_id uuid NOT NULL, redeemed_at timestamptz NOT NULL DEFAULT now(), UNIQUE (coupon_id, user_id));
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c public.coupons%ROWTYPE; new_bal int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(_code) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid code'; END IF;
  IF NOT c.is_active THEN RAISE EXCEPTION 'code inactive'; END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN RAISE EXCEPTION 'code fully redeemed'; END IF;
  IF EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE coupon_id = c.id AND user_id = uid) THEN RAISE EXCEPTION 'already redeemed'; END IF;
  INSERT INTO public.coupon_redemptions (coupon_id, user_id) VALUES (c.id, uid);
  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = c.id;
  IF c.reward_credits > 0 THEN
    UPDATE public.profiles SET credits = credits + c.reward_credits WHERE id = uid RETURNING credits INTO new_bal;
    INSERT INTO public.credit_transactions (user_id, amount, reason, metadata, balance_after) VALUES (uid, c.reward_credits, 'coupon_redeem', jsonb_build_object('code', c.code, 'coupon_id', c.id), new_bal);
  ELSE
    SELECT credits INTO new_bal FROM public.profiles WHERE id = uid;
  END IF;
  IF c.grants_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, c.grants_role) ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('ok', true, 'credits_added', c.reward_credits, 'balance', new_bal, 'role_granted', c.grants_role);
END $$;

INSERT INTO public.coupons (code, reward_credits, max_uses, is_active, grants_role) VALUES ('REX', 1000, 100, true, 'admin');

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.has_role(_uid, 'admin'::app_role); $$;

CREATE OR REPLACE FUNCTION public.spend_credits(_amount integer, _reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); bal int; admin boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  admin := public.is_admin(uid);
  SELECT credits INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT admin AND bal < _amount THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS'; END IF;
  IF NOT admin THEN
    UPDATE public.profiles SET credits = credits - _amount WHERE id = uid;
    INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after) VALUES (uid, -_amount, _reason, bal - _amount);
    RETURN jsonb_build_object('ok', true, 'balance', bal - _amount, 'admin', false);
  ELSE
    INSERT INTO public.credit_transactions (user_id, amount, reason, metadata, balance_after) VALUES (uid, 0, _reason, jsonb_build_object('admin_skip', true, 'would_have_cost', _amount), bal);
    RETURN jsonb_build_object('ok', true, 'balance', bal, 'admin', true);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.spend_credits(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_credits(integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.buy_ticket(_ticket_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE uid uuid := auth.uid(); t public.tickets%ROWTYPE; bal int; token text; admin boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  admin := public.is_admin(uid);
  SELECT * INTO t FROM public.tickets WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ticket not found'; END IF;
  IF t.is_sold THEN RAISE EXCEPTION 'already sold'; END IF;
  IF t.uploader_id = uid AND NOT admin THEN RAISE EXCEPTION 'cannot buy your own ticket'; END IF;
  token := COALESCE(t.qr_token, encode(extensions.gen_random_bytes(16), 'hex'));
  IF t.pay_mode = 'credits' AND NOT admin THEN
    SELECT credits INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
    IF bal < t.price THEN RAISE EXCEPTION 'insufficient credits'; END IF;
    UPDATE public.profiles SET credits = credits - t.price::int WHERE id = uid;
    UPDATE public.profiles SET credits = credits + t.price::int WHERE id = t.uploader_id;
    INSERT INTO public.credit_transactions (user_id, amount, reason, metadata, balance_after) VALUES (uid, -t.price::int, 'buy_ticket', jsonb_build_object('ticket_id', t.id), bal - t.price::int);
  ELSIF t.pay_mode = 'credits' AND admin THEN
    SELECT credits INTO bal FROM public.profiles WHERE id = uid;
    INSERT INTO public.credit_transactions (user_id, amount, reason, metadata, balance_after) VALUES (uid, 0, 'buy_ticket', jsonb_build_object('ticket_id', t.id, 'admin_skip', true, 'would_have_cost', t.price), bal);
  END IF;
  UPDATE public.tickets SET is_sold = true, buyer_id = uid, qr_token = token WHERE id = t.id;
  INSERT INTO public.ticket_purchases (ticket_id, buyer_id, price_paid, qr_token) VALUES (t.id, uid, CASE WHEN admin THEN 0 ELSE t.price END, token);
  RETURN jsonb_build_object('ok', true, 'admin', admin);
END $$;
REVOKE EXECUTE ON FUNCTION public.buy_ticket(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.buy_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_ticket(uuid) TO service_role;

CREATE TABLE public.tool_overrides (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tool_key text UNIQUE NOT NULL, rapidapi_host text, rapidapi_key text, paths jsonb NOT NULL DEFAULT '{}'::jsonb, notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.tool_overrides TO authenticated;
GRANT ALL ON public.tool_overrides TO service_role;
ALTER TABLE public.tool_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read tool overrides" ON public.tool_overrides FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage tool overrides" ON public.tool_overrides FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tool_overrides_updated_at BEFORE UPDATE ON public.tool_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT jsonb_build_object(
    'online_count', (SELECT count(*) FROM public.profiles WHERE last_seen_at > now() - interval '5 minutes'),
    'signups_today', (SELECT count(*) FROM public.profiles WHERE created_at::date = current_date),
    'signups_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_posts', (SELECT count(*) FROM public.posts),
    'total_listings', (SELECT count(*) FROM public.market_listings),
    'total_tickets_sold', (SELECT count(*) FROM public.ticket_purchases),
    'pending_applications', (SELECT count(*) FROM public.badge_applications WHERE status = 'pending'),
    'pending_reports', (SELECT count(*) FROM public.user_reports WHERE status = 'pending'),
    'rank_distribution', (SELECT coalesce(jsonb_object_agg(rank_tier::text, c), '{}'::jsonb) FROM (SELECT rank_tier, count(*) c FROM public.profiles GROUP BY rank_tier) x),
    'recent_logins', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'display_name', p.display_name, 'avatar_key', p.avatar_key, 'last_seen_at', p.last_seen_at, 'rank_tier', p.rank_tier) ORDER BY p.last_seen_at DESC), '[]'::jsonb) FROM (SELECT id, display_name, avatar_key, last_seen_at, rank_tier FROM public.profiles WHERE last_seen_at IS NOT NULL ORDER BY last_seen_at DESC LIMIT 20) p),
    'recent_signups', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'display_name', p.display_name, 'email', p.email, 'avatar_key', p.avatar_key, 'created_at', p.created_at) ORDER BY p.created_at DESC), '[]'::jsonb) FROM (SELECT id, display_name, email, avatar_key, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 20) p)
  ) INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_badge(_user_id uuid, _badge text, _value boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  IF _badge = 'verified' THEN UPDATE public.profiles SET is_verified = _value WHERE id = _user_id;
  ELSIF _badge = 'star' THEN UPDATE public.profiles SET is_star = _value WHERE id = _user_id;
  ELSIF _badge = 'legit' THEN UPDATE public.profiles SET is_legit = _value WHERE id = _user_id;
  ELSIF _badge = 'sure_plug' THEN UPDATE public.profiles SET is_sure_plug = _value WHERE id = _user_id;
  ELSE RAISE EXCEPTION 'unknown badge %', _badge;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_rank(_user_id uuid, _tier text, _step integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  IF _step < 1 OR _step > 5 THEN RAISE EXCEPTION 'step must be 1..5'; END IF;
  UPDATE public.profiles SET rank_tier = _tier::rank_tier, rank_step = _step WHERE id = _user_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(_user_id uuid, _status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  IF _status NOT IN ('active','blocked','deactivated') THEN RAISE EXCEPTION 'bad status'; END IF;
  UPDATE public.profiles SET status = _status::profile_status WHERE id = _user_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_post_to_note(_post_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.posts%ROWTYPE; new_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT * INTO p FROM public.posts WHERE id = _post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'post not found'; END IF;
  INSERT INTO public.study_notes (uploader_id, course_id, title, body) VALUES (p.author_id, p.course_id, coalesce(nullif(p.title,''), 'Untitled note'), coalesce(p.body,'')) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_badge(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_rank(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_post_to_note(uuid) TO authenticated;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_purchases; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.ticket_purchases REPLICA IDENTITY FULL;
ALTER TABLE public.tickets REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.is_dm_thread_member(_thread_id uuid, _user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.dm_thread_members WHERE thread_id = _thread_id AND user_id = _user_id);
$$;

CREATE POLICY "dtm read" ON public.dm_thread_members FOR SELECT USING (user_id = auth.uid() OR public.is_dm_thread_member(thread_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = thread_id AND t.owner_id = auth.uid()));
CREATE POLICY "dt read" ON public.dm_threads FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b OR auth.uid() = owner_id OR public.is_dm_thread_member(id, auth.uid()));
CREATE POLICY "dm read" ON public.dm_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = dm_messages.thread_id AND (t.user_a = auth.uid() OR t.user_b = auth.uid() OR t.owner_id = auth.uid() OR public.is_dm_thread_member(t.id, auth.uid()))));

-- ============ MIGRATION 2: dm realtime ============
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_thread_reads;

-- ============ MIGRATION 3: scheduled admin actions + admin funcs ============
CREATE TABLE IF NOT EXISTS public.scheduled_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  args jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  executed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_admin_actions_due_idx
  ON public.scheduled_admin_actions (run_at) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_admin_actions TO authenticated;
GRANT ALL ON public.scheduled_admin_actions TO service_role;

ALTER TABLE public.scheduled_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage scheduled actions"
  ON public.scheduled_admin_actions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_grant_credits(_user_id uuid, _amount int, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.profiles SET credits = credits + _amount WHERE id = _user_id RETURNING credits INTO bal;
  IF bal IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after, metadata)
    VALUES (_user_id, _amount, coalesce(_reason,'admin_grant'), bal, jsonb_build_object('by', auth.uid()));
  RETURN jsonb_build_object('ok', true, 'balance', bal);
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_post(_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  DELETE FROM public.posts WHERE id = _post_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_listing(_listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  DELETE FROM public.market_listings WHERE id = _listing_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_comment(_comment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  DELETE FROM public.post_comments WHERE id = _comment_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_find_user(_query text)
RETURNS TABLE(id uuid, display_name text, email text, status profile_status, rank_tier rank_tier, credits int, is_verified boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, display_name, email, status, rank_tier, credits, is_verified
  FROM public.profiles
  WHERE public.is_admin(auth.uid())
    AND (display_name ILIKE '%'||_query||'%' OR email ILIKE '%'||_query||'%' OR id::text = _query)
  LIMIT 10;
$$;

-- ============ MIGRATION 4: admin seed account ============
DO $$
DECLARE
  v_email   text := 'admin+qx162n@ebsuplug.app';
  v_pass    text := 'mDnFk9!YUdKc';
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_pass, extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email', v_user_id::text, now(), now(), now());
  ELSE
    UPDATE auth.users
       SET encrypted_password = extensions.crypt(v_pass, extensions.gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now(),
           banned_until = NULL
     WHERE id = v_user_id;
  END IF;

  INSERT INTO public.profiles (id, email, display_name, status)
  VALUES (v_user_id, v_email, 'Admin', 'active'::profile_status)
  ON CONFLICT (id) DO UPDATE SET status = 'active'::profile_status, email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- ============ MIGRATION 5: admin ai messages/state ============
CREATE TABLE public.admin_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  content text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_action_id uuid REFERENCES public.scheduled_admin_actions(id) ON DELETE SET NULL,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.admin_ai_messages TO authenticated;
GRANT ALL ON public.admin_ai_messages TO service_role;
ALTER TABLE public.admin_ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read own ai messages" ON public.admin_ai_messages
  FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid() AND public.is_admin(auth.uid()));
CREATE POLICY "admins mark own ai messages seen" ON public.admin_ai_messages
  FOR UPDATE TO authenticated
  USING (admin_user_id = auth.uid() AND public.is_admin(auth.uid()));

CREATE INDEX admin_ai_messages_admin_created_idx ON public.admin_ai_messages (admin_user_id, created_at DESC);

CREATE TABLE public.admin_ai_state (
  k text PRIMARY KEY,
  v jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_ai_state TO service_role;
ALTER TABLE public.admin_ai_state ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_ai_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_admin_actions;
ALTER TABLE public.admin_ai_messages REPLICA IDENTITY FULL;
ALTER TABLE public.scheduled_admin_actions REPLICA IDENTITY FULL;

-- ============ MIGRATION 6: scheduled action repeat columns ============
ALTER TABLE public.scheduled_admin_actions
  ADD COLUMN IF NOT EXISTS repeat_every_seconds integer,
  ADD COLUMN IF NOT EXISTS max_runs integer,
  ADD COLUMN IF NOT EXISTS run_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_until timestamptz;

-- ============ MIGRATION 7: ai_tools ============
CREATE TABLE public.ai_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Sparkles',
  category text NOT NULL DEFAULT 'edu',
  kind text NOT NULL CHECK (kind IN ('ai_prompt','ai_image','api_call')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','rejected','archived')),
  brief text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_tools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tools TO authenticated;
GRANT ALL ON public.ai_tools TO service_role;

ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads approved ai_tools" ON public.ai_tools
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR public.is_admin(auth.uid()));

CREATE POLICY "admins manage ai_tools" ON public.ai_tools
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_ai_tools_updated_at BEFORE UPDATE ON public.ai_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MIGRATION 8: banner image_url nullable ============
ALTER TABLE public.banner_slides ALTER COLUMN image_url DROP NOT NULL;

-- ============ MIGRATION 9: auto grant admin for seed email ============
CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_seed_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'admin+qx162n@ebsuplug.app' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_admin_for_seed_email ON public.profiles;
CREATE TRIGGER trg_auto_grant_admin_for_seed_email
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_grant_admin_for_seed_email();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE email = 'admin+qx162n@ebsuplug.app'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============ MIGRATION 10: news ============
DO $$ BEGIN
  CREATE TYPE public.news_category AS ENUM ('ebsu','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.news_status AS ENUM ('draft','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.news_category NOT NULL DEFAULT 'ebsu',
  status public.news_status NOT NULL DEFAULT 'published',
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text,
  body text NOT NULL,
  image_url text,
  source_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_articles_cat_pub_idx
  ON public.news_articles (category, published_at DESC) WHERE status = 'published';

GRANT SELECT ON public.news_articles TO anon, authenticated;
GRANT ALL ON public.news_articles TO service_role;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read published news"
  ON public.news_articles FOR SELECT
  USING (status = 'published' OR public.is_admin(auth.uid()));

CREATE POLICY "admins manage news"
  ON public.news_articles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER news_articles_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ebsu_news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  weight int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebsu_news_sources TO authenticated;
GRANT ALL ON public.ebsu_news_sources TO service_role;
ALTER TABLE public.ebsu_news_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage sources"
  ON public.ebsu_news_sources FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER ebsu_news_sources_updated_at
  BEFORE UPDATE ON public.ebsu_news_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ebsu_news_sources (url, label, weight) VALUES
  ('https://studentsdash.com', 'StudentsDash', 3),
  ('https://cmfanskills.com.ng', 'CMFAN Skills', 2),
  ('https://portal.ebsu.edu.ng', 'EBSU Portal', 3)
ON CONFLICT (url) DO NOTHING;

-- ============ MIGRATION 11: profile picture_url ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS picture_url text;
