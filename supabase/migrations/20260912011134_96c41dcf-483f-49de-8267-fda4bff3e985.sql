-- Anonim istemciden yönetici var mı kontrolü
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;

GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

-- İlan fotoğraflarının herkese açık okunması
DROP POLICY IF EXISTS "Public read listing photos" ON storage.objects;
CREATE POLICY "Public read listing photos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'listing-photos');

-- WhatsApp hazır mesaj ayarları
INSERT INTO public.site_settings (key, value)
VALUES
  ('whatsapp_number', '"905551112233"'::jsonb),
  ('whatsapp_message', '"Merhaba, Nova''dan geldim bilgi alabilir miyim?"'::jsonb)
ON CONFLICT (key) DO NOTHING;