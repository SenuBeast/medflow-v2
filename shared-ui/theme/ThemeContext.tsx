import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
    theme: ThemeMode;
    setTheme: (mode: ThemeMode) => void;
    /** The actual resolved theme ('light' | 'dark') */
    resolvedTheme: 'light' | 'dark';
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const STORAGE_KEY = 'mf-theme';
export const BROADCAST_CHANNEL = 'mf-theme-sync';

export function useThemeContext() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
}
