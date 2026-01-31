-- Add item_code column to products table
ALTER TABLE public.products 
ADD COLUMN item_code text UNIQUE;

-- Add color fields to order_items table
ALTER TABLE public.order_items 
ADD COLUMN color_id uuid REFERENCES public.product_colors(id) ON DELETE SET NULL,
ADD COLUMN color_name text,
ADD COLUMN color_hex text;

-- Create index on item_code for faster lookups
CREATE INDEX idx_products_item_code ON public.products(item_code);