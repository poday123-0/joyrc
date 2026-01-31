-- Add mobile_number column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mobile_number text;