-- Add delivery assignment columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS assigned_to uuid,
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone;

-- Add delivery permission key for staff
-- Staff with 'delivery' permission can see assigned orders and mark as delivered

-- Create index for faster lookup of assigned orders
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);

-- Update RLS policy to allow assigned staff to view and update their orders
CREATE POLICY "Staff can view their assigned orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = assigned_to);

CREATE POLICY "Staff can update their assigned orders status" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);