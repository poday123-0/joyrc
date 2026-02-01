-- Update stock_history RLS policy to allow staff with tab_pos permission to INSERT
DROP POLICY IF EXISTS "Admins can manage stock history" ON public.stock_history;

CREATE POLICY "Admins and staff can manage stock history" 
ON public.stock_history 
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_pos')
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_pos')
);

-- Update transactions RLS policy to allow staff with tab_pos permission to INSERT
DROP POLICY IF EXISTS "Admins can manage transactions" ON public.transactions;

CREATE POLICY "Admins and staff can manage transactions" 
ON public.transactions 
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_pos')
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_pos')
);