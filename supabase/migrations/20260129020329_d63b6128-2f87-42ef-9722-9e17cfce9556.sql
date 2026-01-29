-- Add icon column to product_specifications table
ALTER TABLE public.product_specifications 
ADD COLUMN icon text DEFAULT NULL;