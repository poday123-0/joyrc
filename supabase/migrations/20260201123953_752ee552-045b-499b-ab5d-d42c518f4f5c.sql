
-- Drop and recreate the admin insert policy to apply to all roles (like other policies)
DROP POLICY IF EXISTS "Admins can create orders for any user" ON public.orders;

CREATE POLICY "Admins can create orders for any user" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid())
);
