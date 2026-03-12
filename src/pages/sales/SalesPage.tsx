import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LineChart, Receipt, FileText, Share2, Users, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export function SalesPage() {
    const location = useLocation();

    const tabs = [
        { path: 'overview', label: 'Overview', icon: LineChart },
        { path: 'transactions', label: 'Transactions', icon: Receipt },
        { path: 'products', label: 'Product Performance', icon: Share2 },
        { path: 'staff', label: 'Staff Performance', icon: Users },
        { path: 'refunds', label: 'Refunds & Returns', icon: AlertTriangle },
        { path: 'reports', label: 'Reports', icon: FileText },
    ];

    return (
        <div className="max-w-[1600px] mx-auto min-h-[calc(100vh-8rem)]">
            <div className="mb-4 md:mb-8">
                <h1 className="text-xl md:text-2xl font-bold text-text-main">Sales Dashboard</h1>
                <p className="text-text-sub text-xs md:text-sm mt-1">Analytics, reporting, and management interface</p>
            </div>

            <div className="flex border-b border-border-main mb-4 md:mb-8 overflow-x-auto scrollbar-none">
                <div className="flex gap-3 md:gap-6 pb-px">
                    {tabs.map(({ path, label, icon: Icon }) => {
                        const isActive = location.pathname.includes(`/sales/${path}`);
                        return (
                            <NavLink
                                key={path}
                                to={path}
                                className={clsx(
                                    'whitespace-nowrap pb-3 md:pb-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center gap-1.5 md:gap-2 transition-colors',
                                    isActive
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-text-sub hover:text-gray-700 hover:border-gray-300'
                                )}
                            >
                                <Icon size={14} className="md:w-4 md:h-4" />
                                <span className="hidden sm:inline">{label}</span>
                                <span className="sm:hidden">{label.split(' ')[0]}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </div>

            <div className="animate-in fade-in duration-300">
                <Outlet />
            </div>
        </div>
    );
}
