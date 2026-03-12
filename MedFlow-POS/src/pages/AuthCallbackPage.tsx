import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Handles the OAuth redirect from Supabase for the POS app (standalone mode).
 */
export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        async function handleCallback() {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error || !data.session?.user) {
                    console.error('[AuthCallback] No session:', error);
                    navigate('/login', { replace: true });
                    return;
                }

                console.log('[AuthCallback] Session restored, redirecting to POS...');
                navigate('/', { replace: true });
            } catch (err) {
                console.error('[AuthCallback] Error:', err);
                navigate('/login', { replace: true });
            }
        }

        handleCallback();
    }, [navigate]);

    return (
        <div className="flex h-screen items-center justify-center bg-pos-bg">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-pos-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-pos-text-muted font-mono uppercase tracking-widest text-sm">Synchronizing Session...</p>
            </div>
        </div>
    );
}
