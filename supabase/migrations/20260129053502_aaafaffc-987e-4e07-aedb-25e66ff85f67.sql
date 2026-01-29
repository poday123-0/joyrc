-- Update email_templates policy
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates" 
ON public.email_templates FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update categories policy
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" 
ON public.categories FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update hero_backgrounds policy
DROP POLICY IF EXISTS "Admins can manage hero backgrounds" ON public.hero_backgrounds;
CREATE POLICY "Admins can manage hero backgrounds" 
ON public.hero_backgrounds FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update transactions policy
DROP POLICY IF EXISTS "Admins can manage transactions" ON public.transactions;
CREATE POLICY "Admins can manage transactions" 
ON public.transactions FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update bank_settings policy
DROP POLICY IF EXISTS "Admins can manage bank settings" ON public.bank_settings;
CREATE POLICY "Admins can manage bank settings" 
ON public.bank_settings FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update footer_links policy
DROP POLICY IF EXISTS "Admins can manage footer links" ON public.footer_links;
CREATE POLICY "Admins can manage footer links" 
ON public.footer_links FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update orders policies
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" 
ON public.orders FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders" 
ON public.orders FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update video_showcases policy
DROP POLICY IF EXISTS "Admins can manage video showcases" ON public.video_showcases;
CREATE POLICY "Admins can manage video showcases" 
ON public.video_showcases FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update user_roles policy
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" 
ON public.user_roles FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update notifications policies
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins can manage all notifications" 
ON public.notifications FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON public.notifications;
CREATE POLICY "Admins can insert notifications for any user" 
ON public.notifications FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update contact_messages policy
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;
CREATE POLICY "Admins can manage contact messages" 
ON public.contact_messages FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update support_content policy
DROP POLICY IF EXISTS "Admins can manage support content" ON public.support_content;
CREATE POLICY "Admins can manage support content" 
ON public.support_content FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update marketing_emails policy
DROP POLICY IF EXISTS "Admins can manage marketing emails" ON public.marketing_emails;
CREATE POLICY "Admins can manage marketing emails" 
ON public.marketing_emails FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Update featured_products policy
DROP POLICY IF EXISTS "Admins can manage featured products" ON public.featured_products;
CREATE POLICY "Admins can manage featured products" 
ON public.featured_products FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));