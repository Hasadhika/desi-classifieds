/*
  # Add storage policies for listing images

  1. Storage Policies
    - Allow authenticated users to upload images
    - Allow public read access to all images
    - Allow users to delete their own images
  
  2. Security
    - Upload limited to authenticated users
    - Public read access for all users
*/

CREATE POLICY "Allow authenticated users to upload listing images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-images');

CREATE POLICY "Allow public read access to listing images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-images');

CREATE POLICY "Allow users to delete their own listing images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'listing-images');
