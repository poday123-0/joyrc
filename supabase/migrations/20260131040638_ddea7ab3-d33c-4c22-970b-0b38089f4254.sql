-- Update contact_messages RLS to allow staff with tab_messages permission
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;

CREATE POLICY "Admins and authorized staff can manage contact messages" 
ON public.contact_messages 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid())
  OR has_permission(auth.uid(), 'tab_messages')
);

-- Add user_id column to contact_messages for linking to customer accounts
ALTER TABLE public.contact_messages 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS email text;

-- Create message_replies table for conversation threads
CREATE TABLE IF NOT EXISTS public.message_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  reply_text text NOT NULL,
  replied_by uuid REFERENCES auth.users(id),
  is_admin_reply boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on message_replies
ALTER TABLE public.message_replies ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and authorized staff can manage all replies
CREATE POLICY "Admins and staff can manage replies" 
ON public.message_replies 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_super_admin(auth.uid())
  OR has_permission(auth.uid(), 'tab_messages')
);

-- Policy: Users can view replies on their own messages
CREATE POLICY "Users can view their message replies" 
ON public.message_replies 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.contact_messages 
    WHERE contact_messages.id = message_replies.message_id 
    AND contact_messages.user_id = auth.uid()
  )
);

-- Policy: Users can add replies to their own messages (customer replies)
CREATE POLICY "Users can reply to their messages" 
ON public.message_replies 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contact_messages 
    WHERE contact_messages.id = message_replies.message_id 
    AND contact_messages.user_id = auth.uid()
  )
);

-- Update contact_messages policy to allow users to view their own messages
CREATE POLICY "Users can view their own messages" 
ON public.contact_messages 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow users to update their own messages (for adding user replies)
CREATE POLICY "Users can update their own messages" 
ON public.contact_messages 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_message_replies_message_id ON public.message_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON public.contact_messages(user_id);