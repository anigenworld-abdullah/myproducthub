
-- Storage policies for product-media bucket
CREATE POLICY "Public read product media" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-media');
CREATE POLICY "Admins upload product media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-media' AND public.has_role(auth.uid(), 'admin'));

-- Function: claim admin role if the current user's email matches the designated admin email
CREATE OR REPLACE FUNCTION public.claim_admin_role()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email = 'abdullahsaeed9109@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated;
