import { TrendingUp, Package } from 'lucide-react';
import { Card } from '../ui/Card';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';

export function TopProductsList() {
    const { topProducts } = useSalesAnalytics();
    const data = topProducts.data || [];

    return (
        <Card className="flex flex-col h-full">
            <div className="p-5 border-b border-border-dim">
                <div className="flex items-center gap-2">
                    <TrendingUp className="text-brand w-5 h-5" />
                    <h3 className="text-base font-bold text-text-main">Top Selling Products</h3>
                </div>
            </div>
            <div className="flex-1 p-4">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Package className="w-8 h-8 text-text-dim/40 mb-2" />
                        <p className="text-sm text-text-dim">No sales data available yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data.slice(0, 5).map((product, index) => (
                            <div key={product.product_name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-surface-dim flex items-center justify-center text-xs font-bold text-text-sub">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-text-main">{product.product_name}</p>
                                        <p className="text-xs text-text-dim">{product.total_sold} units sold</p>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-success">
                                    ${Number(product.total_revenue).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}
