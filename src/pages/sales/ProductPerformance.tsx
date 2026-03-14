import { Card } from '../../components/ui/Card';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ProductPerformance() {
    const { topProducts } = useSalesAnalytics();

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <h3 className="text-lg font-bold text-text-main mb-6">Top 10 Selling Products</h3>
                {topProducts.isLoading ? (
                    <div className="h-[400px] flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                    </div>
                ) : (
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={topProducts.data || []} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="product_name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#4B5563', fontSize: 13, width: 150 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="total_sold"
                                    name="Units Sold"
                                    fill="#3B82F6"
                                    radius={[0, 4, 4, 0]}
                                    barSize={24}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Card>
        </div>
    );
}
