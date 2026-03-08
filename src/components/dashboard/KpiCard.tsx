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
        blue: 'bg-brand/10 text-brand border-brand/20',
        green: 'bg-success/10 text-success border-success/20',
        yellow: 'bg-warning/10 text-warning border-warning/20',
        red: 'bg-danger/10 text-danger border-danger/20',
    };

    return (
        <Card className="bg-card border-border-main hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-xs font-bold text-text-dim uppercase tracking-widest mb-1.5">{title}</h3>
                    <p className="text-3xl font-extrabold text-text-main tracking-tight leading-none">{value}</p>
                </div>
                <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border', bgColors[colorScheme])}>
                    {icon}
                </div>
            </div>
            {trend && (
                <div className="mt-5 flex items-center gap-1.5 pt-3 border-t border-border-dim/50">
                    <span className={clsx('text-xs font-bold flex items-center', trend.positive ? 'text-success' : 'text-danger')}>
                        {trend.positive ? '↑' : '↓'} {trend.value}
                    </span>
                    <span className="text-xs font-medium text-text-dim">vs last period</span>
                </div>
            )}
        </Card>
    );
}
