import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import type { InventoryItem, ItemBatch } from '../../lib/types';
import type { InventorySupplier } from '../../hooks/useInventory';

type BatchFormState = {
    item_id: string;
    batch_number: string;
    expiry_date: string;
    manufacturing_date: string;
    pack_count: number;
    units_per_pack: number;
    loose_units: number;
    quantity: number;
    purchase_price: number;
    selling_price: number;
    supplier_id: string;
    unit_name: string;
    status: ItemBatch['status'];
};

export function ItemBatchForm({
    item,
    suppliers,
    onSave,
    onClose,
    loading,
}: {
    item: InventoryItem;
    suppliers: InventorySupplier[];
    onSave: (data: Omit<ItemBatch, 'id' | 'created_at' | 'updated_at'>) => void;
    onClose: () => void;
    loading: boolean;
}) {
    const [form, setForm] = useState<BatchFormState>({
        item_id: item.id,
        batch_number: '',
        expiry_date: '',
        manufacturing_date: '',
        pack_count: 0,
        units_per_pack: Math.max(1, Number(item.pack_size ?? 1)),
        loose_units: 0,
        quantity: 0,
        purchase_price: Number(item.cost_price ?? 0),
        selling_price: Number(item.selling_price ?? 0),
        supplier_id: '',
        unit_name: 'pack',
        status: 'active',
    });

    const [error, setError] = useState<string | null>(null);

    const computedQuantity = useMemo(() => {
        const packs = Math.max(0, Number(form.pack_count) || 0);
        const perPack = Math.max(1, Number(form.units_per_pack) || 1);
        const loose = Math.max(0, Number(form.loose_units) || 0);
        const explicit = Math.max(0, Number(form.quantity) || 0);

        const packBased = (packs * perPack) + loose;
        if (packBased > 0) return packBased;
        return explicit;
    }, [form.pack_count, form.units_per_pack, form.loose_units, form.quantity]);

    const handleChange = <K extends keyof BatchFormState>(field: K, value: BatchFormState[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (error) setError(null);
    };

    const handleSave = () => {
        if (!form.batch_number.trim()) {
            setError('Batch number is required');
            return;
        }

        if (!form.expiry_date) {
            setError('Expiry date is required');
            return;
        }

        if (computedQuantity <= 0) {
            setError('Quantity must be greater than zero');
            return;
        }

        onSave({
            item_id: form.item_id,
            batch_number: form.batch_number.trim(),
            quantity: computedQuantity,
            expiry_date: form.expiry_date,
            purchase_date: form.manufacturing_date || null,
            manufacturing_date: form.manufacturing_date || null,
            supplier: null,
            supplier_id: form.supplier_id || null,
            cost_price: Math.max(0, Number(form.purchase_price) || 0),
            selling_price: Math.max(0, Number(form.selling_price) || 0),
            unit_name: form.unit_name.trim() || null,
            units_per_pack: Math.max(1, Number(form.units_per_pack) || 1),
            status: form.status,
            location: null,
        });
    };

    const inputCls = 'w-full px-3 py-2 rounded-lg border border-border-main text-sm bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition';

    return (
        <div className="space-y-4">
            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
                    {error}
                </div>
            )}

            <div className="rounded-lg border border-border-dim bg-surface-dim/40 px-3 py-2 text-xs text-text-sub">
                Product: <span className="font-semibold text-text-main">{item.name}</span> ({item.unit})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Batch Number *</label>
                    <input
                        className={inputCls}
                        placeholder="e.g. BATCH-A01"
                        value={form.batch_number}
                        onChange={(e) => handleChange('batch_number', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Expiry Date *</label>
                    <input
                        type="date"
                        title="Expiry Date"
                        className={inputCls}
                        value={form.expiry_date}
                        onChange={(e) => handleChange('expiry_date', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Manufacturing Date</label>
                    <input
                        type="date"
                        title="Manufacturing Date"
                        className={inputCls}
                        value={form.manufacturing_date}
                        onChange={(e) => handleChange('manufacturing_date', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Supplier</label>
                    <select
                        title="Supplier"
                        className={inputCls}
                        value={form.supplier_id}
                        onChange={(e) => handleChange('supplier_id', e.target.value)}
                    >
                        <option value="">No supplier</option>
                        {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                                {supplier.supplier_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Pack Unit</label>
                    <input
                        className={inputCls}
                        placeholder="e.g. box, strip"
                        value={form.unit_name}
                        onChange={(e) => handleChange('unit_name', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Units Per Pack</label>
                    <input
                        type="number"
                        className={inputCls}
                        value={form.units_per_pack}
                        min={1}
                        onChange={(e) => handleChange('units_per_pack', Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Packs Received</label>
                    <input
                        type="number"
                        className={inputCls}
                        value={form.pack_count}
                        min={0}
                        onChange={(e) => handleChange('pack_count', Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Loose Units</label>
                    <input
                        type="number"
                        className={inputCls}
                        value={form.loose_units}
                        min={0}
                        onChange={(e) => handleChange('loose_units', Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Direct Quantity (Base Units)</label>
                    <input
                        type="number"
                        className={inputCls}
                        placeholder="Use when packs are not used"
                        value={form.quantity}
                        min={0}
                        onChange={(e) => handleChange('quantity', Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Computed Base Quantity</label>
                    <div className="px-3 py-2 rounded-lg border border-border-main bg-surface text-sm font-semibold text-text-main">
                        {computedQuantity} {item.unit}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Purchase Price (per base unit)</label>
                    <input
                        type="number"
                        className={inputCls}
                        value={form.purchase_price}
                        min={0}
                        step="0.01"
                        onChange={(e) => handleChange('purchase_price', Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Selling Price (per base unit)</label>
                    <input
                        type="number"
                        className={inputCls}
                        value={form.selling_price}
                        min={0}
                        step="0.01"
                        onChange={(e) => handleChange('selling_price', Number(e.target.value))}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-dim">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" loading={loading} onClick={handleSave}>
                    Add Batch
                </Button>
            </div>
        </div>
    );
}
