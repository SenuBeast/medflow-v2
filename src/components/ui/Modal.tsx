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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
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
                    'rounded-t-2xl sm:rounded-2xl shadow-2xl',
                    'flex flex-col',
                    'max-h-[95vh] sm:max-h-[90vh]'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border-dim/50">
                    <h2 className="text-base md:text-lg font-bold text-text-main">{title}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        title="Close"
                        className="p-1.5 rounded-lg text-text-dim hover:text-text-main hover:bg-surface transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-4 md:px-6 py-3 md:py-4 border-t border-border-dim/50 flex items-center justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
