import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden bg-surface">
            <Sidebar />
            <main className="flex-1 overflow-y-auto text-text-main">
                <div className="min-h-full p-6 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
