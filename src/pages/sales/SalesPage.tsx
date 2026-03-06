import { useState, useCallback, useMemo } from 'react';
import { ShoppingCart, Receipt, TrendingUp, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { ProductSearch } from './pos/ProductSearch';
import { CartPanel } from './pos/CartPanel';
import { SalesHistoryTable } from './history/SalesHistoryTable';
import { SaleDetailDrawer } from './history/SaleDetailDrawer';
import { RefundModal } from './history/RefundModal';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { PermissionGuard } from '../../components/auth/Guards';
import { PERMISSIONS } from '../../lib/constants';
import { useSaleTransactions, useCreateSaleTransaction } from '../../hooks/useSales';
import { hasPermission } from '../../lib/permissionUtils';
import type { CartItem, SaleTransaction } from '../../lib/types';
import { clsx } from 'clsx';
import { startOfDay, endOfDay } from 'date-fns';
import { useInventory } from '../../hooks/useInventory';

type Tab = 'pos' | 'history';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color }: {
    label: string; value: string; icon: React.ElementType; color: string;
}) {
    return (
        <Card className="flex items-center gap-4 p-5">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
                <Icon size={18} className="text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
            </div>
        </Card>
    );
}

// ─── POS Shell ────────────────────────────────────────────────────────────────
function POSShell() {
    const createSale = useCreateSaleTransaction();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canApplyDiscount = hasPermission(PERMISSIONS.SALES_DISCOUNT);
    const cartItemIds = useMemo(() => new Set(cart.map(i => i.item_id)), [cart]);

    const handleAddToCart = useCallback((item: CartItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.item_id === item.item_id);
            if (existing) {
                return prev.map(i => i.item_id === item.item_id
                    ? { ...i, quantity: Math.min(i.quantity + 1, i.max_quantity), subtotal: (i.quantity + 1) * i.unit_price }
                    : i
                );
            }
            return [...prev, item];
        });
    }, []);

    const handleUpdateQuantity = useCallback((itemId: string, qty: number) => {
        if (qty <= 0) {
            setCart(prev => prev.filter(i => i.item_id !== itemId));
        } else {
            setCart(prev => prev.map(i => i.item_id === itemId
                ? { ...i, quantity: Math.min(qty, i.max_quantity), subtotal: Math.min(qty, i.max_quantity) * i.unit_price }
                : i
            ));
        }
    }, []);

    const handleRemoveItem = useCallback((itemId: string) => {
        setCart(prev => prev.filter(i => i.item_id !== itemId));
    }, []);

    const handleCheckout = async () => {
        setError(null);
        try {
            const tx = await createSale.mutateAsync({
                cart,
                payment_method: paymentMethod,
                discount_amount: discountAmount,
                tax_rate: 0, // Configurable; add tax settings later
                notes: undefined,
            });
            setSuccessMsg(`Sale ${tx.invoice_number} completed!`);
            setCart([]);
            setDiscountAmount(0);
            setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Sale failed');
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-gray-100 overflow-hidden bg-gray-50/50">
            {/* Success / Error banners */}
            {successMsg && (
                <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-right">
                    <ShoppingCart size={16} /> {successMsg}
                </div>
            )}
            {error && (
                <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle size={16} /> {error}
                    <button onClick={() => setError(null)} className="ml-2 hover:opacity-75" title="Dismiss">✕</button>
                </div>
            )}

            {/* Left: Product Search */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Products</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Click to add · Search by name, SKU, barcode</p>
                </div>
                <ProductSearch onAddToCart={handleAddToCart} cartItemIds={cartItemIds} />
            </div>

            {/* Right: Cart */}
            <div className="w-80 shrink-0 flex flex-col">
                <CartPanel
                    cart={cart}
                    paymentMethod={paymentMethod}
                    discountAmount={discountAmount}
                    taxRate={0}
                    canApplyDiscount={canApplyDiscount}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onPaymentMethodChange={setPaymentMethod}
                    onDiscountChange={setDiscountAmount}
                    onCheckout={handleCheckout}
                    isProcessing={createSale.isPending}
                />
            </div>
        </div>
    );
}

// ─── Sales Dashboard KPIs ─────────────────────────────────────────────────────
function SalesDashboardKpis({ transactions }: { transactions: SaleTransaction[] }) {
    const { data: inventory = [] } = useInventory();
    const today = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    const todaySales = transactions.filter(tx =>
        tx.created_at >= today && tx.created_at <= todayEnd && tx.status === 'completed'
    );
    const todayRevenue = todaySales.reduce((s, tx) => s + tx.total, 0);
    const avgValue = transactions.length ? transactions.reduce((s, tx) => s + tx.total, 0) / transactions.length : 0;
    const lowStockCount = inventory.filter(i => i.quantity <= (i.minimum_order_quantity ?? 10) && i.quantity > 0).length;
    const uniqueSellers = new Set(transactions.map(tx => tx.sold_by).filter(Boolean)).size;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Today's Revenue" value={`$${todayRevenue.toFixed(2)}`} icon={DollarSign} color="bg-blue-500" />
            <KpiCard label="Total Transactions" value={transactions.length.toLocaleString()} icon={Receipt} color="bg-emerald-500" />
            <KpiCard label="Avg. Order Value" value={`$${avgValue.toFixed(2)}`} icon={TrendingUp} color="bg-indigo-500" />
            <KpiCard label="Active Staff" value={uniqueSellers.toString()} icon={Users} color="bg-amber-500" />
            {lowStockCount > 0 && (
                <div className="col-span-full flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium">
                    <AlertTriangle size={15} className="shrink-0" />
                    {lowStockCount} product{lowStockCount > 1 ? 's' : ''} running low on stock — check inventory.
                </div>
            )}
        </div>
    );
}

// ─── Main SalesPage ───────────────────────────────────────────────────────────
export function SalesPage() {
    const [activeTab, setActiveTab] = useState<Tab>('pos');
    const [historyFilters, setHistoryFilters] = useState<{
        dateFrom?: string; dateTo?: string; paymentMethod?: string;
    }>({});
    const [selectedTx, setSelectedTx] = useState<SaleTransaction | null>(null);
    const [refundTx, setRefundTx] = useState<SaleTransaction | null>(null);

    const { data: transactions = [], isLoading: txLoading } = useSaleTransactions({
        dateFrom: historyFilters.dateFrom,
        dateTo: historyFilters.dateTo,
        paymentMethod: historyFilters.paymentMethod,
    });

    const canCreate = hasPermission(PERMISSIONS.SALES_CREATE);

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        ...(canCreate ? [{ id: 'pos' as Tab, label: 'Point of Sale', icon: ShoppingCart }] : []),
        { id: 'history' as Tab, label: 'Transaction History', icon: Receipt },
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Point-of-sale & transaction management</p>
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                activeTab === id
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <Icon size={15} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs (always visible) */}
            <SalesDashboardKpis transactions={transactions} />

            {/* Tab Content */}
            {activeTab === 'pos' && (
                <PermissionGuard permission={PERMISSIONS.SALES_CREATE}>
                    <POSShell />
                </PermissionGuard>
            )}

            {activeTab === 'history' && (
                <SalesHistoryTable
                    transactions={transactions}
                    isLoading={txLoading}
                    onViewDetail={setSelectedTx}
                    onFilterChange={(f) => setHistoryFilters({
                        dateFrom: f.dateFrom || undefined,
                        dateTo: f.dateTo || undefined,
                        paymentMethod: f.paymentMethod !== 'all' ? f.paymentMethod : undefined,
                    })}
                />
            )}

            {/* Sale Detail Drawer */}
            <SaleDetailDrawer
                transaction={selectedTx}
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
                onRefund={(tx) => { setSelectedTx(null); setRefundTx(tx); }}
            />

            {/* Refund Modal */}
            {refundTx && (
                <Modal title="Process Refund" onClose={() => setRefundTx(null)} size="md">
                    <RefundModal
                        transaction={refundTx}
                        onClose={() => setRefundTx(null)}
                        onSuccess={() => setRefundTx(null)}
                    />
                </Modal>
            )}
        </div>
    );
}
