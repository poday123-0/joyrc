-- Add order_id column to stock_history table
ALTER TABLE public.stock_history 
ADD COLUMN order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_stock_history_order_id ON public.stock_history(order_id);

-- Create index on created_by for user lookups
CREATE INDEX idx_stock_history_created_by ON public.stock_history(created_by);