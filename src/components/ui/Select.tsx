import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, helperText, className, children, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="block text-xs font-semibold text-text-sub uppercase tracking-wider">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={clsx(
                            'w-full appearance-none px-4 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0',
                            'bg-card text-text-main pr-10', // pr-10 to make room for custom arrow
                            error
                                ? 'border-danger focus:ring-danger/20'
                                : 'border-border-main focus:border-brand focus:ring-brand/10',
                            className
                        )}
                        {...props}
                    >
                        {children}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-dim">
                        <ChevronDown size={14} />
                    </div>
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

Select.displayName = 'Select';
