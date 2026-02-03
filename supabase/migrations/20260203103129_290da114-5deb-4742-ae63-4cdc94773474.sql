-- Update product_colors RLS to allow staff with tab_stock permission
DROP POLICY IF EXISTS "Admins can manage product colors" ON public.product_colors;

CREATE POLICY "Admins and staff can manage product colors"
ON public.product_colors
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_stock'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_stock'));

-- Update product_images RLS to allow staff with tab_stock permission  
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;

CREATE POLICY "Admins and staff can manage product images"
ON public.product_images
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_stock'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_stock'));

-- Update products RLS to allow staff with tab_stock or tab_products permission
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Admins and staff can manage products"
ON public.products
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_products') OR has_permission(auth.uid(), 'tab_stock'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_products') OR has_permission(auth.uid(), 'tab_stock'));