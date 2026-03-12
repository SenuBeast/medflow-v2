import type { ReactNode } from 'react';

/**
 * Minimal layout for when POS is embedded inside MedFlow.
 * No header, no sidebar, no login — just the POS content.
 */
export function EmbeddedLayout({ children }: { children: ReactNode }) {
    return (
        <div className="h-screen w-screen overflow-hidden bg-pos-bg">
            {children}
        </div>
    );
}
