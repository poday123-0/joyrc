-- Drop all existing policies on contact_messages
DROP POLICY IF EXISTS "Public can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins and staff can manage messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.contact_messages;

-- Create PERMISSIVE INSERT policy that allows anyone to submit messages
CREATE POLICY "Public can submit contact messages" 
ON public.contact_messages 
AS PERMISSIVE
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Create PERMISSIVE SELECT policy for admins and staff
CREATE POLICY "Admins and staff can select messages" 
ON public.contact_messages 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_messages')
);

-- Create PERMISSIVE UPDATE policy for admins and staff
CREATE POLICY "Admins and staff can update messages" 
ON public.contact_messages 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_messages')
);

-- Create PERMISSIVE DELETE policy for admins and staff
CREATE POLICY "Admins and staff can delete messages" 
ON public.contact_messages 
AS PERMISSIVE
FOR DELETE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_messages')
);

-- Users can view their own messages
CREATE POLICY "Users can view own messages" 
ON public.contact_messages 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own messages
CREATE POLICY "Users can update own messages" 
ON public.contact_messages 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());