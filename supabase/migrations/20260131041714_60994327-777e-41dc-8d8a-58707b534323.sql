-- Drop the existing restrictive INSERT policy for contact_messages
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;

-- Create a new INSERT policy that allows anyone (including anonymous) to submit messages
CREATE POLICY "Anyone can submit contact messages" 
ON public.contact_messages 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);