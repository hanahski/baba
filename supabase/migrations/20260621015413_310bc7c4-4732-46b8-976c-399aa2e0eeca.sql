
-- Allow anon to read avatars and ticket images so signed URLs resolve for browsing users.
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public read tickets" ON storage.objects;
CREATE POLICY "Public read tickets" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'tickets');
