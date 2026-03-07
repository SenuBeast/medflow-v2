import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    LogOut,
    Activity,
    ChevronRight,
    ShieldAlert,
    ClipboardCheck,
    FileText
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { RoleBadge } from '../ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { PERMISSIONS } from '../../lib/constants';
import { hasPermission } from '../../lib/permissionUtils';

interface NavItem {
    label: string;
    to: string;
    icon: React.ElementType;
    permission?: string | null;
    exact?: boolean;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, permission: null },
    { label: 'Inventory', to: '/inventory', icon: Package, permission: PERMISSIONS.INVENTORY_VIEW, exact: true },
    { label: 'Stock Counts', to: '/inventory/stock-counts', icon: ClipboardCheck, permission: PERMISSIONS.STOCK_COUNTS_PERFORM },
    { label: 'Sales', to: '/sales', icon: ShoppingCart, permission: PERMISSIONS.SALES_VIEW },
    { label: 'Reports', to: '/reports', icon: FileText, permission: PERMISSIONS.REPORTS_VIEW },
    { label: 'Admin', to: '/admin', icon: ShieldAlert, permission: PERMISSIONS.ADMIN_ACCESS_PANEL },
];

export function Sidebar() {
    const { user, signOut } = useAuth();
    useAuthStore((state) => state.permissions); // subscribe for reactivity
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    // The filtering logic is moved inside the map function as per the instruction snippet
    // const visibleNav = NAV_ITEMS.filter(
    //     (item) => !item.permission || hasPermission(item.permission)
    // );

    return (
        <aside className="w-60 shrink-0 h-screen flex flex-col bg-pos-surface border-r border-pos-border">
            {/* Logo */}
            <div className="px-5 py-5 border-b border-pos-border">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pos-primary flex items-center justify-center">
                        <Activity size={16} className="text-white" />
                    </div>
                    <div>
                        <p className="text-pos-text font-bold text-sm leading-none">MedFlow</p>
                        <p className="text-pos-text-muted text-xs mt-0.5">Healthcare OS</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    if (item.permission && !hasPermission(item.permission)) {
                        return null;
                    }

                    const isActive = item.exact
                        ? location.pathname === item.to
                        : location.pathname.startsWith(item.to);
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={clsx(
                                'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                                isActive
                                    ? 'bg-pos-primary text-white shadow-sm'
                                    : 'text-pos-text-muted hover:text-pos-text hover:bg-pos-surface-hover'
                            )}
                        >
                            <span className="flex items-center gap-3">
                                <Icon size={18} />
                                {item.label}
                            </span>
                            {isActive && <ChevronRight size={14} className="opacity-70" />}
                        </NavLink>
                    );
                })}
            </nav>

            {/* User info at bottom */}
            <div className="px-4 py-4 border-t border-gray-800">
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <span className="text-blue-400 text-xs font-bold">
                            {(user?.full_name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-pos-text text-xs font-medium truncate">
                            {user?.full_name ?? user?.email}
                        </p>
                        <div className="mt-1">
                            <RoleBadge roleName={user?.role?.name ?? 'Viewer'} size="sm" />
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <ThemeToggle />
                </div>

                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-3 py-2 text-pos-text-muted hover:text-pos-accent hover:bg-pos-surface-hover rounded-lg text-xs transition-colors"
                >
                    <LogOut size={14} />
                    Sign out
                </button>
            </div>
        </aside >
    );
}

import { ThemeToggle } from '@shared-ui/theme/ThemeToggle';
