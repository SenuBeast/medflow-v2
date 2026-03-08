import { Sun, Moon } from 'lucide-react';
import { useTheme } from './useTheme';

interface ThemeToggleProps {
    className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const Icon = isDark ? Moon : Sun;

    return (
        <button
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`
                flex items-center justify-center p-2.5 rounded-xl
                transition-all duration-200
                bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]
                text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                hover:bg-[var(--color-bg-primary)] hover:border-[var(--color-accent)]
                hover:shadow-sm group
                ${className}
            `}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
            <Icon
                size={18}
                className="transition-transform duration-300 group-hover:rotate-12"
            />
        </button>
    );
}
