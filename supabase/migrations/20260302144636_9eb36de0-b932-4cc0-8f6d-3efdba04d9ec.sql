
-- Drop and recreate product_colors policies to include tab_products staff
DROP POLICY IF EXISTS "Admins and staff can manage product colors" ON public.product_colors;
CREATE POLICY "Admins and staff can manage product colors"
ON public.product_colors FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_stock'::text) OR has_permission(auth.uid(), 'tab_products'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_stock'::text) OR has_permission(auth.uid(), 'tab_products'::text)
);

-- Drop and recreate product_images policies to include tab_products staff
DROP POLICY IF EXISTS "Admins and staff can manage product images" ON public.product_images;
CREATE POLICY "Admins and staff can manage product images"
ON public.product_images FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_stock'::text) OR has_permission(auth.uid(), 'tab_products'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_stock'::text) OR has_permission(auth.uid(), 'tab_products'::text)
);

-- Drop and recreate product_specifications policies to include tab_products staff
DROP POLICY IF EXISTS "Admins can manage specifications" ON public.product_specifications;
CREATE POLICY "Admins and staff can manage specifications"
ON public.product_specifications FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_products'::text) OR has_permission(auth.uid(), 'tab_stock'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()) OR has_permission(auth.uid(), 'tab_products'::text) OR has_permission(auth.uid(), 'tab_stock'::text)
);
