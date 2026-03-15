
-- Create a sequence for item codes
CREATE SEQUENCE IF NOT EXISTS public.product_item_code_seq START WITH 1;

-- Set the sequence to start after existing products count
SELECT setval('public.product_item_code_seq', COALESCE((SELECT MAX(CASE WHEN item_code ~ '^\d+$' THEN item_code::integer ELSE 0 END) FROM public.products), 0));

-- Backfill existing products that don't have an item_code (ordered by created_at)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) + COALESCE((SELECT MAX(item_code::integer) FROM public.products WHERE item_code ~ '^\d+$'), 0) as new_code
  FROM public.products
  WHERE item_code IS NULL OR item_code = ''
)
UPDATE public.products p
SET item_code = n.new_code::text
FROM numbered n
WHERE p.id = n.id;

-- Update the sequence to be after the max item_code
SELECT setval('public.product_item_code_seq', COALESCE((SELECT MAX(item_code::integer) FROM public.products WHERE item_code ~ '^\d+$'), 0));

-- Create trigger function to auto-assign item_code on new products
CREATE OR REPLACE FUNCTION public.generate_item_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.item_code IS NULL OR NEW.item_code = '' THEN
    NEW.item_code := nextval('public.product_item_code_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_generate_item_code ON public.products;
CREATE TRIGGER trigger_generate_item_code
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_item_code();
