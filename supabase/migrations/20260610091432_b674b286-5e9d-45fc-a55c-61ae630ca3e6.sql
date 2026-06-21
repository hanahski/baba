-- Storage RLS policies for app buckets.
-- Buckets: banners, post-images, post-media, covers, book-covers, blog-images, tickets, post-files, book-pdfs

-- Public/anon read access (works once buckets are public; harmless otherwise) for display buckets
CREATE POLICY "Public read display buckets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('banners','post-images','post-media','covers','book-covers','blog-images','book-pdfs'));

-- Authenticated read for sensitive buckets (signed URLs)
CREATE POLICY "Authenticated read private buckets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN ('tickets','post-files'));

-- Authenticated users can upload to any app bucket
CREATE POLICY "Authenticated upload app buckets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('banners','post-images','post-media','covers','book-covers','blog-images','tickets','post-files','book-pdfs'));

-- Authenticated users can update/replace their own uploads
CREATE POLICY "Authenticated update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('banners','post-images','post-media','covers','book-covers','blog-images','tickets','post-files','book-pdfs') AND owner = auth.uid())
WITH CHECK (bucket_id IN ('banners','post-images','post-media','covers','book-covers','blog-images','tickets','post-files','book-pdfs'));

-- Authenticated users can delete their own uploads
CREATE POLICY "Authenticated delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('banners','post-images','post-media','covers','book-covers','blog-images','tickets','post-files','book-pdfs') AND owner = auth.uid());