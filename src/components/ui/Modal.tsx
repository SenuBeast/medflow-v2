import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
    title: string;
    children: ReactNode;
    onClose: () => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    footer?: ReactNode;
}

const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

export function Modal({ title, children, onClose, size = 'md', footer }: ModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Blur backdrop */}
            <div
                className="absolute inset-0 bg-bg-overlay backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Glass panel */}
            <div
                className={clsx(
                    'relative w-full animate-fade-in',
                    sizeMap[size],
                    'bg-card/95',
                    'backdrop-blur-xl',
                    'border border-border-main',
                    'rounded-2xl shadow-2xl',
                    'flex flex-col',
                    'max-h-[90vh]'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-dim/50">
                    <h2 className="text-lg font-bold text-text-main">{title}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        title="Close"
                        className="p-1.5 rounded-lg text-text-dim hover:text-text-main hover:bg-surface transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-border-dim/50 flex items-center justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
