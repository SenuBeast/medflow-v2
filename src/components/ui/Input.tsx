import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className, type = 'text', ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="block text-xs font-semibold text-text-sub uppercase tracking-wider">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        type={type}
                        className={clsx(
                            'w-full px-4 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0',
                            'bg-card text-text-main placeholder:text-text-dim',
                            error
                                ? 'border-danger focus:ring-danger/20'
                                : 'border-border-main focus:border-brand focus:ring-brand/10',
                            className
                        )}
                        {...props}
                    />
                </div>
                {(error || helperText) && (
                    <p className={clsx('text-xs', error ? 'text-danger' : 'text-text-dim')}>
                        {error || helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
