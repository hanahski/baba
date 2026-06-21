
CREATE TABLE public.tool_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_key text UNIQUE NOT NULL,
  label text,
  cost integer NOT NULL DEFAULT 0 CHECK (cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tool_prices TO authenticated, anon;
GRANT ALL ON public.tool_prices TO service_role;
ALTER TABLE public.tool_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tool prices" ON public.tool_prices FOR SELECT USING (true);
CREATE POLICY "Admins manage tool prices" ON public.tool_prices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tool_prices_updated_at BEFORE UPDATE ON public.tool_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ai_tools ADD COLUMN IF NOT EXISTS credits_cost integer NOT NULL DEFAULT 0 CHECK (credits_cost >= 0);

INSERT INTO public.tool_prices (tool_key, label, cost) VALUES
  ('/tools/pdf', 'Text → PDF', 10),
  ('/tools/ocr', 'Image → Text', 10),
  ('/tools/audio-convert', 'Audio Converter', 0),
  ('/tools/qr', 'QR / Ticket Scanner', 0),
  ('/tools/vocal-split', 'Vocal Remover', 0),
  ('/tools/voice-clone', 'Voice Cloning', 0),
  ('/tools/notif-clean', 'iPhone Notification Remover', 0),
  ('/tools/youtube', 'YouTube Downloader', 0),
  ('/tools/calculator', 'Scientific Calculator', 0),
  ('/tools/planets', 'Planet Explorer', 0),
  ('/tools/dictionary', 'Dictionary', 0),
  ('/tools/vnum1', 'Virtual Number', 0),
  ('/tools/vnum2', 'Virtual Number 2', 0),
  ('/tools/vnum3', 'Virtual Number 3', 0)
ON CONFLICT (tool_key) DO NOTHING;
