import React, { useState, useEffect, useCallback } from 'react';
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
    FileText,
    Menu,
    X,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    Pill,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { RoleBadge } from '../ui/Badge';
import { PERMISSIONS } from '../../lib/constants';
import { useHasPermission } from '../../lib/permissionUtils';
import { ThemeToggle } from '../../../shared-ui/theme/ThemeToggle';
import { useIntegrationStatus } from '../../hooks/useIntegrationStatus';

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
function SidebarNavItem({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
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
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={clsx(
                'flex items-center gap-3 rounded-xl text-sm transition-all',
                collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5',
                isActive
                    ? 'bg-[var(--sidebar-item-active)] text-[var(--sidebar-text-active)] shadow-sm'
                    : 'text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] hover:bg-[var(--sidebar-item-hover)]'
            )}
        >
            <span className={clsx('flex items-center', collapsed ? 'gap-0' : 'gap-3')}>
                <Icon size={collapsed ? 20 : 18} />
                {!collapsed && item.label}
            </span>
            {isActive && !collapsed && <ChevronRight size={14} className="opacity-70" />}
        </NavLink>
    );
}

// Conditional POS nav item — only renders when tenant has active POS subscription
function POSNavItem({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
    const { isPOSActive } = useIntegrationStatus();
    const canAccess = useHasPermission(PERMISSIONS.POS_ACCESS);
    const location = useLocation();

    if (!isPOSActive || !canAccess) return null;

    const isActive = location.pathname.startsWith('/pharmacy-pos');

    return (
        <NavLink
            to="/pharmacy-pos"
            onClick={onNavigate}
            title={collapsed ? 'Pharmacy POS' : undefined}
            className={clsx(
                'flex items-center gap-3 rounded-xl text-sm transition-all',
                collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5',
                isActive
                    ? 'bg-[var(--sidebar-item-active)] text-[var(--sidebar-text-active)] shadow-sm'
                    : 'text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] hover:bg-[var(--sidebar-item-hover)]'
            )}
        >
            <span className={clsx('flex items-center', collapsed ? 'gap-0' : 'gap-3')}>
                <Pill size={collapsed ? 20 : 18} />
                {!collapsed && 'Pharmacy POS'}
            </span>
            {isActive && !collapsed && <ChevronRight size={14} className="opacity-70" />}
        </NavLink>
    );
}

// ─── Mobile Top Bar ───────────────────────────────────────────────────────────
export function MobileTopBar({ onToggle, cartCount }: { onToggle: () => void; cartCount?: number }) {
    return (
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--sidebar-bg)] border-b border-[var(--sidebar-border)] sticky top-0 z-40">
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggle}
                    className="p-2 rounded-lg text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] transition-colors"
                    aria-label="Toggle menu"
                >
                    <Menu size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Activity size={14} className="text-white" />
                    </div>
                    <p className="font-bold text-sm text-[var(--sidebar-text-active)]">MedFlow</p>
                </div>
            </div>
        </div>
    );
}

// ─── Sidebar Component ────────────────────────────────────────────────────────
export function Sidebar() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Mobile drawer state
    const [mobileOpen, setMobileOpen] = useState(false);
    // Tablet collapsed state
    const [collapsed, setCollapsed] = useState(false);

    // Close mobile drawer on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Close mobile drawer on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileOpen(false);
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, []);

    // Prevent body scroll when mobile drawer is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const closeMobile = useCallback(() => setMobileOpen(false), []);

    // ─── Sidebar Content (shared between mobile drawer and desktop) ───────────
    const sidebarContent = (isMobile: boolean) => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={clsx(
                'border-b border-[var(--sidebar-border)]',
                collapsed && !isMobile ? 'px-2 py-5' : 'px-5 py-5'
            )}>
                <div className={clsx('flex items-center', collapsed && !isMobile ? 'justify-center' : 'gap-2')}>
                    {isMobile && (
                        <button
                            onClick={closeMobile}
                            className="p-1.5 rounded-lg text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] transition-colors mr-2"
                            aria-label="Close menu"
                        >
                            <X size={18} />
                        </button>
                    )}
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                        <Activity size={16} className="text-white" />
                    </div>
                    {(!collapsed || isMobile) && (
                        <div>
                            <p className="font-bold text-sm leading-none text-[var(--sidebar-text-active)]">MedFlow</p>
                            <p className="text-xs mt-0.5 text-[var(--sidebar-text)]">Healthcare OS</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className={clsx(
                'flex-1 py-4 space-y-1 overflow-y-auto',
                collapsed && !isMobile ? 'px-2' : 'px-3'
            )}>
                {navItems.map(item => (
                    <SidebarNavItem
                        key={item.to}
                        item={item}
                        collapsed={collapsed && !isMobile}
                        onNavigate={isMobile ? closeMobile : undefined}
                    />
                ))}
                <POSNavItem collapsed={collapsed && !isMobile} onNavigate={isMobile ? closeMobile : undefined} />
            </nav>

            {/* Collapse Toggle (tablet/desktop only) */}
            {!isMobile && (
                <div className="px-3 pb-2 hidden md:block lg:hidden">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] transition-colors"
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <ChevronRightIcon size={14} /> : <ChevronLeft size={14} />}
                        {!collapsed && <span>Collapse</span>}
                    </button>
                </div>
            )}

            {/* Theme Toggle */}
            <div className={clsx(collapsed && !isMobile ? 'px-2 pb-2' : 'px-3 pb-2')}>
                <ThemeToggle className="w-full" />
            </div>

            {/* User info — links to Profile */}
            <div className={clsx(
                'py-4 border-t border-[var(--sidebar-border)]',
                collapsed && !isMobile ? 'px-2' : 'px-4'
            )}>
                <button
                    onClick={() => {
                        navigate('/profile');
                        if (isMobile) closeMobile();
                    }}
                    className={clsx(
                        'flex items-center mb-3 w-full hover:bg-[var(--sidebar-item-hover)] rounded-xl transition-colors group',
                        collapsed && !isMobile ? 'justify-center p-2' : 'gap-3 p-2'
                    )}
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
                    {(!collapsed || isMobile) && (
                        <div className="min-w-0 text-left">
                            <p className="text-xs font-medium truncate text-[var(--sidebar-text-active)] group-hover:text-brand transition-colors">
                                {user?.full_name ?? user?.email}
                            </p>
                            <div className="mt-0.5">
                                <RoleBadge roleName={user?.role?.name ?? 'Viewer'} size="sm" />
                            </div>
                        </div>
                    )}
                </button>
                <button
                    onClick={handleSignOut}
                    className={clsx(
                        'flex items-center w-full rounded-lg text-xs transition-colors hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--sidebar-text-active)] text-[var(--sidebar-text)]',
                        collapsed && !isMobile ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2'
                    )}
                    title="Sign out"
                >
                    <LogOut size={14} />
                    {(!collapsed || isMobile) && 'Sign out'}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* ─── Mobile Drawer ─────────────────────────────────────────── */}
            {/* Backdrop */}
            <div
                className={clsx(
                    'fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300',
                    mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                onClick={closeMobile}
            />
            {/* Drawer */}
            <aside
                className={clsx(
                    'fixed top-0 left-0 h-full w-72 z-50 md:hidden bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-2xl',
                    'transform transition-transform duration-300 ease-in-out',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {sidebarContent(true)}
            </aside>

            {/* ─── Mobile Top Bar ────────────────────────────────────────── */}
            <MobileTopBar onToggle={() => setMobileOpen(true)} />

            {/* ─── Desktop / Tablet Sidebar ──────────────────────────────── */}
            <aside
                className={clsx(
                    'hidden md:flex shrink-0 h-screen flex-col border-r bg-[var(--sidebar-bg)] border-[var(--sidebar-border)] transition-all duration-300',
                    collapsed ? 'w-16' : 'w-60'
                )}
            >
                {sidebarContent(false)}
            </aside>
        </>
    );
}
