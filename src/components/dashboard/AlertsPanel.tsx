import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '../ui/Card';
import { hasPermission } from '../../lib/permissionUtils';
import { PERMISSIONS } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { useDashboardAlerts } from '../../hooks/useDashboardData';

interface Alert {
    id: string;
    type: 'low_stock' | 'expiring' | 'controlled';
    title: string;
    message: string;
    createdAt: string;
}

export function AlertsPanel() {
    // Subscribe to permission updates.
    useAuthStore((state) => state.permissions);

    const { data: dbAlerts = [], isLoading } = useDashboardAlerts();
    const canInventoryView = hasPermission(PERMISSIONS.INVENTORY_VIEW);
    const canExpiryView = hasPermission(PERMISSIONS.INVENTORY_EXPIRY_VIEW);
    const canControlledView = hasPermission(PERMISSIONS.INVENTORY_CONTROLLED_VIEW);

    const alerts: Alert[] = dbAlerts
        .filter((alert) => {
            if (alert.alertType === 'expiring_soon' || alert.alertType === 'expired_stock') {
                return canExpiryView;
            }
            if (alert.alertType === 'controlled_stock') {
                return canControlledView;
            }
            return canInventoryView;
        })
        .map((alert) => {
            const isExpiry = alert.alertType === 'expiring_soon' || alert.alertType === 'expired_stock';
            const isControlled = alert.alertType === 'controlled_stock';

            let title = 'Stock Alert';
            if (alert.alertType === 'out_of_stock') title = 'Out of Stock';
            if (alert.alertType === 'low_stock') title = 'Low Stock Alert';
            if (alert.alertType === 'reorder_level') title = 'Reorder Level Reached';
            if (alert.alertType === 'expiring_soon') title = 'Expiring Soon';
            if (alert.alertType === 'expired_stock') title = 'Expired Stock';
            if (isControlled) title = 'Controlled Substance Review';

            return {
                id: alert.id,
                type: isControlled ? 'controlled' : (isExpiry ? 'expiring' : 'low_stock'),
                title,
                message: alert.message,
                createdAt: alert.createdAt,
            };
        });

    if (isLoading) {
        return (
            <Card className="h-full flex flex-col bg-card border-border-main p-4">
                <h3 className="text-base font-bold text-text-main mb-4 tracking-tight">System Alerts</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                </div>
            </Card>
        );
    }

    if (alerts.length === 0) {
        return (
            <Card className="h-full flex flex-col bg-card border-border-main">
                <h3 className="text-base font-bold text-text-main mb-4 tracking-tight">System Alerts</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-success/5">
                        <CheckCircle2 size={28} className="text-success" />
                    </div>
                    <p className="text-sm font-bold text-text-main">No active alerts</p>
                    <p className="text-xs text-text-dim mt-1 max-w-[200px] leading-relaxed">
                        Everything looks good! Your inventory and compliance are on track.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col gap-4 bg-card border-border-main">
            <div className="flex items-center justify-between pb-2 border-b border-border-dim/50">
                <h3 className="text-base font-bold text-text-main tracking-tight">Critical Alerts</h3>
                <span className="text-[10px] font-bold bg-danger/10 text-danger border border-danger/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {alerts.length} NEW
                </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {alerts.map((alert) => {
                    const icons = {
                        low_stock: <AlertTriangle size={16} className="text-warning" />,
                        expiring: <Clock size={16} className="text-warning" />,
                        controlled: <ShieldAlert size={16} className="text-danger" />,
                    };
                    const bgs = {
                        low_stock: 'bg-warning/5 border-warning/10',
                        expiring: 'bg-warning/5 border-warning/10',
                        controlled: 'bg-danger/5 border-danger/10',
                    };

                    return (
                        <div key={alert.id} className={clsx('group flex gap-3.5 p-3.5 rounded-xl border cursor-pointer hover:bg-surface transition-all duration-200', bgs[alert.type])}>
                            <div className="mt-0.5 shrink-0 bg-card w-9 h-9 rounded-xl shadow-sm border border-border-dim/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                {icons[alert.type]}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-text-main">{alert.title}</h4>
                                <p className="text-xs text-text-dim mt-1.5 leading-relaxed">{alert.message}</p>
                                <p className="text-[10px] text-text-dim mt-1">
                                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

