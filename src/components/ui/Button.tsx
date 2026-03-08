import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: ReactNode;
    children: ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    children,
    className,
    disabled,
    ...props
}: ButtonProps) {
    const base =
        'inline-flex items-center gap-2 font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary:
            'bg-brand hover:bg-brand-hover text-text-inverse focus:ring-brand shadow-sm hover:shadow-md',
        secondary:
            'bg-surface-dim hover:bg-surface text-text-main focus:ring-border-main',
        danger:
            'bg-danger hover:bg-danger text-text-inverse focus:ring-danger shadow-sm',
        ghost:
            'bg-transparent hover:bg-surface-dim text-text-sub focus:ring-border-main',
        outline:
            'border border-border-main hover:bg-surface-dim text-text-main focus:ring-border-main',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
    };

    return (
        <button
            className={clsx(base, variants[variant], sizes[size], className)}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                </svg>
            ) : (
                icon && <span className="shrink-0">{icon}</span>
            )}
            {children}
        </button>
    );
}
