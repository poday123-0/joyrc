-- Add cost tracking columns to stock_history table
ALTER TABLE public.stock_history 
ADD COLUMN IF NOT EXISTS unit_purchase_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS other_expenses numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS expense_notes text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_expense numeric DEFAULT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN public.stock_history.unit_purchase_price IS 'Purchase price per unit';
COMMENT ON COLUMN public.stock_history.shipping_cost IS 'Shipping/freight cost for this stock addition';
COMMENT ON COLUMN public.stock_history.other_expenses IS 'Other related expenses (customs, handling, etc.)';
COMMENT ON COLUMN public.stock_history.expense_notes IS 'Description of the expenses';
COMMENT ON COLUMN public.stock_history.total_expense IS 'Total expense for this stock entry';