-- Remove legacy custom email OTP flow.
-- Native Supabase TOTP MFA is now used for second-factor verification.

DO $$
BEGIN
    IF to_regclass('public.otp_codes') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trigger_cleanup_otp_codes ON public.otp_codes;
    END IF;
END $$;
DROP FUNCTION IF EXISTS public.cleanup_expired_otp_codes();
DROP TABLE IF EXISTS public.otp_codes;
