-- Add policy for admins to create order items for any order
CREATE POLICY "Admins can create order items for any order" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid())
);