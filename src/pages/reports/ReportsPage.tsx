import { useState } from 'react';
import { Package, DollarSign, AlertTriangle, TrendingDown, BarChart3, ShoppingCart, ClipboardCheck, Activity, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { differenceInDays } from 'date-fns';

import { ReportFilterBar } from './components/ReportFilterBar';
import { InventoryReport } from './tabs/InventoryReport';
import { SalesReport } from './tabs/SalesReport';
import { ExpiryReport } from './tabs/ExpiryReport';
import { ControlledReport } from './tabs/ControlledReport';
import { StockCountReport } from './tabs/StockCountReport';
import { AuditReport } from './tabs/AuditReport';

import { useInventory } from '../../hooks/useInventory';
import { useSaleTransactions } from '../../hooks/useSales';
import type { ReportFilters } from '../../lib/types';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
    label, value, sub, icon: Icon, iconBg, accent,
}: { label: string; value: string; sub?: string; icon: React.ElementType; iconBg: string; accent?: boolean }) {
    return (
        <div className={clsx(
            'flex items-center gap-3 md:gap-4 bg-card border rounded-2xl p-3 md:p-5 transition-shadow hover:shadow-sm',
            accent ? 'border-amber-200 bg-amber-50/30' : 'border-border-dim'
        )}>
            <div className={clsx('w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
                <Icon size={18} className="text-white md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-semibold text-text-sub uppercase tracking-wide">{label}</p>
                <p className="text-lg md:text-2xl font-bold text-text-main mt-0.5">{value}</p>
                {sub && <p className="text-[10px] md:text-xs text-text-dim mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = 'inventory' | 'sales' | 'expiry' | 'controlled' | 'stock-counts' | 'audit';

const TABS: { id: TabId; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'expiry', label: 'Expiry', icon: AlertTriangle },
    { id: 'controlled', label: 'Controlled', icon: ShieldAlert, badge: '!' },
    { id: 'stock-counts', label: 'Stock Counts', icon: ClipboardCheck },
    { id: 'audit', label: 'Audit Log', icon: Activity },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ReportsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('inventory');
    const [filters, setFilters] = useState<ReportFilters>({ expiryWindow: 30 });

    const { data: inventory = [] } = useInventory();
    const { data: transactions = [] } = useSaleTransactions({});

    // ── Global KPIs ────────────────────────────────────────────────────────────
    const inventoryValue = inventory.reduce((s, item) => {
        const totalStock = (item.batches ?? []).filter(b => b.status === 'active').reduce((q, b) => q + b.quantity, 0);
        return s + totalStock * (item.cost_price ?? 0);
    }, 0);

    const lowStockCount = inventory.filter(item => {
        const totalStock = (item.batches ?? []).filter(b => b.status === 'active').reduce((q, b) => q + b.quantity, 0);
        return totalStock > 0 && totalStock <= item.minimum_order_quantity;
    }).length;

    const today = new Date();
    const expiringSoonCount = inventory
        .flatMap(i => (i.batches ?? []).filter(b => b.status === 'active'))
        .filter(b => b.expiry_date && differenceInDays(new Date(b.expiry_date), today) <= 30 && differenceInDays(new Date(b.expiry_date), today) >= 0)
        .length;

    const totalRevenue = transactions
        .filter(tx => tx.status !== 'refunded')
        .reduce((s, tx) => s + tx.total, 0);

    const categories = Array.from(new Set(inventory.map(i => i.category).filter(Boolean))) as string[];

    return (
        <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-5">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-text-main">Reports</h1>
                <p className="text-text-sub text-xs md:text-sm mt-0.5">Analytics, compliance & data exports</p>
            </div>

            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KpiCard label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} sub={`${transactions.length} transactions`} icon={DollarSign} iconBg="bg-blue-500" />
                <KpiCard label="Inventory Value" value={`$${inventoryValue.toFixed(2)}`} sub={`${inventory.length} line items`} icon={BarChart3} iconBg="bg-indigo-500" />
                <KpiCard label="Expiring Soon" value={expiringSoonCount.toString()} sub="Batches within 30 days" icon={AlertTriangle} iconBg="bg-amber-500" accent={expiringSoonCount > 0} />
                <KpiCard label="Low Stock Items" value={lowStockCount.toString()} sub="Below reorder level" icon={TrendingDown} iconBg="bg-red-500" accent={lowStockCount > 0} />
            </div>

            {/* ── Global Filters ─────────────────────────────────────────── */}
            <ReportFilterBar
                filters={filters}
                onChange={setFilters}
                categories={categories}
                showExpiryWindow={activeTab === 'expiry'}
            />

            {/* ── Tabs ───────────────────────────────────────────────────── */}
            <div className="border-b border-border-main">
                <div className="flex gap-4 md:gap-8 overflow-x-auto scrollbar-none pb-px">
                    {TABS.map(({ id, label, icon: Icon, badge }) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={clsx(
                                    'flex items-center gap-1.5 md:gap-2.5 pb-3 md:pb-4 px-1 rounded-none text-xs md:text-sm font-semibold whitespace-nowrap transition-all relative border-b-2',
                                    isActive
                                        ? 'border-brand text-brand'
                                        : 'border-transparent text-text-sub hover:text-text-main hover:border-border-main'
                                )}
                            >
                                <Icon size={14} className={clsx('transition-colors md:w-4 md:h-4', isActive ? 'text-brand' : 'text-text-dim')} />
                                <span className="hidden sm:inline">{label}</span>
                                <span className="sm:hidden">{label.split(' ')[0]}</span>
                                {badge && (
                                    <span className="ml-0.5 md:ml-1 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                        {badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab Content ────────────────────────────────────────────── */}
            <div>
                {activeTab === 'inventory' && <InventoryReport filters={filters} />}
                {activeTab === 'sales' && <SalesReport filters={filters} />}
                {activeTab === 'expiry' && <ExpiryReport filters={filters} onFiltersChange={setFilters} />}
                {activeTab === 'controlled' && <ControlledReport filters={filters} />}
                {activeTab === 'stock-counts' && <StockCountReport filters={filters} />}
                {activeTab === 'audit' && <AuditReport filters={filters} />}
            </div>
        </div>
    );
}
