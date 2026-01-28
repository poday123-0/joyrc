-- Add category_id column to featured_products table for category filtering
ALTER TABLE public.featured_products 
ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.featured_products.category_id IS 'Category to filter by when clicking this featured product on homepage';