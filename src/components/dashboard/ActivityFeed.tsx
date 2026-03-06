import { Activity, ShoppingCart, PackageMinus, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';

interface ActivityItem {
    id: string;
    type: 'sale' | 'adjustment' | 'expiry';
    action: string;
    user: string;
    timestamp: string;
}

export function ActivityFeed() {
    const activities: ActivityItem[] = [
        { id: '1', type: 'adjustment', action: 'Adjusted stock: Paracetamol 500mg (+50)', user: 'Sarah Jenkins', timestamp: '10 mins ago' },
        { id: '2', type: 'sale', action: 'New sale created: INV-2023-089', user: 'Mike Chen', timestamp: '1 hour ago' },
        { id: '3', type: 'expiry', action: 'Item expired: Amoxicillin 250mg', user: 'System', timestamp: '3 hours ago' },
        { id: '4', type: 'sale', action: 'New sale created: INV-2023-088', user: 'Sarah Jenkins', timestamp: '5 hours ago' },
        { id: '5', type: 'adjustment', action: 'Received PO: #PO-1042', user: 'David Ross', timestamp: '1 day ago' },
    ];

    activities[4].action = 'Received PO: #PO-1042';

    return (
        <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Activity</h3>
                <Activity size={18} className="text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {activities.map((item, index) => {
                    const icons = {
                        sale: <ShoppingCart size={14} className="text-emerald-500" />,
                        adjustment: <PackageMinus size={14} className="text-blue-500" />,
                        expiry: <AlertCircle size={14} className="text-rose-500" />
                    };

                    const iconBgs = {
                        sale: 'bg-emerald-100 ring-emerald-50',
                        adjustment: 'bg-blue-100 ring-blue-50',
                        expiry: 'bg-rose-100 ring-rose-50'
                    };

                    return (
                        <div key={item.id} className="relative flex gap-4">
                            {/* Connection Line */}
                            {index !== activities.length - 1 && (
                                <div className="absolute top-8 left-4 bottom-[-24px] w-px bg-slate-100" />
                            )}

                            <div className={clsx('relative z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-4', iconBgs[item.type])}>
                                {icons[item.type]}
                            </div>

                            <div className="pt-1.5 flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{item.action}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-semibold text-slate-500">{item.user}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-xs text-slate-400">{item.timestamp}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
