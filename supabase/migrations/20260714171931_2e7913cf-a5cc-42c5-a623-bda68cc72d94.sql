
-- Extend ads for banner placement + video support
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
-- position already exists; we'll use 'banner' vs 'grid' (default)
ALTER TABLE public.ads ALTER COLUMN position SET DEFAULT 'grid';

-- Contact info on site_settings (single row id=1)
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_whatsapp text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_instagram text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_email text;
