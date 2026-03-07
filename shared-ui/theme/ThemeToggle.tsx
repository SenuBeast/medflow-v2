import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { clsx } from 'clsx';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit border border-gray-200 dark:border-gray-700 transition-colors">
            <button
                onClick={() => setTheme('light')}
                className={clsx(
                    'p-2 rounded-lg transition-all',
                    theme === 'light'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                )}
                title="Light Mode"
            >
                <Sun size={14} />
            </button>
            <button
                onClick={() => setTheme('dark')}
                className={clsx(
                    'p-2 rounded-lg transition-all',
                    theme === 'dark'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                )}
                title="Dark Mode"
            >
                <Moon size={14} />
            </button>
            <button
                onClick={() => setTheme('system')}
                className={clsx(
                    'p-2 rounded-lg transition-all',
                    theme === 'system'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                )}
                title="System Setting"
            >
                <Monitor size={14} />
            </button>
        </div>
    );
}
