-- Drop existing foreign key constraints and recreate with ON DELETE CASCADE
-- This ensures order_items are automatically deleted when orders are deleted

-- First, drop the existing foreign key on order_items
ALTER TABLE public.order_items 
DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;

-- Recreate with CASCADE delete
ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- For stock_history, set order_id to NULL when order is deleted (preserve history)
ALTER TABLE public.stock_history 
DROP CONSTRAINT IF EXISTS stock_history_order_id_fkey;

ALTER TABLE public.stock_history 
ADD CONSTRAINT stock_history_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- For transactions, cascade delete when order is deleted
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_order_id_fkey;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;