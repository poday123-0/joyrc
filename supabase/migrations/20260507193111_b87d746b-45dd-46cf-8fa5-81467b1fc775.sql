
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS notification_phone text;
