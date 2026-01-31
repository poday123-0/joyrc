-- Create admin_menu_order table to store custom menu arrangements
CREATE TABLE public.admin_menu_order (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_menu_order ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage menu order
CREATE POLICY "Super admins can manage menu order"
  ON public.admin_menu_order
  FOR ALL
  USING (is_super_admin(auth.uid()));

-- Everyone with admin access can view menu order
CREATE POLICY "Admins can view menu order"
  ON public.admin_menu_order
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_admin_menu_order_updated_at
  BEFORE UPDATE ON public.admin_menu_order
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();