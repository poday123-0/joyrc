-- Add notification email column to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS notification_email text DEFAULT NULL;

-- Add notification email sender name
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS notification_sender_name text DEFAULT 'RC Joy';