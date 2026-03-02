
DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete videos" ON storage.objects;

CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Authorized users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    is_super_admin(auth.uid()) OR 
    has_permission(auth.uid(), 'tab_products'::text) OR 
    has_permission(auth.uid(), 'tab_stock'::text)
  )
);

CREATE POLICY "Authorized users can update videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'videos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    is_super_admin(auth.uid()) OR 
    has_permission(auth.uid(), 'tab_products'::text) OR 
    has_permission(auth.uid(), 'tab_stock'::text)
  )
);

CREATE POLICY "Authorized users can delete videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'videos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    is_super_admin(auth.uid()) OR 
    has_permission(auth.uid(), 'tab_products'::text) OR 
    has_permission(auth.uid(), 'tab_stock'::text)
  )
);
