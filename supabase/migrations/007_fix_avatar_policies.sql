-- Fix avatar storage policies with proper foldername syntax

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "avatar_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "avatar_read" ON storage.objects;

-- Allow users to upload their own avatar
CREATE POLICY "avatar_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatar  
CREATE POLICY "avatar_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow everyone to read avatars (public bucket)
CREATE POLICY "avatar_read" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
