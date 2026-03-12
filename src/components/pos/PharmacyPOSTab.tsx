import { useRef, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const POS_URL = import.meta.env.VITE_POS_URL || 'http://localhost:5174';

export function PharmacyPOSTab() {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    const sendToken = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session && iframeRef.current?.contentWindow) {
            console.log('[MedFlow] Sending auth token to POS:', POS_URL);
            iframeRef.current.contentWindow.postMessage(
                {
                    type: 'MEDFLOW_AUTH_TOKEN',
                    accessToken: data.session.access_token,
                    refreshToken: data.session.refresh_token,
                },
                POS_URL
            );
        } else {
            console.warn('[MedFlow] Cannot send token: session or iframe missing');
        }
    };

    useEffect(() => {
        const iframe = iframeRef.current;
        const handleLoad = () => {
            setIsLoading(false);
            sendToken();
        };

        if (iframe) {
            iframe.addEventListener('load', handleLoad);
        }

        return () => {
            iframe?.removeEventListener('load', handleLoad);
        };
    }, []);

    // Listen for events from POS
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Normalize origins for comparison
            const cleanEventOrigin = event.origin.replace(/\/$/, '');
            const cleanPosOrigin = POS_URL.replace(/\/$/, '');

            if (cleanEventOrigin !== cleanPosOrigin) return;

            switch (event.data?.type) {
                case 'POS_WANT_TOKEN':
                    console.log('[MedFlow] POS requested token, sending...');
                    sendToken();
                    break;
                case 'SALE_COMPLETED':
                    console.log('[MedFlow] POS sale completed:', event.data);
                    break;
                case 'POS_READY':
                    console.log('[MedFlow] POS iframe ready');
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <div className="relative h-[calc(100vh-4rem)] w-full">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-primary z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-brand animate-bounce" />
                            <div className="w-2.5 h-2.5 rounded-full bg-brand animate-bounce [animation-delay:75ms]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-brand animate-bounce [animation-delay:150ms]" />
                        </div>
                        <p className="text-sm text-text-secondary">Loading Pharmacy POS...</p>
                    </div>
                </div>
            )}
            <iframe
                ref={iframeRef}
                src={`${POS_URL}?embedded=true`}
                className="w-full h-full border-0 rounded-lg"
                title="Pharmacy POS"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
        </div>
    );
}
