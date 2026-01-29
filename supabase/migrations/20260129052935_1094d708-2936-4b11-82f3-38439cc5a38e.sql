-- Drop existing update policy
DROP POLICY IF EXISTS "Admins can update settings" ON public.system_settings;

-- Create new policy that allows both admin and super_admin to update
CREATE POLICY "Admins can update settings" 
ON public.system_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Drop existing insert policy  
DROP POLICY IF EXISTS "Admins can insert settings" ON public.system_settings;

-- Create new insert policy that allows both admin and super_admin
CREATE POLICY "Admins can insert settings" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));