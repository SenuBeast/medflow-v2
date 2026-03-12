import { supabase } from './supabase';

const MEDFLOW_ORIGIN = import.meta.env.VITE_MEDFLOW_URL || 'http://localhost:5173';

/**
 * Listens for auth tokens sent from MedFlow via postMessage.
 */
export function listenForParentAuth() {
    console.log('[POS] Starting parent auth listener. Expected origin:', MEDFLOW_ORIGIN);
    
    window.addEventListener('message', async (event) => {
        // Normalize origins
        const cleanEventOrigin = event.origin.replace(/\/$/, '');
        const cleanMedflowOrigin = MEDFLOW_ORIGIN.replace(/\/$/, '');

        if (cleanEventOrigin !== cleanMedflowOrigin) {
            if (event.data?.type === 'MEDFLOW_AUTH_TOKEN') {
                console.warn('[POS] Blocked auth message from untrusted origin:', event.origin, 'Expected:', MEDFLOW_ORIGIN);
            }
            return;
        }

        if (event.data?.type !== 'MEDFLOW_AUTH_TOKEN') return;
        
        console.log('[POS] Received auth token from parent');
        const { accessToken, refreshToken } = event.data;
        if (!accessToken || !refreshToken) {
            console.error('[POS] Received empty tokens from parent');
            return;
        }

        try {
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (error) throw error;
            
            console.log('[POS] Session restored from parent token');
            // Notify parent that POS is ready
            window.parent.postMessage({ type: 'POS_READY' }, MEDFLOW_ORIGIN);
        } catch (err) {
            console.error('[POS] Failed to restore session from MedFlow:', err);
        }
    });

    // Automatically request token on start
    requestTokenFromParent();
}

/**
 * Explicitly requests the auth token from the parent.
 * Useful if the parent sent the token before we were ready.
 */
export function requestTokenFromParent() {
    if (window.self === window.top) return;
    console.log('[POS] Requesting token from parent...');
    window.parent.postMessage({ type: 'POS_WANT_TOKEN' }, MEDFLOW_ORIGIN);
}

/**
 * Sends an event to the parent MedFlow app.
 */
export function notifyParent(type: string, data?: Record<string, unknown>) {
    if (window.self === window.top) return;
    window.parent.postMessage({ type, ...data }, MEDFLOW_ORIGIN);
}
