-- Allow admins to create orders for any user (needed for Quick POS)
CREATE POLICY "Admins can create orders for any user" 
ON public.orders 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid())
);