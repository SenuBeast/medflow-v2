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
            <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
                <h3 className="text-base font-bold text-slate-900 mb-4 tracking-tight">System Alerts</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-4 ring-4 ring-emerald-50/50">
                        <span className="text-2xl">🎉</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700">No active alerts</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">Everything looks good! Your inventory and compliance are on track.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Critical Alerts</h3>
                <span className="text-xs font-bold bg-rose-100 text-rose-700 px-3 py-1 rounded-full">{alerts.length} NEW</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {alerts.map(alert => {
                    const icons = {
                        low_stock: <AlertTriangle size={16} className="text-amber-500" />,
                        expiring: <Clock size={16} className="text-amber-500" />,
                        controlled: <ShieldAlert size={16} className="text-rose-500" />
                    };
                    const bgs = {
                        low_stock: 'bg-amber-50/50 border-amber-100/50',
                        expiring: 'bg-amber-50/50 border-amber-100/50',
                        controlled: 'bg-rose-50 border-rose-100/60'
                    };

                    return (
                        <div key={alert.id} className={clsx('group flex gap-3 p-3.5 rounded-xl border cursor-pointer hover:shadow-sm hover:scale-[1.01] transition-all', bgs[alert.type])}>
                            <div className="mt-0.5 shrink-0 bg-white w-8 h-8 rounded-lg shadow-sm border border-slate-100/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                {icons[alert.type]}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">{alert.title}</h4>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
