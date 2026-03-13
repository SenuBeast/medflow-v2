import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import type { HourlySales } from '../../hooks/useLiveSalesDashboard';

export function HourlyRevenueChart({ data }: { data: HourlySales[] }) {
    return (
        <Card className="p-3 md:p-5 flex-1">
            <h3 className="text-sm md:text-base font-bold text-text-main mb-3 md:mb-4">Today's Revenue Trend</h3>
            <div className="w-full h-[220px] sm:h-[260px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border-dim" />
                        <XAxis
                            dataKey="hour_of_day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: 'currentColor' }}
                            className="text-text-dim"
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `$${val}`}
                            tick={{ fontSize: 12, fill: 'currentColor' }}
                            className="text-text-dim"
                            width={60}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-surface)',
                                borderColor: 'var(--color-border-dim)',
                                borderRadius: '0.5rem',
                                color: 'var(--color-text-main)'
                            }}
                            itemStyle={{ color: '#10b981' }}
                            formatter={(value: string | number | readonly (string | number)[] | undefined) => {
                                const val = Array.isArray(value) ? value[0] : value;
                                return [`$${Number(val ?? 0).toFixed(2)}`, 'Revenue'] as [string, string];
                            }}
                            labelStyle={{ color: 'var(--color-text-sub)', marginBottom: '4px' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
