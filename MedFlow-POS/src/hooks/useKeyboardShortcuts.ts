import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Support formats like "F2", "Enter", "Escape", "Ctrl+s", etc.
            const key = e.key;

            if (shortcuts[key]) {
                // If focus is inside an input, only intercept Fn keys or Esc,
                // otherwise we'd block normal typing
                const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
                if (!isInput || key.startsWith('F') || key === 'Escape') {
                    e.preventDefault();
                    shortcuts[key]();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
