-- Create email_templates table for storing editable email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  description TEXT,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view active templates (needed for edge functions)
CREATE POLICY "Everyone can view email templates"
ON public.email_templates
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default email templates
INSERT INTO public.email_templates (template_key, name, subject, html_content, description, variables) VALUES
(
  'order_confirmation',
  'Order Confirmation',
  'Order Confirmed - {{order_id}}',
  '<h1>Thank you for your order!</h1><p>Hi {{customer_name}},</p><p>Your order #{{order_id}} has been confirmed.</p><p><strong>Total:</strong> {{order_total}}</p><p>We''ll notify you when your order ships.</p><p>Thank you for shopping with us!</p>',
  'Sent to customers when they place an order',
  ARRAY['customer_name', 'order_id', 'order_total']
),
(
  'order_shipped',
  'Order Shipped',
  'Your Order Has Shipped - {{order_id}}',
  '<h1>Your order is on its way!</h1><p>Hi {{customer_name}},</p><p>Great news! Your order #{{order_id}} has been shipped.</p><p>You can track your delivery or contact us if you have any questions.</p><p>Thank you for your patience!</p>',
  'Sent when order status changes to shipped',
  ARRAY['customer_name', 'order_id']
),
(
  'order_delivered',
  'Order Delivered',
  'Your Order Has Been Delivered - {{order_id}}',
  '<h1>Your order has arrived!</h1><p>Hi {{customer_name}},</p><p>Your order #{{order_id}} has been delivered.</p><p>We hope you love your purchase! If you have any questions, feel free to reach out.</p><p>Thank you for shopping with us!</p>',
  'Sent when order is marked as delivered',
  ARRAY['customer_name', 'order_id']
),
(
  'payment_confirmed',
  'Payment Confirmed',
  'Payment Received - {{order_id}}',
  '<h1>Payment Confirmed!</h1><p>Hi {{customer_name}},</p><p>We''ve received your payment for order #{{order_id}}.</p><p><strong>Amount:</strong> {{order_total}}</p><p>Your order is now being processed.</p><p>Thank you!</p>',
  'Sent when admin confirms payment',
  ARRAY['customer_name', 'order_id', 'order_total']
),
(
  'new_order_admin',
  'New Order (Admin)',
  'New Order Received - {{order_id}}',
  '<h1>New Order Received</h1><p>A new order has been placed.</p><p><strong>Order ID:</strong> {{order_id}}</p><p><strong>Customer:</strong> {{customer_name}} ({{customer_email}})</p><p><strong>Total:</strong> {{order_total}}</p><p><strong>Items:</strong></p>{{order_items}}<p>Please log in to the admin panel to process this order.</p>',
  'Sent to admin email when a new order is placed',
  ARRAY['order_id', 'customer_name', 'customer_email', 'order_total', 'order_items']
);

-- Create marketing_emails table for sent campaign tracking
CREATE TABLE public.marketing_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  sent_by UUID NOT NULL,
  sent_to_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_emails ENABLE ROW LEVEL SECURITY;

-- Admins can manage marketing emails
CREATE POLICY "Admins can manage marketing emails"
ON public.marketing_emails
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));