-- Update policies to include super_admin access

-- Product Specifications
DROP POLICY IF EXISTS "Admins can manage specifications" ON public.product_specifications;
CREATE POLICY "Admins can manage specifications" 
ON public.product_specifications 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Product Images
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images" 
ON public.product_images 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Product Colors
DROP POLICY IF EXISTS "Admins can manage product colors" ON public.product_colors;
CREATE POLICY "Admins can manage product colors" 
ON public.product_colors 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Products table
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Storage policies
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

CREATE POLICY "Admins can upload product images" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can update product images" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'product-images' AND (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can delete product images" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'product-images' AND (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid())));