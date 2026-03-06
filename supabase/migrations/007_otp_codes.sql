-- 007_otp_codes.sql

-- 1. Create table structure
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_expires_at ON public.otp_codes(email, expires_at);

-- 3. Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Only service_role (Edge Functions) can manage these records
CREATE POLICY "Service role has full access to otp_codes"
ON public.otp_codes
FOR ALL
USING (auth.uid() IS NULL); -- In Edge functions with service role, auth.uid() is null but it bypasses RLS anyway if using service_role key.

-- Allow no access to authenticated or anon users
CREATE POLICY "Deny anon access to otp_codes"
ON public.otp_codes
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny authenticated access to otp_codes"
ON public.otp_codes
FOR ALL
TO authenticated
USING (false);

-- 5. Auto-cleanup function to remove old codes (optional, but good practice)
-- Delete codes older than 24 hours to keep the table small
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE created_at < now() - interval '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger cleanup occasionally (e.g. on inserts)
DROP TRIGGER IF EXISTS trigger_cleanup_otp_codes ON public.otp_codes;
CREATE TRIGGER trigger_cleanup_otp_codes
AFTER INSERT ON public.otp_codes
EXECUTE FUNCTION cleanup_expired_otp_codes();
