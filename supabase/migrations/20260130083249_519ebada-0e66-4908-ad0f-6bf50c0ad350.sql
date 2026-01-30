-- Create staff permissions table for granular access control
CREATE TABLE public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for staff_permissions
CREATE POLICY "Admins can manage staff permissions"
  ON public.staff_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own permissions"
  ON public.staff_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Add stock_quantity column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

-- Create stock history table
CREATE TABLE public.stock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  change_amount integer NOT NULL,
  change_type text NOT NULL, -- 'manual_adjustment', 'sale', 'restock', 'initial'
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;

-- Policies for stock_history
CREATE POLICY "Admins can manage stock history"
  ON public.stock_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Everyone can view stock history"
  ON public.stock_history FOR SELECT
  USING (true);

-- Create function to check staff permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_permissions
    WHERE user_id = _user_id
      AND permission_key = _permission
  ) OR has_role(_user_id, 'admin'::app_role) OR is_super_admin(_user_id)
$$;