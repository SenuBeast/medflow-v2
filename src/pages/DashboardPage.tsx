import { Package, ShoppingCart, AlertTriangle, Clock, Plus, LayoutGrid, Shield } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useSales } from '../hooks/useSales';
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

export function DashboardPage() {
    const { data: inventory = [], isLoading: invLoading } = useInventory();
    const { data: sales = [], isLoading: salesLoading } = useSales();
    const user = useAuthStore((s) => s.user);

    const isLoading = invLoading || salesLoading;

    // Derived stats
    const lowStock = inventory.filter((i) => i.quantity <= i.minimum_order_quantity).length;
    const expiringSoon = inventory.filter((i) => {
        if (!i.expiry_date) return false;
        const exp = new Date(i.expiry_date);
        const in30 = new Date();
        in30.setDate(in30.getDate() + 30);
        return exp <= in30;
    }).length;
    const totalRevenue = sales.reduce((acc, s) => acc + (s.total ?? 0), 0);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header / Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                        <span className="font-medium text-slate-700">{user?.full_name ?? 'User'}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>{today}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {hasPermission(PERMISSIONS.INVENTORY_ADD) && (
                        <Link to="/inventory" className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
                            <Plus size={14} /> Add Item
                        </Link>
                    )}
                    {hasPermission(PERMISSIONS.SALES_CREATE) && (
                        <Link to="/sales" className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20">
                            <ShoppingCart size={14} /> New Sale
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
                                title="Total Items"
                                value={inventory.length}
                                icon={<Package size={22} />}
                                colorScheme="blue"
                            />
                            <KpiCard
                                title="Low Stock"
                                value={lowStock}
                                icon={<AlertTriangle size={22} />}
                                colorScheme={lowStock > 0 ? 'yellow' : 'blue'}
                                trend={{ value: '2 items resolved', positive: true }}
                            />
                            <KpiCard
                                title="Expiring Soon"
                                value={expiringSoon}
                                icon={<Clock size={22} />}
                                colorScheme={expiringSoon > 0 ? 'red' : 'green'}
                            />
                        </PermissionGuard>

                        <PermissionGuard permission={PERMISSIONS.SALES_VIEW}>
                            <KpiCard
                                title="Today's Sales"
                                value={`$${totalRevenue.toLocaleString()}`}
                                icon={<ShoppingCart size={22} />}
                                colorScheme="green"
                                trend={{ value: '+4.5%', positive: true }}
                            />
                        </PermissionGuard>
                    </div>

                    {/* Charts (Reports View Needed) */}
                    <PermissionGuard permission={PERMISSIONS.REPORTS_VIEW}>
                        <ChartsSection />
                    </PermissionGuard>

                    {/* Bottom Row: Alerts and Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-auto lg:h-[400px]">
                        <AlertsPanel />

                        <PermissionGuard permission={PERMISSIONS.ADMIN_AUDIT_VIEW} fallback={
                            <Card className="h-full flex flex-col items-center justify-center text-center p-8 border-dashed border-2 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <Shield className="w-12 h-12 text-slate-300 mb-3" />
                                <h3 className="text-sm font-bold text-slate-700">Audit Restricted</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Detailed system history is restricted to Administrators.</p>
                            </Card>
                        }>
                            <ActivityFeed />
                        </PermissionGuard>
                    </div>

                    {/* Fallback Empty State if user has zero modules permission (Viewer base state) */}
                    {!hasPermission(PERMISSIONS.INVENTORY_VIEW) && !hasPermission(PERMISSIONS.SALES_VIEW) && !hasPermission(PERMISSIONS.REPORTS_VIEW) && (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                                <LayoutGrid size={32} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">Welcome to MedFlow</h2>
                            <p className="text-sm text-slate-500 max-w-sm">
                                You currently have no system modules assigned. Please speak to your administrator to request access.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
