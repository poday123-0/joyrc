
-- Add hidden_from_shop column to products table
ALTER TABLE public.products ADD COLUMN hidden_from_shop boolean NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.products.hidden_from_shop IS 'When true, product is hidden from customer-facing pages but still available in POS';
