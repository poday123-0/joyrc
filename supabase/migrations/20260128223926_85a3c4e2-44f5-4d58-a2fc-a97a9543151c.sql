-- Add image_url column to categories table for custom category images
ALTER TABLE public.categories
ADD COLUMN image_url text;