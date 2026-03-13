import { Clock, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import type { SaleTransaction } from '../../lib/types';
import { formatDistanceToNow } from 'date-fns';

export function LiveSalesFeed({ sales }: { sales: SaleTransaction[] }) {
    return (
        <Card className="flex-1 flex flex-col h-full bg-surface max-h-[500px]">
            <div className="p-5 border-b border-border-dim">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                    </div>
                    <h3 className="text-base font-bold text-text-main">Live Sales Feed</h3>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {sales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                        <Clock className="w-8 h-8 text-text-dim/40 mb-3" />
                        <p className="text-sm text-text-dim">No sales today yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sales.map(sale => (
                            <div key={sale.id} className="p-3 rounded-lg hover:bg-surface-dim/30 transition-colors animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-semibold text-text-main">
                                        ${sale.total.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-text-dim flex items-center gap-1">
                                        <CheckCircle size={10} className="text-success" />
                                        {formatDistanceToNow(new Date(sale.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="text-xs text-text-sub flex justify-between">
                                    <span>#{sale.invoice_number}</span>
                                    <span>{sale.seller?.full_name || 'Staff'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}
