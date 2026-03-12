import { clsx } from 'clsx';
import { Card } from '../ui/Card';

// Using a simple mock implementation since 'recharts' might not be installed based on package.json
// To keep it simple, we'll build CSS-based charts to avoid new dependencies initially.
// If recharts is requested later, we can swap these out.

export function ChartsSection() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-5 mb-8">
            {/* Inventory Overview (Bar Chart) */}
            <Card className="col-span-1 lg:col-span-2 flex flex-col bg-card border-border-main">
                <div className="mb-6">
                    <h3 className="text-base font-bold text-text-main tracking-tight">Inventory Overview</h3>
                    <p className="text-xs text-text-dim mt-1">Stock levels across major categories</p>
                </div>

                <div className="flex-1 flex items-end gap-1.5 sm:gap-2 md:gap-4 h-[160px] sm:h-[200px] mt-auto">
                    {[
                        { label: 'Antibiotics', value: 85, hClass: 'h-[85%]', color: 'bg-emerald-400' },
                        { label: 'Painkillers', value: 65, hClass: 'h-[65%]', color: 'bg-blue-400' },
                        { label: 'Vitamins', value: 40, hClass: 'h-[40%]', color: 'bg-indigo-400' },
                        { label: 'Syrups', value: 55, hClass: 'h-[55%]', color: 'bg-violet-400' },
                        { label: 'Ointments', value: 30, hClass: 'h-[30%]', color: 'bg-amber-400' },
                        { label: 'Equipment', value: 20, hClass: 'h-[20%]', color: 'bg-slate-400' },
                    ].map((item) => (
                        <div key={item.label} className="group flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer">
                            {/* Tooltip */}
                            <div className="absolute -top-10 bg-surface-elevated text-text-main text-[10px] font-bold px-2 py-1 rounded border border-border-main opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                {item.value}% Filled
                            </div>

                            {/* Bar Container (Removed white background) */}
                            <div className="w-full relative rounded-t-sm h-full flex items-end overflow-hidden">
                                <div
                                    className={`w-full rounded-t-sm ${item.color} ${item.hClass} group-hover:brightness-110 transition-all duration-500`}
                                />
                            </div>

                            {/* Label */}
                            <p className="text-[8px] sm:text-[10px] md:text-xs font-semibold text-text-sub mt-1.5 sm:mt-2 truncate w-full text-center px-0.5">
                                {item.label}
                            </p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Sales Trend (Line/Area Chart abstract) */}
            <Card className="flex flex-col bg-card border-border-main">
                <div className="mb-4">
                    <h3 className="text-base font-bold text-text-main tracking-tight">Sales Trend</h3>
                    <p className="text-xs text-text-dim mt-1">Last 7 days performance</p>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    {/* Abstract SVG line chart */}
                    <svg viewBox="0 0 200 100" className="w-full h-24 sm:h-32 overflow-visible drop-shadow-sm">
                        <defs>
                            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" className="stop-brand" stopOpacity="0.2" />
                                <stop offset="100%" className="stop-brand" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M 0,80 Q 20,70 40,50 T 80,40 T 120,60 T 160,20 T 200,30 L 200,100 L 0,100 Z"
                            fill="url(#blueGradient)"
                        />
                        <path
                            d="M 0,80 Q 20,70 40,50 T 80,40 T 120,60 T 160,20 T 200,30"
                            fill="none"
                            className="stroke-brand"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        {/* Data Points */}
                        {[
                            { cx: 40, cy: 50, origin: 'origin-[40px_50px]' },
                            { cx: 80, cy: 40, origin: 'origin-[80px_40px]' },
                            { cx: 120, cy: 60, origin: 'origin-[120px_60px]' },
                            { cx: 160, cy: 20, origin: 'origin-[160px_20px]' },
                            { cx: 200, cy: 30, origin: 'origin-[200px_30px]' }
                        ].map((pt, i) => (
                            <circle key={i} cx={pt.cx} cy={pt.cy} r="4" className={clsx("cursor-pointer hover:scale-150 transition-transform fill-white dark:fill-brand stroke-brand", pt.origin)} strokeWidth="2" />
                        ))}
                    </svg>

                    <div className="flex justify-between items-center w-full mt-4 border-t border-border-dim pt-3">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">This Week</p>
                            <p className="text-lg font-extrabold text-text-main">$4,250</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Growth</p>
                            <p className="text-lg font-extrabold text-success">+12%</p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
