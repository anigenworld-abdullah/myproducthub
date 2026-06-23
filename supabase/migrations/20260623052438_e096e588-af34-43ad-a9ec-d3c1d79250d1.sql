
-- Main admin helper
CREATE OR REPLACE FUNCTION public.is_main_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND lower(email) = 'abdullahsaeed9109@gmail.com')
$$;

-- Moderators table (simple admins)
CREATE TABLE IF NOT EXISTS public.moderators (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderators TO authenticated;
GRANT ALL ON public.moderators TO service_role;
ALTER TABLE public.moderators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view moderators"
  ON public.moderators FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.is_moderator(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.moderators WHERE user_id = _user_id) $$;

-- products.owner_id
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Replace products policies
DROP POLICY IF EXISTS "Admins manage products" ON public.products;

CREATE POLICY "Main admin manages all products"
  ON public.products FOR ALL TO authenticated
  USING (public.is_main_admin(auth.uid()))
  WITH CHECK (public.is_main_admin(auth.uid()));

CREATE POLICY "Moderators insert own products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_moderator(auth.uid()) AND owner_id = auth.uid());

CREATE POLICY "Moderators update own products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.is_moderator(auth.uid()) AND owner_id = auth.uid())
  WITH CHECK (public.is_moderator(auth.uid()) AND owner_id = auth.uid());

CREATE POLICY "Moderators delete own products"
  ON public.products FOR DELETE TO authenticated
  USING (public.is_moderator(auth.uid()) AND owner_id = auth.uid());

-- site_settings theme
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS theme_primary text,
  ADD COLUMN IF NOT EXISTS theme_accent text,
  ADD COLUMN IF NOT EXISTS theme_background text;

-- Main-admin only: grant moderator by email
CREATE OR REPLACE FUNCTION public.grant_moderator(_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_uid uuid;
BEGIN
  IF NOT public.is_main_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(_email);
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;
  INSERT INTO public.moderators (user_id, granted_by) VALUES (v_uid, auth.uid())
    ON CONFLICT (user_id) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'user_id', v_uid);
END; $$;

CREATE OR REPLACE FUNCTION public.revoke_moderator(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_main_admin(auth.uid()) THEN RETURN false; END IF;
  DELETE FROM public.moderators WHERE user_id = _user_id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.list_moderators()
RETURNS TABLE(user_id uuid, email text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT m.user_id, u.email::text, m.created_at
  FROM public.moderators m
  JOIN auth.users u ON u.id = m.user_id
  WHERE public.is_main_admin(auth.uid())
  ORDER BY m.created_at DESC
$$;
