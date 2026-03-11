import { AlertTriangle, Plus, LayoutGrid, Shield, TrendingUp, Hash, ShoppingCart } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useLiveSalesDashboard } from '../hooks/useLiveSalesDashboard';
import { useAuthStore } from '../store/authStore';
import { PERMISSIONS } from '../lib/constants';
import { PermissionGuard } from '../components/auth/Guards';
import { Link } from 'react-router-dom';
import { hasPermission } from '../lib/permissionUtils';

// Subcomponents
import { KpiCard } from '../components/dashboard/KpiCard';
import { ChartsSection } from '../components/dashboard/ChartsSection';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { Card } from '../components/ui/Card';

// Real-time Dashboard Components
import { HourlyRevenueChart } from '../components/dashboard/HourlyRevenueChart';
import { LiveSalesFeed } from '../components/dashboard/LiveSalesFeed';
import { TopProductsList } from '../components/dashboard/TopProductsList';

export function DashboardPage() {
    const { data: inventory = [], isLoading: invLoading } = useInventory();
    const {
        metrics,
        chartData,
        recentSales,
        isLoading: salesLoading
    } = useLiveSalesDashboard();

    const user = useAuthStore((s) => s.user);

    const isLoading = invLoading || salesLoading;

    // Derived stats
    const lowStock = inventory.filter((i) => i.quantity <= i.minimum_order_quantity).length;

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header / Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main tracking-tight flex items-center gap-2">
                        <span>Dashboard</span>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-bold border border-success/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                            </span>
                            LIVE
                        </span>
                    </h1>
                    <p className="text-text-dim text-sm mt-1 flex items-center gap-2">
                        <span className="font-semibold text-text-sub">{user?.full_name ?? 'User'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-border-dim" />
                        <span>{today}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {hasPermission(PERMISSIONS.INVENTORY_ADD) && (
                        <Link to="/inventory" className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-full hover:bg-brand-hover transition-all shadow-lg shadow-brand/20 active:scale-95 cursor-pointer isolate">
                            <Plus size={18} /> Add Item
                        </Link>
                    )}
                    {hasPermission(PERMISSIONS.SALES_CREATE) && (
                        <Link to="/sales" className="inline-flex items-center gap-2 px-6 py-2.5 bg-success text-white text-sm font-bold rounded-full hover:brightness-110 transition-all shadow-lg shadow-success/20 active:scale-95 cursor-pointer isolate">
                            <ShoppingCart size={18} /> New Sale
                        </Link>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                        <PermissionGuard permission={PERMISSIONS.INVENTORY_VIEW}>
                            <KpiCard
                                title="Low Stock"
                                value={lowStock}
                                icon={<AlertTriangle size={22} />}
                                colorScheme={lowStock > 0 ? 'yellow' : 'blue'}
                                trend={{ value: 'Requires attention', positive: lowStock === 0 }}
                            />
                        </PermissionGuard>

                        <PermissionGuard permission={PERMISSIONS.SALES_VIEW}>
                            <KpiCard
                                title="Today's Revenue"
                                value={`$${metrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                icon={<ShoppingCart size={22} />}
                                colorScheme="green"
                            />
                            <KpiCard
                                title="Today's Transactions"
                                value={metrics.transactions_count}
                                icon={<Hash size={22} />}
                                colorScheme="blue"
                            />
                            <KpiCard
                                title="Avg Order Value"
                                value={`$${(metrics.average_order_value || 0).toFixed(2)}`}
                                icon={<TrendingUp size={22} />}
                                colorScheme="blue"
                            />
                        </PermissionGuard>
                    </div>

                    {/* Live Analytics Dashboard (Middle & Right Sections) */}
                    <PermissionGuard permission={PERMISSIONS.SALES_VIEW}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Live Chart */}
                            <div className="lg:col-span-2 flex flex-col min-h-[350px]">
                                <HourlyRevenueChart data={chartData} />
                            </div>

                            {/* Live Feed */}
                            <div className="lg:col-span-1 flex flex-col h-[350px]">
                                <LiveSalesFeed sales={recentSales} />
                            </div>
                        </div>
                    </PermissionGuard>

                    {/* Bottom Row: Alerts, Top Products, Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Alerts & Inventory logic */}
                        <div className="lg:col-span-1 h-[400px]">
                            <PermissionGuard permission={PERMISSIONS.INVENTORY_VIEW}>
                                <AlertsPanel />
                            </PermissionGuard>
                        </div>

                        {/* Top Selling Products */}
                        <div className="lg:col-span-1 h-[400px]">
                            <PermissionGuard permission={PERMISSIONS.SALES_VIEW}>
                                <TopProductsList />
                            </PermissionGuard>
                        </div>

                        {/* Audit Log / General Activity */}
                        <div className="lg:col-span-1 h-[400px]">
                            <PermissionGuard permission={PERMISSIONS.ADMIN_AUDIT_VIEW} fallback={
                                <Card className="h-full flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-border-dim bg-surface-dim/30 hover:bg-surface-dim/50 transition-colors">
                                    <Shield className="w-12 h-12 text-text-dim/30 mb-3" />
                                    <h3 className="text-sm font-bold text-text-sub">Audit Restricted</h3>
                                    <p className="text-xs text-text-dim mt-1 max-w-[200px]">Detailed system history is restricted to Administrators.</p>
                                </Card>
                            }>
                                <ActivityFeed />
                            </PermissionGuard>
                        </div>
                    </div>

                    {/* Extended Reports View */}
                    <div className="pt-4">
                        <PermissionGuard permission={PERMISSIONS.REPORTS_VIEW}>
                            <ChartsSection />
                        </PermissionGuard>
                    </div>

                    {/* Fallback Empty State if user has zero modules permission (Viewer base state) */}
                    {!hasPermission(PERMISSIONS.INVENTORY_VIEW) && !hasPermission(PERMISSIONS.SALES_VIEW) && !hasPermission(PERMISSIONS.REPORTS_VIEW) && (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-surface-dim rounded-2xl flex items-center justify-center mb-4 text-text-dim/40">
                                <LayoutGrid size={32} />
                            </div>
                            <h2 className="text-lg font-bold text-text-main mb-2">Welcome to MedFlow</h2>
                            <p className="text-sm text-text-dim max-w-sm">
                                You currently have no system modules assigned. Please speak to your administrator to request access.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
