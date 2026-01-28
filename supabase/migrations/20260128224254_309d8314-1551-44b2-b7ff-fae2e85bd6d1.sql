-- Create category_images table for related images
CREATE TABLE public.category_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_images ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage category images"
ON public.category_images
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Everyone can view category images"
ON public.category_images
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_category_images_category_id ON public.category_images(category_id);