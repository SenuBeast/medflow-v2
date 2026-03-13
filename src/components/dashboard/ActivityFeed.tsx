import { Activity, ShoppingCart, PackageMinus, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { Card } from '../ui/Card';
import { useDashboardActivity } from '../../hooks/useDashboardData';

type ActivityType = 'sale' | 'adjustment' | 'expiry';

type FeedItem = {
    id: string;
    type: ActivityType;
    action: string;
    actor: string;
    createdAt: string;
};

function toTitleCase(value: string): string {
    return value
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferType(action: string, entityType: string): ActivityType {
    const actionKey = action.toLowerCase();
    const entityKey = entityType.toLowerCase();

    if (actionKey.includes('sale') || entityKey.includes('sale')) return 'sale';
    if (actionKey.includes('expiry') || actionKey.includes('expire') || entityKey.includes('batch')) return 'expiry';
    return 'adjustment';
}

export function ActivityFeed() {
    const { data = [], isLoading } = useDashboardActivity();

    const activities: FeedItem[] = data.map((item) => ({
        id: item.id,
        type: inferType(item.action, item.entityType),
        action: `${toTitleCase(item.action)} - ${toTitleCase(item.entityType)}`,
        actor: item.actorName,
        createdAt: item.createdAt,
    }));

    return (
        <Card className="h-full flex flex-col bg-card border-border-main">
            <div className="flex items-center justify-between pb-4 border-b border-border-dim/50 mb-6">
                <h3 className="text-base font-bold text-text-main tracking-tight">Recent Activity</h3>
                <Activity size={18} className="text-text-dim" />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-text-dim">
                        No recent activity available.
                    </div>
                ) : (
                    activities.map((item, index) => {
                        const icons = {
                            sale: <ShoppingCart size={14} className="text-success" />,
                            adjustment: <PackageMinus size={14} className="text-brand" />,
                            expiry: <AlertCircle size={14} className="text-danger" />,
                        };

                        const iconBgs = {
                            sale: 'bg-success/10 ring-success/5',
                            adjustment: 'bg-brand/10 ring-brand/5',
                            expiry: 'bg-danger/10 ring-danger/5',
                        };

                        return (
                            <div key={item.id} className="relative flex gap-4">
                                {index !== activities.length - 1 && (
                                    <div className="absolute top-8 left-4 bottom-[-24px] w-px bg-border-dim/30" />
                                )}

                                <div className={clsx('relative z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-4', iconBgs[item.type])}>
                                    {icons[item.type]}
                                </div>

                                <div className="pt-1 flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-text-main truncate">{item.action}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">{item.actor}</span>
                                        <span className="w-1 h-1 rounded-full bg-border-dim" />
                                        <span className="text-[10px] font-medium text-text-dim">
                                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </Card>
    );
}

