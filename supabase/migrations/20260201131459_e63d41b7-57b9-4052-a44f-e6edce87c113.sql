-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users and admins can create orders" ON public.orders;

-- Create a more permissive INSERT policy for POS staff
CREATE POLICY "Users and admins can create orders" 
ON public.orders 
FOR INSERT
TO authenticated
WITH CHECK (
  -- User creating their own order
  (auth.uid() = user_id) 
  OR 
  -- Admin creating order for anyone
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  is_super_admin(auth.uid()) 
  OR 
  -- Staff with POS permission can create orders for any customer
  has_permission(auth.uid(), 'tab_pos')
);

-- Also need to add SELECT policy for staff with tab_pos to see orders they create
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid())
  OR has_permission(auth.uid(), 'tab_pos')
);