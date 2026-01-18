-- Create hero_backgrounds table for admin-managed backgrounds
CREATE TABLE public.hero_backgrounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  title TEXT,
  subtitle TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_backgrounds ENABLE ROW LEVEL SECURITY;

-- Public can view active backgrounds
CREATE POLICY "Anyone can view active hero backgrounds"
  ON public.hero_backgrounds
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all backgrounds
CREATE POLICY "Admins can manage hero backgrounds"
  ON public.hero_backgrounds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_hero_backgrounds_updated_at
  BEFORE UPDATE ON public.hero_backgrounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default background
INSERT INTO public.hero_backgrounds (media_url, media_type, title, subtitle, is_active, sort_order)
VALUES 
  ('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80', 'image', 'Ultimate RC Experience', 'Discover the joy of remote control', true, 0);