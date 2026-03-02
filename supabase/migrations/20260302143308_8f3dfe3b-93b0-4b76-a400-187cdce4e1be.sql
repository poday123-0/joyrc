
-- Fix stock_history RLS: add tab_stock permission for staff
DROP POLICY IF EXISTS "Admins and staff can manage stock history" ON public.stock_history;
CREATE POLICY "Admins and staff can manage stock history"
ON public.stock_history
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_pos'::text)
  OR has_permission(auth.uid(), 'tab_stock'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_pos'::text)
  OR has_permission(auth.uid(), 'tab_stock'::text)
);

-- Fix transactions RLS: add tab_stock permission for staff
DROP POLICY IF EXISTS "Admins and staff can manage transactions" ON public.transactions;
CREATE POLICY "Admins and staff can manage transactions"
ON public.transactions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_pos'::text)
  OR has_permission(auth.uid(), 'tab_stock'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_pos'::text)
  OR has_permission(auth.uid(), 'tab_stock'::text)
);

-- Fix order_items RLS: add tab_stock permission for staff insert
DROP POLICY IF EXISTS "Authorized users can create order items" ON public.order_items;
CREATE POLICY "Authorized users can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_pos'::text)
  OR has_permission(auth.uid(), 'tab_stock'::text)
  OR (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ))
);
