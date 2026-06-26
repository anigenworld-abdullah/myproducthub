
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only service_role can touch this table. SECURITY DEFINER functions bypass RLS regardless.
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- No anon / authenticated access policies → table is invisible to clients.

INSERT INTO public.app_config (key, value)
VALUES ('admin_email', lower('abdullahsaeed9109@gmail.com'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE OR REPLACE FUNCTION public._get_admin_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT value FROM public.app_config WHERE key = 'admin_email' $$;

CREATE OR REPLACE FUNCTION public.is_main_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u, public.app_config c
    WHERE c.key = 'admin_email'
      AND u.id = _user_id
      AND lower(u.email) = lower(c.value)
  )
$function$;

CREATE OR REPLACE FUNCTION public.claim_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_email TEXT;
  v_admin TEXT;
BEGIN
  SELECT value INTO v_admin FROM public.app_config WHERE key = 'admin_email';
  IF coalesce(v_admin, '') = '' THEN RETURN false; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF lower(v_email) = lower(v_admin) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END; $function$;
