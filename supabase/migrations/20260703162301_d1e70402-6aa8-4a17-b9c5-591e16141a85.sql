
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.tg_touch_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_touch_updated_at() TO service_role;

-- Storage policies
CREATE POLICY "auth read raw-uploads" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'raw-uploads');
CREATE POLICY "auth write raw-uploads" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'raw-uploads');
CREATE POLICY "auth read generated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'generated-assets');
CREATE POLICY "auth write generated" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'generated-assets');
CREATE POLICY "auth update generated" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'generated-assets');
