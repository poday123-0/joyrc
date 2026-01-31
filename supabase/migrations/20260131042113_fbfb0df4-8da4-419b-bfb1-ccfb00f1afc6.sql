-- Drop and recreate the INSERT policy
DROP POLICY IF EXISTS "Public can submit contact messages" ON public.contact_messages;

-- Create a simpler INSERT policy that doesn't depend on auth functions
CREATE POLICY "Anyone can submit messages" 
ON public.contact_messages 
AS PERMISSIVE
FOR INSERT 
TO public
WITH CHECK (true);