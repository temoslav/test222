-- Create storage policies for avatar uploads
-- These policies allow authenticated users to upload their own avatars
-- and allow anyone to read public avatar images

-- Policy for uploading avatars (only to user's own folder)
CREATE POLICY "avatar_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (name = auth.uid() || '/avatar.jpg' 
       OR name = auth.uid() || '/avatar.png' 
       OR name = auth.uid() || '/avatar.jpeg'
       OR name = auth.uid() || '/avatar.webp')
);

-- Policy for updating avatars (only user's own avatar)
CREATE POLICY "avatar_update" ON storage.objects
FOR UPDATE TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (name = auth.uid() || '/avatar.jpg' 
       OR name = auth.uid() || '/avatar.png' 
       OR name = auth.uid() || '/avatar.jpeg'
       OR name = auth.uid() || '/avatar.webp')
);

-- Policy for reading avatars (public access)
CREATE POLICY "avatar_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');
