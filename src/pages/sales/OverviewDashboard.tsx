
import { Card } from '../../components/ui/Card';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import { clsx } from 'clsx';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

function KpiCard({ label, value, icon: Icon, color, loading }: {
    label: string; value: string | number; icon: React.ElementType; color: string; loading?: boolean;
}) {
    return (
        <Card className="flex items-center gap-4 p-5">
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', color)}>
                <Icon size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                {loading ? (
                    <div className="h-7 w-24 bg-gray-200 animate-pulse rounded mt-1"></div>
                ) : (
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
                )}
            </div>
        </Card>
    );
}

export function OverviewDashboard() {
    const { monthlyRevenue, overviewMetrics, staffSales } = useSalesAnalytics();

    const metrics = overviewMetrics.data;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="Today's Revenue"
                    value={`$${metrics?.today_revenue?.toFixed(2) || '0.00'}`}
                    icon={DollarSign}
                    color="bg-blue-600"
                    loading={overviewMetrics.isLoading}
                />
                <KpiCard
                    label="This Week"
                    value={`$${metrics?.week_revenue?.toFixed(2) || '0.00'}`}
                    icon={TrendingUp}
                    color="bg-emerald-500"
                    loading={overviewMetrics.isLoading}
                />
                <KpiCard
                    label="This Month"
                    value={`$${metrics?.month_revenue?.toFixed(2) || '0.00'}`}
                    icon={DollarSign}
                    color="bg-indigo-500"
                    loading={overviewMetrics.isLoading}
                />
                <KpiCard
                    label="Active Staff"
                    value={staffSales.data?.length || 0}
                    icon={Users}
                    color="bg-amber-500"
                    loading={staffSales.isLoading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 col-span-1 lg:col-span-2 flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Trend</h3>
                    {monthlyRevenue.isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyRevenue.data || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#2563EB"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                <Card className="p-6 flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Top Performers</h3>
                    <div className="flex-1">
                        {staffSales.isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(staffSales.data || []).slice(0, 5).map((staff, idx) => (
                                    <div key={staff.staff_name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{staff.staff_name}</p>
                                                <p className="text-xs text-gray-500">{staff.transactions_count} orders</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">${Number(staff.revenue).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
