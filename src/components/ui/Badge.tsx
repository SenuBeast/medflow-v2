import { clsx } from 'clsx';
import { Lock } from 'lucide-react';
import { ROLE_COLORS, CUSTOM_ROLE_COLOR } from '../../lib/constants';

interface RoleBadgeProps {
    roleName: string;
    isCustom?: boolean;
    showLock?: boolean;
    size?: 'sm' | 'md';
}

export function RoleBadge({ roleName, isCustom, showLock, size = 'md' }: RoleBadgeProps) {
    const colors = ROLE_COLORS[roleName] ?? CUSTOM_ROLE_COLOR;
    
    // Custom Role Colors (Black in Light, White in Dark)
    const customBorder = "border-black dark:border-white opacity-80";
    const roleBorder = isCustom ? customBorder : colors.border;

    return (
        <span
            className={clsx(
                'inline-flex items-center rounded-full border bg-transparent font-medium transition-all duration-200',
                roleBorder,
                isCustom ? 'text-text-main' : colors.text,
                size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
            )}
        >
            {showLock && roleName !== 'Viewer' && !isCustom && (
                <Lock size={size === 'sm' ? 10 : 12} className="mr-1.5 opacity-60" />
            )}
            {roleName}
        </span>
    );
}

interface StatusBadgeProps {
    status: 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'draft' | 'in_progress' | 'submitted' | 'quarantined' | 'disposed' | 'depleted' | 'completed' | 'refunded' | 'partial_refund';
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const map = {
        active: 'bg-success-bg text-success border-success-border',
        inactive: 'bg-surface text-text-sub border-border-main',
        pending: 'bg-warning-bg text-warning border-warning-border',
        approved: 'bg-success-bg text-success border-success-border',
        rejected: 'bg-danger-bg text-danger border-danger-border',
        draft: 'bg-surface text-text-sub border-border-main',
        in_progress: 'bg-info-bg text-info border-info-border',
        submitted: 'bg-info-bg text-info border-info-border',
        quarantined: 'bg-warning-bg text-warning border-warning-border',
        disposed: 'bg-danger-bg text-danger border-danger-border',
        depleted: 'bg-surface-dim text-text-dim border-border-main',
        completed: 'bg-success-bg text-success border-success-border',
        refunded: 'bg-danger-bg text-danger border-danger-border',
        partial_refund: 'bg-warning-bg text-warning border-warning-border',
    };
    return (
        <span
            className={clsx(
                'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border',
                map[status]
            )}
        >
            {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
    );
}
