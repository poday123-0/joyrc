
-- Allow staff with tab_products or tab_stock to upload/manage files in product-images bucket
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete product images" ON storage.objects;

-- SELECT: anyone can view
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- INSERT: admins and staff with tab_products/tab_stock
CREATE POLICY "Authorized users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    is_super_admin(auth.uid()) OR 
    has_permission(auth.uid(), 'tab_products'::text) OR 
    has_permission(auth.uid(), 'tab_stock'::text)
  )
);

-- UPDATE: admins and staff
CREATE POLICY "Authorized users can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    is_super_admin(auth.uid()) OR 
    has_permission(auth.uid(), 'tab_products'::text) OR 
    has_permission(auth.uid(), 'tab_stock'::text)
  )
);

-- DELETE: admins and staff
CREATE POLICY "Authorized users can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    is_super_admin(auth.uid()) OR 
    has_permission(auth.uid(), 'tab_products'::text) OR 
    has_permission(auth.uid(), 'tab_stock'::text)
  )
);
