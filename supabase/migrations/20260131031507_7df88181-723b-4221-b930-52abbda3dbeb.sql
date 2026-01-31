-- Add stock-related detail columns to transactions table
ALTER TABLE public.transactions
ADD COLUMN product_name text,
ADD COLUMN unit_purchase_price numeric,
ADD COLUMN shipping_cost numeric,
ADD COLUMN other_costs numeric,
ADD COLUMN quantity integer,
ADD COLUMN added_by uuid REFERENCES auth.users(id);

-- Add index for better performance
CREATE INDEX idx_transactions_added_by ON public.transactions(added_by);