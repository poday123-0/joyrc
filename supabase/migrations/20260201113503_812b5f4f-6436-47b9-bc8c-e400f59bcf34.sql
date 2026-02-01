-- Add confirmed_by column to track who confirmed/approved the order
ALTER TABLE public.orders 
ADD COLUMN confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.confirmed_by IS 'User ID of admin/staff who confirmed the payment';