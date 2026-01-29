-- Add color_id column to product_images table to associate images with specific colors
ALTER TABLE public.product_images 
ADD COLUMN color_id uuid REFERENCES public.product_colors(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_product_images_color_id ON public.product_images(color_id);