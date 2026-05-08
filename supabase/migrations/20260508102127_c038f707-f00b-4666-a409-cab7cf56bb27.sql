ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS pos_staff_max_discount_percent numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pos_staff_max_discount_amount numeric NOT NULL DEFAULT 0;