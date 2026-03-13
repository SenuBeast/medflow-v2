
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
        <Card className="flex items-center gap-3 md:gap-4 p-3 md:p-5 bg-card border-border-main">
            <div className={clsx('w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0', color)}>
                <Icon size={18} className="text-white md:w-5 md:h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-text-dim">{label}</p>
                {loading ? (
                    <div className="h-6 md:h-7 w-20 md:w-24 bg-surface-elevated animate-pulse rounded mt-1"></div>
                ) : (
                    <p className="text-lg md:text-2xl font-bold text-text-main mt-0.5">{value}</p>
                )}
            </div>
        </Card>
    );
}

export function OverviewDashboard() {
    const { monthlyRevenue, overviewMetrics, staffSales } = useSalesAnalytics();

    const metrics = overviewMetrics.data;

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KpiCard
                    label="Today's Revenue"
                    value={`$${metrics?.today_revenue?.toFixed(2) || '0.00'}`}
                    icon={DollarSign}
                    color="bg-brand"
                    loading={overviewMetrics.isLoading}
                />
                <KpiCard
                    label="This Week"
                    value={`$${metrics?.week_revenue?.toFixed(2) || '0.00'}`}
                    icon={TrendingUp}
                    color="bg-success"
                    loading={overviewMetrics.isLoading}
                />
                <KpiCard
                    label="This Month"
                    value={`$${metrics?.month_revenue?.toFixed(2) || '0.00'}`}
                    icon={DollarSign}
                    color="bg-info"
                    loading={overviewMetrics.isLoading}
                />
                <KpiCard
                    label="Active Staff"
                    value={staffSales.data?.length || 0}
                    icon={Users}
                    color="bg-warning"
                    loading={staffSales.isLoading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <Card className="p-4 md:p-6 col-span-1 lg:col-span-2 flex flex-col min-h-[300px] md:min-h-[400px] bg-card border-border-main">
                    <h3 className="text-base md:text-lg font-bold text-text-main mb-4 md:mb-6">Revenue Trend</h3>
                    {monthlyRevenue.isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin"></div>
                        </div>
                    ) : (
                        <div className="h-[220px] sm:h-[260px] md:h-[284px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyRevenue.data || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--chart-label)', fontSize: 11 }}
                                        dy={10}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--chart-label)', fontSize: 11 }}
                                        tickFormatter={(value) => `$${value}`}
                                        width={50}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--color-bg-elevated)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--color-border)',
                                            boxShadow: 'var(--shadow-md)',
                                            color: 'var(--color-text-primary)'
                                        }}
                                        itemStyle={{ color: 'var(--color-text-primary)' }}
                                        formatter={(value: string | number | readonly (string | number)[] | undefined) => {
                                            const val = Array.isArray(value) ? value[0] : value;
                                            return [`$${Number(val ?? 0).toFixed(2)}`, 'Revenue'] as [string, string];
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="var(--chart-series-1)"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: 'var(--chart-series-1)', strokeWidth: 0 }}
                                        activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--chart-series-1)' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                <Card className="p-4 md:p-6 flex flex-col min-h-[300px] md:min-h-[400px] bg-card border-border-main">
                    <h3 className="text-base md:text-lg font-bold text-text-main mb-4 md:mb-6">Top Performers</h3>
                    <div className="flex-1">
                        {staffSales.isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-surface-elevated rounded-lg animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(staffSales.data || []).slice(0, 5).map((staff, idx) => (
                                    <div key={staff.staff_name} className="flex items-center justify-between p-2.5 md:p-3 rounded-xl bg-surface border border-border-main">
                                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs md:text-sm shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-text-main text-xs md:text-sm truncate">{staff.staff_name}</p>
                                                <p className="text-[10px] md:text-xs text-text-dim">{staff.transactions_count} orders</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <p className="font-bold text-text-main text-sm md:text-base">${Number(staff.revenue).toFixed(2)}</p>
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
