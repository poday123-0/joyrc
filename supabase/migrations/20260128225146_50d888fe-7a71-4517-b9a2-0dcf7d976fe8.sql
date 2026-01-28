-- Add old_price column to products table for sale price display
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS old_price numeric DEFAULT NULL;