import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

interface AvatarProps {
    src?: string | null;
    alt?: string;
    name?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    ring?: boolean;
}

export function Avatar({ src, alt, name, size = 'md', className, ring = true }: AvatarProps) {
    const [hasError, setHasError] = useState(false);

    // Reset error state if src changes
    useEffect(() => {
        setHasError(false);
    }, [src]);

    const sizeClasses = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-9 w-9 text-sm',
        lg: 'h-10 w-10 text-base',
        xl: 'h-24 w-24 text-3xl',
    };

    const ringClasses = ring ? 'ring-2 ring-border-dim' : '';

    if (src && !hasError) {
        return (
            <img
                src={src}
                alt={alt || name || 'Avatar'}
                onError={() => setHasError(true)}
                className={clsx(
                    sizeClasses[size],
                    'shrink-0 rounded-full object-cover',
                    ringClasses,
                    className
                )}
            />
        );
    }

    const initials = (name || alt || '?')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div
            className={clsx(
                sizeClasses[size],
                'flex shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/20 font-bold text-brand',
                ringClasses,
                className
            )}
        >
            <span>{initials || '?'}</span>
        </div>
    );
}
