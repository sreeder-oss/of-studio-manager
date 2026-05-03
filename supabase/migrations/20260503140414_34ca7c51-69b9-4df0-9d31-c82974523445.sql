-- Make receipts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- Tighten receipts SELECT policy to owner only
DROP POLICY IF EXISTS "Users can view receipt images" ON storage.objects;
CREATE POLICY "Users can view own receipt images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Tighten of-documents SELECT to owner only
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'of-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Tighten of-documents UPLOAD to owner folder
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'of-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);