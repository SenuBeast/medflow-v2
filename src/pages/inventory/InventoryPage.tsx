import { useState, Fragment } from 'react';
import {
    ShieldAlert,
    Plus,
    PackageOpen,
    AlertTriangle,
    Search,
    Calendar,
    Edit,
    ArrowUpDown,
    Trash2,
    ChevronDown,
    ChevronUp,
    Upload,
} from 'lucide-react';
import { StockAdjustmentModal } from '../../components/inventory/StockAdjustmentModal';
import { ItemBatchForm } from '../../components/inventory/ItemBatchForm';
import { BulkImportModal } from '../../components/inventory/BulkImportModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PermissionGuard } from '../../components/auth/Guards';
import { useInventory, useAddInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem, useAddBatch, useUpdateBatchStatus } from '../../hooks/useInventory';
import { PERMISSIONS } from '../../lib/constants';
import type { InventoryItem } from '../../lib/types';
import { clsx } from 'clsx';
import { Input } from '../../components/ui/Input';

function ItemForm({
    initialData,
    onSave,
    onClose,
    loading,
}: {
    initialData?: Partial<InventoryItem>;
    onSave: (data: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => void;
    onClose: () => void;
    loading: boolean;
}) {
    const [form, setForm] = useState({
        name: initialData?.name ?? '',
        generic_name: initialData?.generic_name ?? '',
        sku: initialData?.sku ?? '',
        category: initialData?.category ?? '',
        quantity: initialData?.quantity ?? 0,
        unit: initialData?.unit ?? 'units',
        cost_price: initialData?.cost_price ?? 0,
        selling_price: initialData?.selling_price ?? 0,
        expiry_date: initialData?.expiry_date ?? null,
        is_controlled: initialData?.is_controlled ?? false,
        minimum_order_quantity: initialData?.minimum_order_quantity ?? 10,
        tenant_id: initialData?.tenant_id ?? null,
    });

    const handleChange = (field: string, value: string | number | boolean | null) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };


    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Name *"
                    placeholder="e.g. Paracetamol 500mg"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                />
                <Input
                    label="Generic Name"
                    placeholder="e.g. Paracetamol"
                    value={form.generic_name ?? ''}
                    onChange={(e) => handleChange('generic_name', e.target.value)}
                />
                <Input
                    label="SKU"
                    placeholder="e.g. MED-001"
                    value={form.sku ?? ''}
                    onChange={(e) => handleChange('sku', e.target.value)}
                />
                <Input
                    label="Category"
                    placeholder="e.g. Analgesics"
                    value={form.category ?? ''}
                    onChange={(e) => handleChange('category', e.target.value)}
                />
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-sub uppercase tracking-wider">Unit</label>
                    <select
                        title="Unit"
                        aria-label="Unit"
                        value={form.unit}
                        onChange={(e) => handleChange('unit', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border-main bg-card text-text-main focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all duration-200"
                    >
                        {['units', 'boxes', 'bottles', 'vials', 'tablets', 'capsules', 'mg', 'ml', 'L'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>
                <Input
                    label="Quantity"
                    type="number"
                    value={form.quantity}
                    disabled
                />
                <Input
                    label="Minimum Order Qty"
                    type="number"
                    value={form.minimum_order_quantity}
                    onChange={(e) => handleChange('minimum_order_quantity', Number(e.target.value))}
                    min={0}
                />
                <Input
                    label="Cost Price ($)"
                    type="number"
                    step="0.01"
                    value={form.cost_price ?? 0}
                    onChange={(e) => handleChange('cost_price', Number(e.target.value))}
                    min={0}
                />
                <Input
                    label="Selling Price ($)"
                    type="number"
                    step="0.01"
                    value={form.selling_price ?? 0}
                    onChange={(e) => handleChange('selling_price', Number(e.target.value))}
                    min={0}
                />
                <Input
                    label="Expiry Date"
                    type="date"
                    value={form.expiry_date || ''}
                    onChange={(e) => handleChange('expiry_date', e.target.value || null)}
                />
                <div className="flex items-end pb-1 px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border-main text-brand focus:ring-brand"
                            checked={form.is_controlled}
                            onChange={(e) => handleChange('is_controlled', e.target.checked)}
                        />
                        <span className="text-xs font-semibold text-text-sub uppercase tracking-wider group-hover:text-text-main transition-colors">Controlled Drug</span>
                    </label>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button
                    variant="primary"
                    loading={loading}
                    onClick={() => onSave(form as Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>)}
                >
                    Save Item
                </Button>
            </div>
        </div>
    );
}

export function InventoryPage() {
    const { data: items = [], isLoading } = useInventory();
    const addItem = useAddInventoryItem();
    const updateItem = useUpdateInventoryItem();
    const deleteItem = useDeleteInventoryItem();
    const addBatch = useAddBatch();
    const updateBatchStatus = useUpdateBatchStatus();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'low' | 'controlled' | 'expiring'>('all');
    const [showAdd, setShowAdd] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editItem, setEditItem] = useState<InventoryItem | null>(null);
    const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [showAddBatch, setShowAddBatch] = useState<string | null>(null);

    const now = new Date();
    const in30 = new Date(); in30.setDate(now.getDate() + 30);

    const filtered = items.filter((item) => {
        const matchesSearch =
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            (item.sku ?? '').toLowerCase().includes(search.toLowerCase());
        switch (filter) {
            case 'low': return matchesSearch && item.quantity <= item.minimum_order_quantity;
            case 'controlled': return matchesSearch && item.is_controlled;
            case 'expiring': return matchesSearch && !!item.expiry_date && new Date(item.expiry_date) <= in30;
            default: return matchesSearch;
        }
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Inventory</h1>
                    <p className="text-text-sub text-sm mt-0.5">{items.length} items total</p>
                </div>
                <div className="flex gap-3">
                    <PermissionGuard permission={PERMISSIONS.INVENTORY_BULK_IMPORT}>
                        <Button variant="secondary" icon={<Upload size={16} />} onClick={() => setShowImport(true)}>
                            Import CSV
                        </Button>
                    </PermissionGuard>
                    <PermissionGuard permission={PERMISSIONS.INVENTORY_ADD}>
                        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
                            Add Item
                        </Button>
                    </PermissionGuard>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-60">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                    <input
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-main text-sm bg-card text-text-main focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand"
                        placeholder="Search by name or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-1 bg-surface-dim/50 border border-border-dim/50 p-1 rounded-2xl">
                    {([
                        { key: 'all', label: 'All Items' },
                        { key: 'low', label: 'Low Stock' },
                        { key: 'controlled', label: 'Controlled' },
                        { key: 'expiring', label: 'Expiring' },
                    ] as const).map(({ key, label }) => {
                        const isActive = filter === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={clsx(
                                    'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap',
                                    isActive
                                        ? 'bg-text-main text-text-inverse shadow-md scale-[1.05]'
                                        : 'text-text-dim hover:text-text-main hover:bg-surface-elevated/50'
                                )}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border-dim">
                                {['Name', 'SKU', 'Category', 'Stock', 'Unit Price', 'Expiry', 'Status', ''].map((h) => (
                                    <th
                                        key={h}
                                        className="text-left text-xs font-bold text-text-dim uppercase tracking-wider px-5 py-3.5"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-dim/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center text-text-dim text-sm">
                                        Loading inventory...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center">
                                        <PackageOpen size={36} className="text-gray-200 mx-auto mb-2" />
                                        <p className="text-text-dim text-sm">No items found</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => {
                                    const isLow = item.quantity <= item.minimum_order_quantity;
                                    const isExpiring = item.expiry_date && new Date(item.expiry_date) <= in30;
                                    return (
                                        <Fragment key={item.id}>
                                            <tr className="hover:bg-surface-dim/60 transition-colors cursor-pointer" onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        {expandedItemId === item.id ? <ChevronUp size={16} className="text-text-dim" /> : <ChevronDown size={16} className="text-text-dim" />}
                                                        {item.is_controlled && (
                                                            <ShieldAlert size={13} className="text-danger shrink-0" />
                                                        )}
                                                        <span className="text-sm font-medium text-text-main">{item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-xs text-text-dim font-mono">{item.sku ?? '—'}</td>
                                                <td className="px-5 py-3.5 text-sm text-text-sub">{item.category ?? '—'}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={clsx('text-sm font-semibold', isLow ? 'text-warning' : 'text-text-main')}>
                                                            {item.quantity}
                                                        </span>
                                                        <span className="text-xs text-text-dim">{item.unit}</span>
                                                        {isLow && <AlertTriangle size={13} className="text-warning" />}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-text-sub">
                                                    {item.selling_price ? `$${item.selling_price.toFixed(2)} ` : '—'}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {item.expiry_date ? (
                                                        <span className={clsx('text-xs', isExpiring ? 'text-warning font-medium' : 'text-text-sub')}>
                                                            {isExpiring && <Calendar size={11} className="inline mr-1" />}
                                                            {new Date(item.expiry_date).toLocaleDateString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-text-dim/50">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={clsx(
                                                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                        isLow ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'
                                                    )}>
                                                        {isLow ? 'Low Stock' : 'In Stock'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <PermissionGuard permission={PERMISSIONS.INVENTORY_ADJUST}>
                                                            <button
                                                                onClick={() => setAdjustItem(item)}
                                                                className="p-1.5 text-text-dim hover:text-brand hover:bg-brand-subtle rounded-lg transition"
                                                                title="Adjust stock"
                                                            >
                                                                <ArrowUpDown size={14} />
                                                            </button>
                                                        </PermissionGuard>
                                                        <PermissionGuard permission={PERMISSIONS.INVENTORY_EDIT}>
                                                            <button
                                                                onClick={() => setEditItem(item)}
                                                                className="p-1.5 text-text-dim hover:text-brand hover:bg-brand-subtle rounded-lg transition"
                                                                title="Edit item"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                        </PermissionGuard>
                                                        <PermissionGuard permission={PERMISSIONS.INVENTORY_EDIT}>
                                                            <button
                                                                onClick={() => deleteItem.mutate(item.id)}
                                                                className="p-1.5 text-text-dim hover:text-danger hover:bg-danger-bg rounded-lg transition"
                                                                title="Delete item"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </PermissionGuard>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedItemId === item.id && (
                                                <tr className="bg-surface-dim border-b border-border-dim/50">
                                                    <td colSpan={8} className="p-0">
                                                        <div className="px-10 py-5 bg-card/30 border-t border-border-dim/30">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Item Batches</h4>
                                                                <PermissionGuard permission={PERMISSIONS.INVENTORY_ADD}>
                                                                    <Button variant="outline" size="sm" onClick={() => setShowAddBatch(item.id)}>
                                                                        + Add Batch
                                                                    </Button>
                                                                </PermissionGuard>
                                                            </div>
                                                            {(!item.batches || item.batches.length === 0) ? (
                                                                <p className="text-sm text-text-dim py-4 text-center border border-dashed border-border-main rounded-xl bg-card">No batches recorded.</p>
                                                            ) : (
                                                                <table className="w-full text-sm">
                                                                    <thead>
                                                                        <tr className="border-b border-border-dim/30">
                                                                            <th className="text-left font-bold text-text-dim uppercase tracking-wider text-[10px] py-2">Batch #</th>
                                                                            <th className="text-left font-bold text-text-dim uppercase tracking-wider text-[10px] py-2">Supplier</th>
                                                                            <th className="text-left font-bold text-text-dim uppercase tracking-wider text-[10px] py-2">Quantity</th>
                                                                            <th className="text-left font-bold text-text-dim uppercase tracking-wider text-[10px] py-2">Expiry</th>
                                                                            <th className="text-left font-bold text-text-dim uppercase tracking-wider text-[10px] py-2">Status</th>
                                                                            <th className="text-right font-bold text-text-dim uppercase tracking-wider text-[10px] py-2">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border-dim/20">
                                                                        {item.batches.map(batch => (
                                                                            <tr key={batch.id}>
                                                                                <td className="py-3 font-mono text-xs text-text-main">{batch.batch_number}</td>
                                                                                <td className="py-3 text-text-sub">{batch.supplier || '—'}</td>
                                                                                <td className="py-3 font-bold text-text-main">{batch.quantity}</td>
                                                                                <td className="py-3 text-text-sub">{new Date(batch.expiry_date).toLocaleDateString()}</td>
                                                                                <td className="py-3">
                                                                                    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                                                        batch.status === 'active' ? 'bg-success-bg text-success' :
                                                                                            batch.status === 'quarantined' ? 'bg-warning-bg text-warning' :
                                                                                                'bg-surface text-text-dim'
                                                                                    )}>
                                                                                        {batch.status}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-3 text-right">
                                                                                    <div className="flex items-center justify-end gap-2">
                                                                                        {batch.status === 'active' && (
                                                                                            <PermissionGuard permission={PERMISSIONS.INVENTORY_EXPIRY_MANAGE}>
                                                                                                <button
                                                                                                    onClick={() => updateBatchStatus.mutate({ id: batch.id, status: 'quarantined' })}
                                                                                                    className="text-[10px] font-bold text-warning hover:text-warning/80 bg-warning-bg px-2.5 py-1 rounded-lg transition uppercase tracking-wider"
                                                                                                >
                                                                                                    Quarantine
                                                                                                </button>
                                                                                            </PermissionGuard>
                                                                                        )}
                                                                                        {batch.status === 'quarantined' && (
                                                                                            <PermissionGuard permission={PERMISSIONS.INVENTORY_EXPIRY_MANAGE}>
                                                                                                <button
                                                                                                    onClick={() => updateBatchStatus.mutate({ id: batch.id, status: 'active' })}
                                                                                                    className="text-[10px] font-bold text-success hover:text-success/80 bg-success-bg px-2.5 py-1 rounded-lg transition uppercase tracking-wider"
                                                                                                >
                                                                                                    Restore
                                                                                                </button>
                                                                                            </PermissionGuard>
                                                                                        )}
                                                                                        {batch.status !== 'disposed' && (
                                                                                            <PermissionGuard permission={PERMISSIONS.INVENTORY_EXPIRY_DISPOSE}>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        if (window.confirm(`Dispose of batch ${batch.batch_number}? This cannot be undone.`)) {
                                                                                                            updateBatchStatus.mutate({ id: batch.id, status: 'disposed' });
                                                                                                        }
                                                                                                    }}
                                                                                                    className="text-[10px] font-bold text-danger hover:text-danger/80 bg-danger-bg px-2.5 py-1 rounded-lg transition uppercase tracking-wider"
                                                                                                >
                                                                                                    Dispose
                                                                                                </button>
                                                                                            </PermissionGuard>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add Modal */}
            {showAdd && (
                <Modal title="Add Inventory Item" onClose={() => setShowAdd(false)} size="lg">
                    <ItemForm
                        onSave={async (data) => {
                            await addItem.mutateAsync(data);
                            setShowAdd(false);
                        }}
                        onClose={() => setShowAdd(false)}
                        loading={addItem.isPending}
                    />
                </Modal>
            )}

            {/* Edit Modal */}
            {editItem && (
                <Modal title="Edit Inventory Item" onClose={() => setEditItem(null)} size="lg">
                    <ItemForm
                        initialData={editItem}
                        onSave={async (data) => {
                            await updateItem.mutateAsync({ id: editItem.id, ...data });
                            setEditItem(null);
                        }}
                        onClose={() => setEditItem(null)}
                        loading={updateItem.isPending}
                    />
                </Modal>
            )}

            {/* Adjust Stock Modal */}
            {adjustItem && (
                <StockAdjustmentModal
                    item={adjustItem}
                    isOpen={true}
                    onClose={() => setAdjustItem(null)}
                />
            )}

            {/* Add Batch Modal */}
            {showAddBatch && (
                <Modal title="Add Item Batch" onClose={() => setShowAddBatch(null)} size="md">
                    <ItemBatchForm
                        itemId={showAddBatch}
                        onSave={async (data) => {
                            await addBatch.mutateAsync(data);
                            setShowAddBatch(null);
                        }}
                        onClose={() => setShowAddBatch(null)}
                        loading={addBatch.isPending}
                    />
                </Modal>
            )}

            {/* Bulk Import Modal */}
            <BulkImportModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
            />
        </div>
    );
}
