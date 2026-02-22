
-- Add cost_price to product_colors for per-variant cost tracking
ALTER TABLE public.product_colors ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;
