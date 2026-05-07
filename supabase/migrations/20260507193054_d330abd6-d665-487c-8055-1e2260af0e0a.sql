
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS send_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS send_sms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_content text NOT NULL DEFAULT '';
