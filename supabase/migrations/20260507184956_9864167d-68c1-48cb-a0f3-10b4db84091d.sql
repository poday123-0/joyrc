-- Add SMS settings to system_settings
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS sms_login_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_sender_id text DEFAULT 'RCJOY',
  ADD COLUMN IF NOT EXISTS sms_api_key_set boolean DEFAULT false;

-- OTP storage table
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number text NOT NULL,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_mobile ON public.otp_codes(mobile_number);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON public.otp_codes(expires_at);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- No client access at all - only edge functions (service role) can read/write
CREATE POLICY "No client access to otp_codes"
ON public.otp_codes
FOR ALL
USING (false)
WITH CHECK (false);