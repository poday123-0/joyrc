CREATE TABLE IF NOT EXISTS public.sms_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.sms_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms credentials"
ON public.sms_credentials
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));