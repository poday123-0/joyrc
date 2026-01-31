-- Add address column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.address IS 'Customer shipping/delivery address';