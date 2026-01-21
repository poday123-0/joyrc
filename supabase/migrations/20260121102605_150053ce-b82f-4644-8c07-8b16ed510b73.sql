-- Drop existing restrictive policies and recreate as permissive

-- Product Specifications
DROP POLICY IF EXISTS "Admins can manage specifications" ON public.product_specifications;
DROP POLICY IF EXISTS "Everyone can view specifications" ON public.product_specifications;

CREATE POLICY "Admins can manage specifications" 
ON public.product_specifications 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view specifications" 
ON public.product_specifications 
FOR SELECT 
TO public
USING (true);

-- Product Images
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
DROP POLICY IF EXISTS "Everyone can view product images" ON public.product_images;

CREATE POLICY "Admins can manage product images" 
ON public.product_images 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view product images" 
ON public.product_images 
FOR SELECT 
TO public
USING (true);

-- Product Colors
DROP POLICY IF EXISTS "Admins can manage product colors" ON public.product_colors;
DROP POLICY IF EXISTS "Everyone can view product colors" ON public.product_colors;

CREATE POLICY "Admins can manage product colors" 
ON public.product_colors 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view product colors" 
ON public.product_colors 
FOR SELECT 
TO public
USING (true);

-- Products table
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Everyone can view products" ON public.products;

CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view products" 
ON public.products 
FOR SELECT 
TO public
USING (true);

-- Storage policies for product-images bucket
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;

CREATE POLICY "Anyone can view product images" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product images" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product images" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));