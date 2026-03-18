import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { rehydrateAuthFromSession } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';

export function AuthCallbackPage() {
    const navigate = useNavigate();
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        async function handleCallback() {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error || !data.session?.user) {
                    navigate('/login', { replace: true });
                    return;
                }

                const initialized = await rehydrateAuthFromSession();
                if (!initialized) {
                    navigate('/login', { replace: true });
                    return;
                }

                if (useAuthStore.getState().isTwoFactorVerified) {
                    navigate('/dashboard', { replace: true });
                    return;
                }

                navigate('/verify-2fa', { replace: true });
            } catch {
                navigate('/login', { replace: true });
            }
        }

        void handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-white font-semibold text-lg">Completing sign-in...</p>
                <p className="text-text-sub text-sm">Checking account access</p>
            </div>
        </div>
    );
}
