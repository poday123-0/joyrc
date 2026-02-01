-- Drop existing INSERT policies on orders and order_items
DROP POLICY IF EXISTS "Users and admins can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins and staff can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items for their orders" ON public.order_items;

-- Create PERMISSIVE INSERT policy for orders (any authorized user can create)
CREATE POLICY "Users and admins can create orders" 
ON public.orders 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.is_super_admin(auth.uid()) 
  OR public.has_permission(auth.uid(), 'tab_pos')
);

-- Create single PERMISSIVE INSERT policy for order_items (combines all cases)
CREATE POLICY "Authorized users can create order items" 
ON public.order_items 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.is_super_admin(auth.uid()) 
  OR public.has_permission(auth.uid(), 'tab_pos')
  OR EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);