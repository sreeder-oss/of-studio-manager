
-- Add ownership-scoped DELETE policy for of-documents bucket
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'of-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Add ownership-scoped UPDATE policy for of-documents bucket
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'of-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
