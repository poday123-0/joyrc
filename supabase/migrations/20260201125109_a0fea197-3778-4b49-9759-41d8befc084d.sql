-- Drop existing INSERT policies on orders
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can create orders for any user" ON public.orders;

-- Create a single comprehensive INSERT policy
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
);