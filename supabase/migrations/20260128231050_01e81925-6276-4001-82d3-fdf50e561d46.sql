-- Add google_login_enabled column to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN google_login_enabled boolean DEFAULT true;