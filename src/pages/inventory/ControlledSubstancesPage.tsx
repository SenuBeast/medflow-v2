import { useState, useMemo } from 'react';
import { useInventory, useAdjustBatchStock } from '../../hooks/useInventory';
import { useAuthStore } from '../../store/authStore';
import { PERMISSIONS } from '../../lib/constants';
import { hasPermission } from '../../lib/permissionUtils';
import { ShieldAlert, Search, AlertCircle, Fingerprint } from 'lucide-react';
import { format } from 'date-fns';
import { StockAdjustmentModal } from '../../components/inventory/StockAdjustmentModal';
import type { InventoryItem } from '../../lib/types';

export function ControlledSubstancesPage() {
    const { user } = useAuthStore();
    useAuthStore((state) => state.permissions); // subscribe for reactivity
    const { data: items = [], isLoading } = useInventory();
    const { mutateAsync: adjustStock } = useAdjustBatchStock();
    const [searchTerm, setSearchTerm] = useState('');
    const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);

    const canManage = hasPermission(PERMISSIONS.INVENTORY_CONTROLLED_MANAGE);

    const controlledItems = useMemo(() => {
        return items
            .filter((item) => item.is_controlled)
            .filter((item) =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
            );
    }, [items, searchTerm]);

    if (isLoading) return <div className="p-8 text-center text-text-sub">Loading controlled register...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <ShieldAlert size={24} />
                        </div>
                        <h1 className="text-2xl font-semibold text-text-main">Controlled Substances Registry</h1>
                    </div>
                    <p className="text-sm text-text-sub mt-2">
                        Strictly monitored inventory for Schedule II-V medical supplies. All dispensations must be logged under {user?.full_name}'s credentials.
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or SKU..."
                            title="Search controlled substances"
                            className="w-full pl-10 pr-4 py-2 border border-border-main rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-red-100 overflow-hidden">
                <div className="bg-red-50 px-6 py-3 border-b border-red-100 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600" />
                    <span className="text-xs font-medium text-red-800 uppercase tracking-wider">DEA / Regulatory Compliance Notice Active</span>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface-dim border-b border-border-dim">
                            <th className="px-6 py-4 text-xs font-semibold text-text-sub tracking-wider">Item Details</th>
                            <th className="px-6 py-4 text-xs font-semibold text-text-sub tracking-wider">Category</th>
                            <th className="px-6 py-4 text-xs font-semibold text-text-sub tracking-wider text-right">Current Stock</th>
                            <th className="px-6 py-4 text-xs font-semibold text-text-sub tracking-wider">Expiry Warning</th>
                            <th className="px-6 py-4 text-xs font-semibold text-text-sub tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                        {controlledItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-text-sub">
                                    <ShieldAlert size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-sm">No controlled substances match your search.</p>
                                </td>
                            </tr>
                        ) : (
                            controlledItems.map((item) => (
                                <tr key={item.id} className="hover:bg-red-50/10 transition-colors">
                                    <td className="px-6 py-4 border-b border-gray-50">
                                        <div>
                                            <p className="text-sm font-medium text-text-main">{item.name}</p>
                                            <p className="text-xs text-text-sub mt-0.5">SKU: {item.sku}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-sub border-b border-gray-50">
                                        {item.category}
                                    </td>
                                    <td className="px-6 py-4 border-b border-gray-50 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-semibold tabular-nums ${item.quantity <= item.minimum_order_quantity ? 'text-red-600' : 'text-text-main'}`}>
                                                {item.quantity} <span className="text-xs font-normal text-text-sub ml-1">{item.unit}</span>
                                            </span>
                                            {item.quantity <= item.minimum_order_quantity && (
                                                <span className="text-[10px] text-red-600 font-medium uppercase mt-1">Low Stock</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-b border-gray-50">
                                        {item.batches?.[0]?.expiry_date ? (
                                            <span className={`text-sm ${new Date(item.batches[0].expiry_date) < new Date() ? 'text-red-600 font-semibold' : 'text-text-sub'}`}>
                                                {format(new Date(item.batches[0].expiry_date), 'MMM d, yyyy')}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-text-dim">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 border-b border-gray-50 text-right">
                                        {canManage ? (
                                            <button
                                                onClick={() => setAdjustingItem(item)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-xs font-medium transition-colors border border-red-200 shadow-sm"
                                            >
                                                <Fingerprint size={14} />
                                                Log Dispensation
                                            </button>
                                        ) : (
                                            <span className="text-xs text-text-dim italic">View Only</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {adjustingItem && (
                <StockAdjustmentModal
                    item={adjustingItem}
                    isOpen={true}
                    onClose={() => setAdjustingItem(null)}
                    onAdjust={async (batch_id: string, quantity: number, type: 'add' | 'remove' | 'set', notes: string) => {
                        await adjustStock({ batch_id, quantity, type, reason: notes });
                        setAdjustingItem(null);
                    }}
                />
            )}
        </div>
    );
}
