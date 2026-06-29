
-- 1. New columns on banner_slides for layouts, scheduling, and theming
ALTER TABLE public.banner_slides
  ADD COLUMN IF NOT EXISTS layout text NOT NULL DEFAULT 'image-bg',
  ADD COLUMN IF NOT EXISTS accent text,
  ADD COLUMN IF NOT EXISTS variant text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS expire_at timestamptz;

-- Validation trigger (CHECK can't reference now())
CREATE OR REPLACE FUNCTION public.banner_slides_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.layout NOT IN ('image-bg','image-left','image-right','image-top','text-only','split') THEN
    RAISE EXCEPTION 'invalid layout %', NEW.layout;
  END IF;
  IF NEW.variant NOT IN ('auto','light','dark') THEN
    RAISE EXCEPTION 'invalid variant %', NEW.variant;
  END IF;
  IF NEW.expire_at IS NOT NULL AND NEW.publish_at IS NOT NULL AND NEW.expire_at <= NEW.publish_at THEN
    RAISE EXCEPTION 'expire_at must be after publish_at';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS banner_slides_validate_tg ON public.banner_slides;
CREATE TRIGGER banner_slides_validate_tg
  BEFORE INSERT OR UPDATE ON public.banner_slides
  FOR EACH ROW EXECUTE FUNCTION public.banner_slides_validate();

-- 2. banner_events for impression/click tracking
CREATE TABLE IF NOT EXISTS public.banner_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id uuid NOT NULL REFERENCES public.banner_slides(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('impression','click')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.banner_events TO authenticated;
GRANT INSERT ON public.banner_events TO anon;
GRANT ALL ON public.banner_events TO service_role;

ALTER TABLE public.banner_events ENABLE ROW LEVEL SECURITY;

-- Anyone (signed in or not) can log an event for an active banner
CREATE POLICY "Anyone can log banner events"
  ON public.banner_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read raw events (for CTR aggregation)
CREATE POLICY "Admins read banner events"
  ON public.banner_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS banner_events_banner_idx ON public.banner_events(banner_id, kind, at DESC);
