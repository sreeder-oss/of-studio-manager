
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('of-documents', 'of-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('of-photos', 'of-photos', true);

-- Documents bucket policies
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'of-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'of-documents' AND auth.role() = 'authenticated');

-- Photos bucket policies
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'of-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can read photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'of-photos');
