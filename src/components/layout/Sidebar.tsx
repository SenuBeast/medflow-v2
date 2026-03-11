import React from 'react';
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
import { PERMISSIONS } from '../../lib/constants';
import { useHasPermission } from '../../lib/permissionUtils';
import { ThemeToggle } from '../../../shared-ui/theme/ThemeToggle';

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
    { label: 'Stock Counts', to: '/stock-counts', icon: ClipboardCheck, permission: PERMISSIONS.STOCK_COUNTS_PERFORM },
    { label: 'Sales', to: '/sales', icon: ShoppingCart, permission: PERMISSIONS.SALES_VIEW },
    { label: 'Reports', to: '/reports', icon: FileText, permission: PERMISSIONS.REPORTS_VIEW },
    { label: 'Admin', to: '/admin', icon: ShieldAlert, permission: PERMISSIONS.ADMIN_ACCESS_PANEL },
];

// Each nav item is a component so useHasPermission hook rules are satisfied
function SidebarNavItem({ item }: { item: NavItem }) {
    const location = useLocation();
    const canAccess = useHasPermission(item.permission ?? '');
    if (item.permission && !canAccess) return null;

    const isActive = item.exact
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to);
    const Icon = item.icon;

    return (
        <NavLink
            to={item.to}
            className={clsx(
                'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                isActive
                    ? 'bg-[var(--sidebar-item-active)] text-[var(--sidebar-text-active)] shadow-sm'
                    : 'text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] hover:bg-[var(--sidebar-item-hover)]'
            )}
        >
            <span className="flex items-center gap-3">
                <Icon size={18} />
                {item.label}
            </span>
            {isActive && <ChevronRight size={14} className="opacity-70" />}
        </NavLink>
    );
}

export function Sidebar() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <aside
            className="w-60 shrink-0 h-screen flex flex-col border-r bg-[var(--sidebar-bg)] border-[var(--sidebar-border)]"
        >
            {/* Logo */}
            <div className="px-5 py-5 border-b border-[var(--sidebar-border)]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Activity size={16} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-sm leading-none text-[var(--sidebar-text-active)]">MedFlow</p>
                        <p className="text-xs mt-0.5 text-[var(--sidebar-text)]">Healthcare OS</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map(item => (
                    <SidebarNavItem key={item.to} item={item} />
                ))}
            </nav>

            {/* Theme Toggle */}
            <div className="px-3 pb-2">
                <ThemeToggle className="w-full" />
            </div>

            {/* User info — links to Profile */}
            <div className="px-4 py-4 border-t border-[var(--sidebar-border)]">
                <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-3 mb-3 w-full hover:bg-[var(--sidebar-item-hover)] p-2 rounded-xl transition-colors group"
                    title="View profile"
                >
                    {/* Avatar — shows Google photo or initials */}
                    {user?.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.full_name ?? 'Avatar'}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-border-dim shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
                            <span className="text-brand text-xs font-bold">
                                {(user?.full_name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    <div className="min-w-0 text-left">
                        <p className="text-xs font-medium truncate text-[var(--sidebar-text-active)] group-hover:text-brand transition-colors">
                            {user?.full_name ?? user?.email}
                        </p>
                        <div className="mt-0.5">
                            <RoleBadge roleName={user?.role?.name ?? 'Viewer'} size="sm" />
                        </div>
                    </div>
                </button>
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-text-active)] text-[var(--sidebar-text)]"
                >
                    <LogOut size={14} />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
