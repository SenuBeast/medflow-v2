import { clsx } from 'clsx';
import { ROLE_COLORS, CUSTOM_ROLE_COLOR } from '../../lib/constants';

interface RoleBadgeProps {
    roleName: string;
    size?: 'sm' | 'md';
}

export function RoleBadge({ roleName, size = 'md' }: RoleBadgeProps) {
    const colors = ROLE_COLORS[roleName] ?? CUSTOM_ROLE_COLOR;
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1.5 font-medium rounded-full border',
                colors.bg,
                colors.text,
                colors.border,
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
            )}
        >
            <span className={clsx('w-1.5 h-1.5 rounded-full', colors.dot)} />
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
