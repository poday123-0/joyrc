-- Add home page content fields to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS feature_1_icon text DEFAULT '🚗',
ADD COLUMN IF NOT EXISTS feature_1_title text DEFAULT 'Premium Quality',
ADD COLUMN IF NOT EXISTS feature_1_description text DEFAULT 'Every toy is crafted with precision and built to last through countless adventures.',
ADD COLUMN IF NOT EXISTS feature_2_icon text DEFAULT '🎮',
ADD COLUMN IF NOT EXISTS feature_2_title text DEFAULT 'Easy Control',
ADD COLUMN IF NOT EXISTS feature_2_description text DEFAULT 'Intuitive controls designed for beginners and exciting enough for experts.',
ADD COLUMN IF NOT EXISTS feature_3_icon text DEFAULT '🔋',
ADD COLUMN IF NOT EXISTS feature_3_title text DEFAULT 'Long Battery Life',
ADD COLUMN IF NOT EXISTS feature_3_description text DEFAULT 'Extended playtime with powerful batteries that keep the fun going.',
ADD COLUMN IF NOT EXISTS cta_title text DEFAULT 'Ready to start your RC adventure?',
ADD COLUMN IF NOT EXISTS cta_subtitle text DEFAULT 'Join thousands of happy customers who''ve discovered the thrill of remote control.',
ADD COLUMN IF NOT EXISTS cta_button_text text DEFAULT 'Browse Collection';