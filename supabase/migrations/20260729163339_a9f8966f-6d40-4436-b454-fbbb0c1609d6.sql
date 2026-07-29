ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_digital boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS download_url text;