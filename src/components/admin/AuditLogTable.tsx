import { format } from 'date-fns';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { Activity, User, ShieldAlert, Package, ShoppingCart } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../ui/Card';

const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
        case 'user': return <User size={16} className="text-blue-500" />;
        case 'role': return <ShieldAlert size={16} className="text-purple-500" />;
        case 'inventory_item': return <Package size={16} className="text-orange-500" />;
        case 'sale': return <ShoppingCart size={16} className="text-green-500" />;
        default: return <Activity size={16} className="text-text-sub" />;
    }
};

const formatActionText = (action: string) => {
    return action.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
};

const renderDetails = (details: any) => {
    if (!details || typeof details !== 'object') return '-';

    // Handle Stock Item Changes (POS/Inventory)
    if ('previous_quantity' in details && 'new_quantity' in details) {
        const delta = details.delta || (details.new_quantity - details.previous_quantity);
        const deltaSign = delta > 0 ? '+' : '';
        return (
            <div className="flex flex-col gap-0.5">
                <span className="text-text-main font-medium">
                    Qty: {details.previous_quantity} → {details.new_quantity}
                </span>
                <span className={clsx(
                    "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm w-fit",
                    delta < 0 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                )}>
                    {deltaSign}{delta} units
                </span>
            </div>
        );
    }

    // Handle generic field updates (e.g. from profiles, settings)
    const entries = Object.entries(details).filter(([key]) => !key.includes('_id'));
    if (entries.length > 0) {
        return (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {entries.map(([key, value]) => (
                    <div key={key} className="text-xs">
                        <span className="text-text-dim capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-text-main ml-1 font-medium italic">
                            {typeof value === 'object' ? 'updated' : String(value)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return '-';
};

export function AuditLogTable() {
    const { logs, isLoading } = useAuditLogs();

    if (isLoading) {
        return (
            <Card>
                <div className="p-8 text-center text-text-sub">Loading audit trail...</div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface-dim/50 border-b border-border-dim/50">
                            <th className="px-6 py-4 text-xs font-semibold text-text-sub tracking-wider">Timestamp</th>
                            <th className="px-6 py-4 text-xs font-semibold text-text-sub tracking-wider">User</th>
                            <th className="px-6 py-4 text-xs font-semibold text-text-sub tracking-wider">Action</th>
                            <th className="px-6 py-4 text-xs font-semibold text-text-sub tracking-wider">Entity</th>
                            <th className="px-6 py-4 text-xs font-semibold text-text-sub tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-dim/30">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-text-sub text-sm">
                                    No audit logs found.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-surface-dim/30 transition-colors">
                                    <td className="px-6 py-4 text-sm text-text-sub whitespace-nowrap">
                                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-text-main">
                                            {log.user?.full_name ?? 'System'}
                                        </div>
                                        <div className="text-xs text-text-sub">
                                            {log.user?.email ?? ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "inline-flex items-center px-2 py-1 rounded text-xs font-medium border",
                                            log.action.includes('DELETE') ? "bg-red-50 text-red-700 border-red-100" :
                                                log.action.includes('CREATE') || log.action.includes('ADD') ? "bg-green-50 text-green-700 border-green-100" :
                                                    log.action.includes('UPDATE') || log.action.includes('EDIT') ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                        "bg-surface-dim text-slate-700 dark:text-slate-300 border-border-main"
                                        )}>
                                            {formatActionText(log.action)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getEntityIcon(log.entity_type)}
                                            <span className="text-sm text-text-main capitalize">
                                                {log.entity_type.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-text-dim mt-1 font-mono truncate max-w-[120px]" title={log.entity_id || ''}>
                                            Ref: {log.entity_id?.slice(0, 8)}...
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-md">
                                            {renderDetails(log.details)}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
