import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Card } from '../ui/Card';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: { value: string; positive: boolean };
    colorScheme?: 'blue' | 'green' | 'yellow' | 'red';
}

export function KpiCard({ title, value, icon, trend, colorScheme = 'blue' }: KpiCardProps) {
    const bgColors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        yellow: 'bg-amber-50 text-amber-600',
        red: 'bg-rose-50 text-rose-600',
    };

    return (
        <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</h3>
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
                </div>
                <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white', bgColors[colorScheme])}>
                    {icon}
                </div>
            </div>
            {trend && (
                <div className="mt-5 flex items-center gap-1.5 pt-3 border-t border-slate-100">
                    <span className={clsx('text-xs font-bold flex items-center', trend.positive ? 'text-emerald-600' : 'text-rose-600')}>
                        {trend.positive ? '↑' : '↓'} {trend.value}
                    </span>
                    <span className="text-xs font-medium text-slate-400">vs last period</span>
                </div>
            )}
        </Card>
    );
}
