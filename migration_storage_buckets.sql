-- =================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO SETUP STORAGE BUCKETS
-- =================================================================

-- 1. Create the 'society-docs' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('society-docs', 'society-docs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "Allow public uploads for society-docs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read for society-docs" ON storage.objects;

-- 3. Create policy to allow unauthenticated (public) uploads to 'society-docs'
-- This is necessary because new society admins upload their certificate before registration is complete
CREATE POLICY "Allow public uploads for society-docs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'society-docs');

-- 4. Create policy to allow public read access to 'society-docs'
-- This is necessary so the Master Portal and other users can view/download the certificate
CREATE POLICY "Allow public read for society-docs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'society-docs');
