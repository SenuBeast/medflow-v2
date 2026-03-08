import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../ui/Card';
import { hasPermission } from '../../lib/permissionUtils';
import { PERMISSIONS } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';

interface Alert {
    id: string;
    type: 'low_stock' | 'expiring' | 'controlled';
    title: string;
    message: string;
}

export function AlertsPanel() {
    // Subscribe to permission changes
    useAuthStore((state) => state.permissions);

    // Mock data based on permissions
    const alerts: Alert[] = [];

    if (hasPermission(PERMISSIONS.INVENTORY_VIEW)) {
        alerts.push({ id: '1', type: 'low_stock', title: 'Low Stock Alert', message: 'Ibuprofen 400mg is critically below reorder level (12 left)' });
    }

    if (hasPermission(PERMISSIONS.INVENTORY_EXPIRY_VIEW)) {
        alerts.push({ id: '2', type: 'expiring', title: 'Expiring Soon', message: 'Amoxicillin 500mg (Batch A12-X) expires in 15 days' });
    }

    if (hasPermission(PERMISSIONS.INVENTORY_CONTROLLED_VIEW)) {
        alerts.push({ id: '3', type: 'controlled', title: 'Controlled Substance Review', message: 'Morphine Sulfate 10mg requires mandatory count verification' });
    }

    if (alerts.length === 0) {
        return (
            <Card className="h-full flex flex-col bg-card border-border-main">
                <h3 className="text-base font-bold text-text-main mb-4 tracking-tight">System Alerts</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-success/5">
                        <span className="text-3xl">🎉</span>
                    </div>
                    <p className="text-sm font-bold text-text-main">No active alerts</p>
                    <p className="text-xs text-text-dim mt-1 max-w-[200px] leading-relaxed">Everything looks good! Your inventory and compliance are on track.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col gap-4 bg-card border-border-main">
            <div className="flex items-center justify-between pb-2 border-b border-border-dim/50">
                <h3 className="text-base font-bold text-text-main tracking-tight">Critical Alerts</h3>
                <span className="text-[10px] font-bold bg-danger/10 text-danger border border-danger/20 px-2.5 py-1 rounded-full uppercase tracking-wider">{alerts.length} NEW</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {alerts.map(alert => {
                    const icons = {
                        low_stock: <AlertTriangle size={16} className="text-warning" />,
                        expiring: <Clock size={16} className="text-warning" />,
                        controlled: <ShieldAlert size={16} className="text-danger" />
                    };
                    const bgs = {
                        low_stock: 'bg-warning/5 border-warning/10',
                        expiring: 'bg-warning/5 border-warning/10',
                        controlled: 'bg-danger/5 border-danger/10'
                    };

                    return (
                        <div key={alert.id} className={clsx('group flex gap-3.5 p-3.5 rounded-xl border cursor-pointer hover:bg-surface transition-all duration-200', bgs[alert.type])}>
                            <div className="mt-0.5 shrink-0 bg-card w-9 h-9 rounded-xl shadow-sm border border-border-dim/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                {icons[alert.type]}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-text-main">{alert.title}</h4>
                                <p className="text-xs text-text-dim mt-1.5 leading-relaxed">{alert.message}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
