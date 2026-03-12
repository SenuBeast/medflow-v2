import { useRef, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const POS_URL = import.meta.env.VITE_POS_URL || 'http://localhost:5174';

export function PharmacyPOSTab() {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const sendToken = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session && iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage(
                    {
                        type: 'MEDFLOW_AUTH_TOKEN',
                        accessToken: data.session.access_token,
                        refreshToken: data.session.refresh_token,
                    },
                    POS_URL
                );
            }
        };

        const iframe = iframeRef.current;
        if (iframe) {
            iframe.addEventListener('load', () => {
                setIsLoading(false);
                sendToken();
            });
        }

        return () => {
            iframe?.removeEventListener('load', () => sendToken());
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
                    // Could invalidate billing queries, show toast, etc.
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
