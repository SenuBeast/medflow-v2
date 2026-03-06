import { Card } from '../ui/Card';

// Using a simple mock implementation since 'recharts' might not be installed based on package.json
// To keep it simple, we'll build CSS-based charts to avoid new dependencies initially.
// If recharts is requested later, we can swap these out.

export function ChartsSection() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
            {/* Inventory Overview (Bar Chart) */}
            <Card className="col-span-1 lg:col-span-2 flex flex-col hover:shadow-md transition-shadow">
                <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Inventory Overview</h3>
                    <p className="text-xs text-slate-500 mt-1">Stock levels across major categories</p>
                </div>

                <div className="flex-1 flex items-end gap-2 sm:gap-4 h-[200px] mt-auto">
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
                            <div className="absolute -top-10 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                {item.value}% Filled
                            </div>

                            {/* Bar */}
                            <div className="w-full relative bg-slate-100 rounded-t-sm h-full flex items-end overflow-hidden group-hover:bg-slate-200 transition-colors">
                                <div
                                    className={`w-full rounded-t-sm ${item.color} ${item.hClass} group-hover:brightness-110 transition-all duration-500`}
                                />
                            </div>

                            {/* Label */}
                            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-2 truncate w-full text-center px-1">
                                {item.label}
                            </p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Sales Trend (Line/Area Chart abstract) */}
            <Card className="flex flex-col hover:shadow-md transition-shadow">
                <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Sales Trend</h3>
                    <p className="text-xs text-slate-500 mt-1">Last 7 days performance</p>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    {/* Abstract SVG line chart */}
                    <svg viewBox="0 0 200 100" className="w-full h-32 overflow-visible drop-shadow-sm">
                        <defs>
                            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M 0,80 Q 20,70 40,50 T 80,40 T 120,60 T 160,20 T 200,30 L 200,100 L 0,100 Z"
                            fill="url(#blueGradient)"
                        />
                        <path
                            d="M 0,80 Q 20,70 40,50 T 80,40 T 120,60 T 160,20 T 200,30"
                            fill="none"
                            stroke="#3b82f6"
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
                            <circle key={i} cx={pt.cx} cy={pt.cy} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" className={`cursor-pointer hover:scale-150 transition-transform ${pt.origin}`} />
                        ))}
                    </svg>

                    <div className="flex justify-between items-center w-full mt-4 border-t border-slate-100 pt-3">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Week</p>
                            <p className="text-lg font-bold text-slate-900">$4,250</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Growth</p>
                            <p className="text-lg font-bold text-emerald-600">+12%</p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
