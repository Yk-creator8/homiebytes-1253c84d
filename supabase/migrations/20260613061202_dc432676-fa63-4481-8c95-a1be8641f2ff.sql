
-- Lock down SECURITY DEFINER functions: callable only by service_role / via RLS (postgres)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

-- Storage policies for food-images: anyone can read, authenticated users can write to their own folder (cook_id/...)
CREATE POLICY "food_images_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'food-images');
CREATE POLICY "food_images_cook_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'food-images' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "food_images_cook_update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'food-images' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "food_images_cook_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'food-images' AND (storage.foldername(name))[1] = auth.uid()::text
);
