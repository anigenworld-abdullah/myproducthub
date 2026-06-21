CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  site_name TEXT NOT NULL DEFAULT 'MY PRODUCT HUB',
  bg_music_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins update settings" ON public.site_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
INSERT INTO public.site_settings (id, site_name) VALUES (1, 'MY PRODUCT HUB') ON CONFLICT DO NOTHING;