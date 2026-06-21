
-- 1. Ticket scan audit log (successful verifications only)
CREATE TABLE IF NOT EXISTS public.ticket_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  scanner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ticket_scans TO authenticated;
GRANT ALL ON public.ticket_scans TO service_role;

ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scans admin read" ON public.ticket_scans;
CREATE POLICY "scans admin read" ON public.ticket_scans
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "scans self read" ON public.ticket_scans;
CREATE POLICY "scans self read" ON public.ticket_scans
  FOR SELECT TO authenticated
  USING (scanner_id = auth.uid());

DROP POLICY IF EXISTS "scans insert auth" ON public.ticket_scans;
CREATE POLICY "scans insert auth" ON public.ticket_scans
  FOR INSERT TO authenticated
  WITH CHECK (scanner_id = auth.uid());

CREATE INDEX IF NOT EXISTS ticket_scans_ticket_at_idx ON public.ticket_scans (ticket_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS ticket_scans_scanner_at_idx ON public.ticket_scans (scanner_id, scanned_at DESC);

-- 2. verify_ticket: log successful scans and return buyer display name
CREATE OR REPLACE FUNCTION public.verify_ticket(_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t public.tickets%ROWTYPE;
  buyer_name text;
BEGIN
  SELECT * INTO t FROM public.tickets WHERE qr_token = _qr_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  SELECT display_name INTO buyer_name FROM public.profiles WHERE id = t.buyer_id;
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.ticket_scans (ticket_id, scanner_id)
    VALUES (t.id, auth.uid());
  END IF;
  RETURN jsonb_build_object(
    'valid', true,
    'ticket_id', t.id,
    'title', t.title,
    'buyer_id', t.buyer_id,
    'buyer', buyer_name
  );
END
$function$;

-- 3. Allow verified students to propose new courses (admins still allowed by existing policy)
DROP POLICY IF EXISTS "courses verified insert" ON public.courses;
CREATE POLICY "courses verified insert" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_verified = true
    )
  );

-- 4. Subject column for the universal report composer
ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS subject text;
