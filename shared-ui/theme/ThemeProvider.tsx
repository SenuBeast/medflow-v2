import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, STORAGE_KEY, BROADCAST_CHANNEL } from './ThemeContext';
import type { ThemeMode } from './ThemeContext';

// ── Helper: apply to document ──────────────────────────────
function applyTheme(mode: ThemeMode): 'light' | 'dark' {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
    return isDark ? 'dark' : 'light';
}

// ── Provider ───────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>(() => {
        try {
            return (localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? 'system';
        } catch {
            return 'system';
        }
    });

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
        applyTheme((localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? 'system')
    );

    // Persist + apply on change
    function setTheme(mode: ThemeMode) {
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch { /* ignore in SSR/private browsing */ }

        setThemeState(mode);
        const resolved = applyTheme(mode);
        setResolvedTheme(resolved);

        // Broadcast to other tabs
        try {
            const channel = new BroadcastChannel(BROADCAST_CHANNEL);
            channel.postMessage(mode);
            channel.close();
        } catch { /* BroadcastChannel not available */ }
    }

    // Listen for OS preference changes (only relevant in 'system' mode)
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (theme === 'system') {
                const resolved = applyTheme('system');
                setResolvedTheme(resolved);
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    // Listen for changes from other tabs
    useEffect(() => {
        let channel: BroadcastChannel;
        try {
            channel = new BroadcastChannel(BROADCAST_CHANNEL);
            channel.onmessage = (e: MessageEvent<ThemeMode>) => {
                const incoming = e.data;
                setThemeState(incoming);
                const resolved = applyTheme(incoming);
                setResolvedTheme(resolved);
                try { localStorage.setItem(STORAGE_KEY, incoming); } catch { /* ignore */ }
            };
        } catch { /* not available */ }
        return () => channel?.close();
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
