ALTER TABLE public.market_listings
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS edition text,
  ADD COLUMN IF NOT EXISTS course_code text,
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS is_donation boolean NOT NULL DEFAULT false;