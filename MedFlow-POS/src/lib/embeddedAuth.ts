import { supabase } from './supabase';

const MEDFLOW_ORIGIN = import.meta.env.VITE_MEDFLOW_URL || 'http://localhost:5173';

/**
 * Listens for auth tokens sent from MedFlow via postMessage.
 * When POS is embedded in MedFlow as an iframe, MedFlow sends
 * the user's JWT so POS can authenticate without a separate login.
 */
export function listenForParentAuth() {
    window.addEventListener('message', async (event) => {
        // Normalize origins: remove trailing slashes for comparison
        const cleanEventOrigin = event.origin.replace(/\/$/, '');
        const cleanMedflowOrigin = MEDFLOW_ORIGIN.replace(/\/$/, '');

        if (cleanEventOrigin !== cleanMedflowOrigin) {
            if (event.data?.type === 'MEDFLOW_AUTH_TOKEN') {
                console.warn('[POS] Blocked auth message from untrusted origin:', event.origin, 'Expected:', MEDFLOW_ORIGIN);
            }
            return;
        }

        if (event.data?.type !== 'MEDFLOW_AUTH_TOKEN') return;

        const { accessToken, refreshToken } = event.data;
        if (!accessToken || !refreshToken) return;

        try {
            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            // Notify parent that POS is ready
            window.parent.postMessage({ type: 'POS_READY' }, MEDFLOW_ORIGIN);
        } catch (err) {
            console.error('[POS] Failed to restore session from MedFlow:', err);
        }
    });
}

/**
 * Sends an event to the parent MedFlow app.
 * No-op when POS is running standalone.
 */
export function notifyParent(type: string, data?: Record<string, unknown>) {
    if (window.self === window.top) return; // not embedded
    window.parent.postMessage({ type, ...data }, MEDFLOW_ORIGIN);
}
