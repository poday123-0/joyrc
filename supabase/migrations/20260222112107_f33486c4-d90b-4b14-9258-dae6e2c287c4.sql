
-- Add cost_price to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- Add stock_quantity to product_colors for per-color inventory tracking
ALTER TABLE public.product_colors ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;
