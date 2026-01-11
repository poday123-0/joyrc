-- Create product_colors table to store color variants for each product
CREATE TABLE public.product_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view product colors" 
ON public.product_colors 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage product colors" 
ON public.product_colors 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_product_colors_product_id ON public.product_colors(product_id);