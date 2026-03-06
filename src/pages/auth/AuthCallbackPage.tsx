import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendOtp } from '../../lib/otp';

async function ensureUserRow(userId: string, email: string, fullName: string): Promise<void> {
    const { data } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

    if (data) return; // already exists

    const { data: viewerRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'Viewer')
        .single();

    if (viewerRole) {
        await supabase.from('users').insert({
            id: userId,
            email,
            full_name: fullName || email.split('@')[0],
            role_id: viewerRole.id,
            is_active: true,
        });
    }
}

/**
 * Handles the OAuth redirect from Supabase after Google login.
 * Exchanges code for session, provisions user if new, fires OTP, then
 * hands off to the existing OTP verification screen on LoginPage.
 */
export function AuthCallbackPage() {
    const navigate = useNavigate();
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        async function handleCallback() {
            try {
                // Finalize the PKCE OAuth session from the URL code
                const { data, error } = await supabase.auth.getSession();
                if (error || !data.session?.user) {
                    console.error('[AuthCallback] No session after OAuth:', error);
                    navigate('/login', { replace: true });
                    return;
                }

                const { user } = data.session;
                const email = user.email ?? '';
                const fullName = (user.user_metadata?.full_name as string) ?? '';

                // Ensure a profile row exists (safe no-op for existing users)
                await ensureUserRow(user.id, email, fullName);

                // Fire OTP to their Google email address
                await sendOtp(email);

                // Hand off to the existing OTP screen
                navigate(`/login?step=otp&email=${encodeURIComponent(email)}`, { replace: true });
            } catch (err) {
                console.error('[AuthCallback] Error:', err);
                navigate('/login', { replace: true });
            }
        }

        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-white font-semibold text-lg">Completing sign-in…</p>
                <p className="text-gray-500 text-sm">Sending your verification code</p>
            </div>
        </div>
    );
}
