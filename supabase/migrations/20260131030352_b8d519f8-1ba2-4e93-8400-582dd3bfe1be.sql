-- Create preorders table for tracking pre-order requests
CREATE TABLE public.preorders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;

-- Anyone can create a pre-order request
CREATE POLICY "Anyone can create preorder requests"
  ON public.preorders
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own preorders
CREATE POLICY "Users can view their own preorders"
  ON public.preorders
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can manage all preorders
CREATE POLICY "Admins can manage preorders"
  ON public.preorders
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_preorders_updated_at
  BEFORE UPDATE ON public.preorders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();