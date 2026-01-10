-- Support content table for admin-editable FAQ and contact info
CREATE TABLE public.support_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL, -- 'faq', 'contact_info', 'business_hours'
  title text NOT NULL,
  content text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Contact messages from customers
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  mobile text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new', -- 'new', 'read', 'replied', 'closed'
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Support content policies
CREATE POLICY "Everyone can view active support content"
ON public.support_content
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage support content"
ON public.support_content
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Contact messages policies
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage contact messages"
ON public.contact_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at triggers
CREATE TRIGGER update_support_content_updated_at
BEFORE UPDATE ON public.support_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_messages_updated_at
BEFORE UPDATE ON public.contact_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Clean up any existing demo products
DELETE FROM public.product_images WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.product_specifications WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.order_items WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.products;
DELETE FROM public.categories;

-- Insert default support content
INSERT INTO public.support_content (type, title, content, sort_order) VALUES
('contact_info', 'email', 'support@rcjoy.com', 1),
('contact_info', 'phone', '+960 123 4567', 2),
('contact_info', 'address', 'RC Joy Store, Male, Maldives', 3),
('business_hours', 'weekdays', '9:00 AM - 6:00 PM', 1),
('business_hours', 'saturday', '10:00 AM - 4:00 PM', 2),
('business_hours', 'sunday', 'Closed', 3),
('faq', 'What is the return policy?', 'We offer a 7-day return policy for all unused items in their original packaging. Simply contact our support team to initiate a return.', 1),
('faq', 'How long does shipping take?', 'Local delivery in Male takes 1-2 days. Atolls delivery takes 3-5 business days depending on ferry schedules.', 2),
('faq', 'Do you offer warranties?', 'Yes! All our products come with a 1-year manufacturer warranty covering defects.', 3),
('faq', 'What payment methods do you accept?', 'We accept bank transfers (BML, MIB) with receipt upload confirmation.', 4);