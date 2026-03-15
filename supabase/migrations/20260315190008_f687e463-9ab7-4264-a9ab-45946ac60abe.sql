
-- Add order_number_prefix column to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS order_number_prefix text DEFAULT 'RCJOY';

-- Update generate_order_number function to use the prefix from system_settings
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_year text;
  current_month text;
  next_seq int;
  new_order_number text;
  prefix text;
BEGIN
  -- If order_number is already set (custom), skip generation
  IF NEW.order_number IS NOT NULL AND NEW.order_number != '' THEN
    RETURN NEW;
  END IF;

  -- Get prefix from system_settings
  SELECT COALESCE(order_number_prefix, 'RCJOY') INTO prefix
  FROM public.system_settings
  LIMIT 1;

  -- Fallback if no settings exist
  IF prefix IS NULL OR prefix = '' THEN
    prefix := 'RCJOY';
  END IF;

  current_year := to_char(now(), 'YY');
  current_month := to_char(now(), 'MM');

  -- Count existing orders this month to determine sequence
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_number LIKE prefix || '/' || current_year || '/' || current_month || '/%'
      THEN CAST(split_part(order_number, '/', 4) AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO next_seq
  FROM public.orders
  WHERE order_number LIKE prefix || '/' || current_year || '/' || current_month || '/%';

  new_order_number := prefix || '/' || current_year || '/' || current_month || '/' || lpad(next_seq::text, 5, '0');

  NEW.order_number := new_order_number;
  RETURN NEW;
END;
$function$;
