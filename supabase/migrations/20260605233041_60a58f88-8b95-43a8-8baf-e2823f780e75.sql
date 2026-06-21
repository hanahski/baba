ALTER TABLE public.scheduled_admin_actions
  ADD COLUMN IF NOT EXISTS repeat_every_seconds integer,
  ADD COLUMN IF NOT EXISTS max_runs integer,
  ADD COLUMN IF NOT EXISTS run_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_until timestamptz;