
-- Add order_number column to orders table
ALTER TABLE public.orders ADD COLUMN order_number text UNIQUE;

-- Create function to generate order numbers in RCJOY/YY/MM/00001 format
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year text;
  current_month text;
  next_seq int;
  new_order_number text;
BEGIN
  -- If order_number is already set (custom), skip generation
  IF NEW.order_number IS NOT NULL AND NEW.order_number != '' THEN
    RETURN NEW;
  END IF;

  current_year := to_char(now(), 'YY');
  current_month := to_char(now(), 'MM');

  -- Count existing orders this month to determine sequence
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_number LIKE 'RCJOY/' || current_year || '/' || current_month || '/%'
      THEN CAST(split_part(order_number, '/', 4) AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO next_seq
  FROM public.orders
  WHERE order_number LIKE 'RCJOY/' || current_year || '/' || current_month || '/%';

  new_order_number := 'RCJOY/' || current_year || '/' || current_month || '/' || lpad(next_seq::text, 5, '0');

  NEW.order_number := new_order_number;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate order numbers on insert
CREATE TRIGGER trigger_generate_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- Backfill existing orders with order numbers based on their created_at date
DO $$
DECLARE
  r RECORD;
  yr text;
  mo text;
  seq int;
BEGIN
  FOR r IN (SELECT id, created_at FROM public.orders WHERE order_number IS NULL ORDER BY created_at ASC)
  LOOP
    yr := to_char(r.created_at, 'YY');
    mo := to_char(r.created_at, 'MM');
    
    SELECT COALESCE(MAX(
      CASE 
        WHEN order_number LIKE 'RCJOY/' || yr || '/' || mo || '/%'
        THEN CAST(split_part(order_number, '/', 4) AS integer)
        ELSE 0
      END
    ), 0) + 1
    INTO seq
    FROM public.orders
    WHERE order_number LIKE 'RCJOY/' || yr || '/' || mo || '/%';
    
    UPDATE public.orders 
    SET order_number = 'RCJOY/' || yr || '/' || mo || '/' || lpad(seq::text, 5, '0')
    WHERE id = r.id;
  END LOOP;
END;
$$;
