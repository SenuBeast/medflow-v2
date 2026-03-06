import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, padding = 'md' }: CardProps) {
    const paddings = {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
    };
    return (
        <div
            className={clsx(
                'bg-white rounded-2xl shadow-sm border border-gray-100',
                paddings[padding],
                className
            )}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-4">
            <div>
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0 ml-2">{action}</div>}
        </div>
    );
}
