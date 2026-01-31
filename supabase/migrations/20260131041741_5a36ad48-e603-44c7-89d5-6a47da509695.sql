-- Drop all existing policies on contact_messages and recreate them properly
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins and authorized staff can manage contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.contact_messages;

-- Allow anyone (authenticated or not) to insert messages
CREATE POLICY "Public can submit contact messages" 
ON public.contact_messages 
FOR INSERT 
WITH CHECK (true);

-- Admins and staff with tab_messages permission can manage all messages
CREATE POLICY "Admins and staff can manage messages" 
ON public.contact_messages 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'tab_messages')
);

-- Users can view their own messages (when user_id is set)
CREATE POLICY "Users can view own messages" 
ON public.contact_messages 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can update their own messages
CREATE POLICY "Users can update own messages" 
ON public.contact_messages 
FOR UPDATE 
USING (user_id = auth.uid());