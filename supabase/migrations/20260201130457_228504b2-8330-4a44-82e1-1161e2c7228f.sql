-- Drop and recreate the INSERT policy for orders with proper function calls
DROP POLICY IF EXISTS "Users and admins can create orders" ON public.orders;

CREATE POLICY "Users and admins can create orders" 
ON public.orders 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::public.app_role) 
  OR public.is_super_admin(auth.uid()) 
  OR public.has_permission(auth.uid(), 'tab_pos')
);