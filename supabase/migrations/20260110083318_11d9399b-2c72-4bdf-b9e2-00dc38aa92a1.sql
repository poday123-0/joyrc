-- Add payment_status and payment_method to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'bank_transfer',
ADD COLUMN IF NOT EXISTS receipt_url text,
ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamp with time zone;

-- Create bank_settings table for admin to configure bank details
CREATE TABLE public.bank_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  branch text,
  swift_code text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on bank_settings
ALTER TABLE public.bank_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active bank settings"
ON public.bank_settings FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage bank settings"
ON public.bank_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create transactions table for income/expenses tracking
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  amount numeric NOT NULL,
  description text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage transactions"
ON public.transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  read boolean DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert notifications for any user"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add is_360 column to product_images for 360° images
ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS is_360 boolean DEFAULT false;

-- Create trigger for transactions updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for bank_settings updated_at
CREATE TRIGGER update_bank_settings_updated_at
BEFORE UPDATE ON public.bank_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();