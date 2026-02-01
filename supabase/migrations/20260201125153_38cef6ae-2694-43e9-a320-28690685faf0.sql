-- Drop and recreate the orders INSERT policy to include staff with tab_pos permission
DROP POLICY IF EXISTS "Users and admins can create orders" ON public.orders;

CREATE POLICY "Users and admins can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  -- Users can create orders for themselves
  auth.uid() = user_id
  OR 
  -- Admins/super admins can create orders for any user
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  is_super_admin(auth.uid())
  OR
  -- Staff with Quick POS permission can create orders
  has_permission(auth.uid(), 'tab_pos')
);

-- Also update order_items policy for staff
DROP POLICY IF EXISTS "Admins can create order items for any order" ON public.order_items;

CREATE POLICY "Admins and staff can create order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid())
  OR has_permission(auth.uid(), 'tab_pos')
);