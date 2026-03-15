
-- Create card_types table for admin to manage card types (Visa, Amex, etc.)
CREATE TABLE public.card_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.card_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage card types" ON public.card_types
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Everyone can view active card types" ON public.card_types
  FOR SELECT TO public
  USING (is_active = true);

-- Add payment detail columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_reference text NULL,
  ADD COLUMN IF NOT EXISTS payment_bank_id uuid NULL REFERENCES public.bank_settings(id),
  ADD COLUMN IF NOT EXISTS payment_card_type_id uuid NULL REFERENCES public.card_types(id);

-- Insert default card types
INSERT INTO public.card_types (name, sort_order) VALUES
  ('Visa', 1),
  ('Mastercard', 2),
  ('Amex', 3);
