import { supabase } from './supabase';

export interface VerifyOtpResult {
    valid: boolean;
    error?: 'invalid' | 'expired' | 'locked';
}

/**
 * Masks an email for display (e.g., 'john.doe@gmail.com' -> 'j***e@gmail.com')
 */
export function maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;

    const first = local[0];
    const last = local[local.length - 1];
    return `${first}***${last}@${domain}`;
}

/**
 * Calls the send-otp edge function to generate and email a new code.
 */
export async function sendOtp(email: string): Promise<void> {
    const { error } = await supabase.functions.invoke('send-otp', {
        body: { email }
    });

    if (error) {
        throw new Error(error.message || 'Failed to send OTP code');
    }
}

/**
 * Calls the verify-otp edge function to validate a user's code.
 */
export async function verifyOtp(email: string, code: string): Promise<VerifyOtpResult> {
    const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email, code }
    });

    if (error) {
        throw new Error(error.message || 'Verification failed due to network error');
    }

    return data as VerifyOtpResult;
}
