import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../ui/Card';
import { useDashboardChartsData } from '../../hooks/useDashboardData';

export function ChartsSection() {
    const { data, isLoading } = useDashboardChartsData();

    const categoryData = data?.categoryStock ?? [];
    const salesTrendData = data?.salesTrend ?? [];
    const hasCategoryData = categoryData.some((row) => row.stock > 0);
    const hasSalesData = salesTrendData.some((row) => row.revenue > 0);
    const thisWeekRevenue = data?.thisWeekRevenue ?? 0;
    const weekGrowthPct = data?.weekGrowthPct ?? 0;
    const growthIsPositive = weekGrowthPct >= 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-5 mb-8">
            <Card className="col-span-1 lg:col-span-2 flex flex-col bg-card border-border-main p-4 md:p-5">
                <div className="mb-4">
                    <h3 className="text-base font-bold text-text-main tracking-tight">Inventory Overview</h3>
                    <p className="text-xs text-text-dim mt-1">Live stock totals by category</p>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center min-h-[220px]">
                        <div className="w-7 h-7 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    </div>
                ) : !hasCategoryData ? (
                    <div className="flex-1 flex items-center justify-center min-h-[220px] text-sm text-text-dim">
                        No inventory category data available.
                    </div>
                ) : (
                    <div className="w-full h-[220px] sm:h-[240px] md:h-[260px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border-dim" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11 }} className="text-text-sub" />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11 }} className="text-text-dim" />
                                <Tooltip
                                    cursor={false}
                                    contentStyle={{
                                        backgroundColor: 'var(--color-surface)',
                                        borderColor: 'var(--color-border-dim)',
                                        borderRadius: '0.5rem',
                                        color: 'var(--color-text-main)',
                                    }}
                                    formatter={(value: string | number | readonly (string | number)[] | undefined) => {
                                        const val = Array.isArray(value) ? value[0] : value;
                                        return [`${Number(val ?? 0).toLocaleString()}`, 'Stock'] as [string, string];
                                    }}
                                    labelStyle={{ color: 'var(--color-text-sub)', marginBottom: '4px' }}
                                />
                                <Bar dataKey="stock" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Card>

            <Card className="flex flex-col bg-card border-border-main p-4 md:p-5">
                <div className="mb-4">
                    <h3 className="text-base font-bold text-text-main tracking-tight">Sales Trend</h3>
                    <p className="text-xs text-text-dim mt-1">Last 7 days revenue</p>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center min-h-[220px]">
                        <div className="w-7 h-7 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    </div>
                ) : !hasSalesData ? (
                    <div className="flex-1 flex items-center justify-center min-h-[220px] text-sm text-text-dim">
                        No sales trend data available.
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col">
                        <div className="w-full h-[180px] md:h-[210px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                                <AreaChart data={salesTrendData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border-dim" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11 }} className="text-text-sub" />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'currentColor', fontSize: 11 }}
                                        className="text-text-dim"
                                        tickFormatter={(value: number) => `$${Math.round(value)}`}
                                        width={56}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--color-surface)',
                                            borderColor: 'var(--color-border-dim)',
                                            borderRadius: '0.5rem',
                                            color: 'var(--color-text-main)',
                                        }}
                                        formatter={(value: string | number | readonly (string | number)[] | undefined) => {
                                            const val = Array.isArray(value) ? value[0] : value;
                                            return [`$${Number(val ?? 0).toFixed(2)}`, 'Revenue'] as [string, string];
                                        }}
                                        labelStyle={{ color: 'var(--color-text-sub)', marginBottom: '4px' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#salesTrendGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex justify-between items-center w-full mt-4 border-t border-border-dim pt-3">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">This Week</p>
                                <p className="text-lg font-extrabold text-text-main">
                                    ${thisWeekRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Growth</p>
                                <p className={`text-lg font-extrabold ${growthIsPositive ? 'text-success' : 'text-danger'}`}>
                                    {growthIsPositive ? '+' : ''}{weekGrowthPct.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
