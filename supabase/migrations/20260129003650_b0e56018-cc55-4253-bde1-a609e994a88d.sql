-- Add website info columns to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS site_title text DEFAULT 'RC Joy - Premium RC Toys',
ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS og_image_url text DEFAULT NULL;