import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'medflow-theme',
    value,
    onThemeChange
}: {
    children: ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
    value?: Theme;
    onThemeChange?: (theme: Theme) => void;
}) {
    const [theme, setThemeState] = useState<Theme>(() => {
        return value || (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    });

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(storageKey, newTheme);
        if (onThemeChange) onThemeChange(newTheme);
    };

    // Sync with value prop (e.g. from DB)
    useEffect(() => {
        if (value && value !== theme) {
            setThemeState(value);
        }
    }, [value, theme]);

    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = () => {
            root.classList.remove('light', 'dark');

            let effectiveTheme: 'light' | 'dark' = 'light';

            if (theme === 'system') {
                effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light';
            } else {
                effectiveTheme = theme;
            }

            root.classList.add(effectiveTheme);
            setResolvedTheme(effectiveTheme);

            // Update color scheme for browser elements
            root.style.colorScheme = effectiveTheme;
        };

        applyTheme();

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') applyTheme();
        };

        mediaQuery.addEventListener('change', handleChange);

        // Listen for cross-tab sync
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === storageKey && e.newValue) {
                setThemeState(e.newValue as Theme);
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [theme, storageKey]);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
