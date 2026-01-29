-- Add footer settings columns to system_settings
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS footer_copyright text DEFAULT '© 2024 RC Joy. All rights reserved.',
ADD COLUMN IF NOT EXISTS footer_company_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS footer_address text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS footer_phone text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS footer_email text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS footer_social_facebook text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS footer_social_instagram text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS footer_social_twitter text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS footer_social_youtube text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS footer_social_linkedin text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS footer_social_pinterest text DEFAULT NULL;

-- Create footer_links table for customizable link columns
CREATE TABLE public.footer_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_title text NOT NULL,
  link_label text NOT NULL,
  link_url text NOT NULL,
  sort_order integer DEFAULT 0,
  column_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage footer links"
ON public.footer_links
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view active footer links"
ON public.footer_links
FOR SELECT
USING (is_active = true);