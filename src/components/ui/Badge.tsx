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
        active: 'bg-green-100 text-green-700 border-green-200',
        inactive: 'bg-gray-100 text-gray-500 border-gray-200',
        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        approved: 'bg-green-100 text-green-700 border-green-200',
        rejected: 'bg-red-100 text-red-700 border-red-200',
        draft: 'bg-gray-100 text-gray-600 border-gray-200',
        in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
        submitted: 'bg-purple-100 text-purple-700 border-purple-200',
        quarantined: 'bg-orange-100 text-orange-700 border-orange-200',
        disposed: 'bg-red-100 text-red-700 border-red-200',
        depleted: 'bg-slate-100 text-slate-500 border-slate-200',
        completed: 'bg-green-100 text-green-700 border-green-200',
        refunded: 'bg-rose-100 text-rose-700 border-rose-200',
        partial_refund: 'bg-amber-100 text-amber-700 border-amber-200',
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
