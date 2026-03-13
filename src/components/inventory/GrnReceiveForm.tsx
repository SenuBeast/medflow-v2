import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import type { InventoryItem } from '../../lib/types';
import type { GrnReceiptInput, InventorySupplier } from '../../hooks/useInventory';

type GrnFormState = {
    product_id: string;
    supplier_id: string;
    supplier_name: string;
    purchase_order_id: string;
    received_date: string;
    batch_number: string;
    manufacturing_date: string;
    expiry_date: string;
    unit_name: string;
    units_per_pack: number;
    pack_count: number;
    loose_units: number;
    direct_quantity: number;
    purchase_price: number;
    selling_price: number;
    discount: number;
    tax: number;
};

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

export function GrnReceiveForm({
    items,
    suppliers,
    defaultProductId,
    onSave,
    onClose,
    loading,
}: {
    items: InventoryItem[];
    suppliers: InventorySupplier[];
    defaultProductId?: string | null;
    onSave: (payload: GrnReceiptInput) => Promise<void>;
    onClose: () => void;
    loading: boolean;
}) {
    const defaultItem = items.find((item) => item.id === defaultProductId) ?? items[0];

    const [form, setForm] = useState<GrnFormState>({
        product_id: defaultItem?.id ?? '',
        supplier_id: '',
        supplier_name: '',
        purchase_order_id: '',
        received_date: todayDate(),
        batch_number: '',
        manufacturing_date: '',
        expiry_date: '',
        unit_name: 'pack',
        units_per_pack: Math.max(1, Number(defaultItem?.pack_size ?? 1)),
        pack_count: 0,
        loose_units: 0,
        direct_quantity: 0,
        purchase_price: Number(defaultItem?.cost_price ?? 0),
        selling_price: Number(defaultItem?.selling_price ?? 0),
        discount: 0,
        tax: 0,
    });

    const [error, setError] = useState<string | null>(null);

    const selectedItem = useMemo(
        () => items.find((item) => item.id === form.product_id) ?? null,
        [items, form.product_id]
    );

    const computedQuantity = useMemo(() => {
        const packBased = (Math.max(0, form.pack_count) * Math.max(1, form.units_per_pack)) + Math.max(0, form.loose_units);
        if (packBased > 0) return packBased;
        return Math.max(0, form.direct_quantity);
    }, [form.pack_count, form.units_per_pack, form.loose_units, form.direct_quantity]);

    const handleChange = <K extends keyof GrnFormState>(field: K, value: GrnFormState[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (field === 'product_id') {
            const productId = String(value);
            const item = items.find((row) => row.id === productId);
            if (item) {
                setForm((prev) => ({
                    ...prev,
                    product_id: item.id,
                    units_per_pack: Math.max(1, Number(item.pack_size ?? 1)),
                    purchase_price: Number(item.cost_price ?? prev.purchase_price ?? 0),
                    selling_price: Number(item.selling_price ?? prev.selling_price ?? 0),
                }));
            }
        }
        if (error) setError(null);
    };

    const handleSubmit = async () => {
        if (!form.product_id) {
            setError('Product is required');
            return;
        }
        if (!form.supplier_id && !form.supplier_name.trim()) {
            setError('Select a supplier or enter a new supplier name');
            return;
        }
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

        await onSave({
            supplier_id: form.supplier_id || null,
            supplier_name: form.supplier_name.trim() || null,
            purchase_order_id: form.purchase_order_id.trim() || null,
            received_date: form.received_date,
            product_id: form.product_id,
            batch_number: form.batch_number.trim(),
            manufacturing_date: form.manufacturing_date || null,
            expiry_date: form.expiry_date,
            purchase_price: Math.max(0, Number(form.purchase_price) || 0),
            selling_price: Math.max(0, Number(form.selling_price) || 0),
            quantity_received: computedQuantity,
            discount: Math.max(0, Number(form.discount) || 0),
            tax: Math.max(0, Number(form.tax) || 0),
            unit_name: form.unit_name.trim() || null,
            units_per_pack: Math.max(1, Number(form.units_per_pack) || 1),
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Product *</label>
                    <select
                        title="Product"
                        className={inputCls}
                        value={form.product_id}
                        onChange={(e) => handleChange('product_id', e.target.value)}
                    >
                        <option value="">Select product</option>
                        {items.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name} ({item.sku ?? 'N/A'})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Received Date *</label>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.received_date}
                        onChange={(e) => handleChange('received_date', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Supplier *</label>
                    <select
                        title="Supplier"
                        className={inputCls}
                        value={form.supplier_id}
                        onChange={(e) => handleChange('supplier_id', e.target.value)}
                    >
                        <option value="">Create from name below</option>
                        {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                                {supplier.supplier_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">New Supplier Name (optional)</label>
                    <input
                        className={inputCls}
                        placeholder="Use when supplier is not in list"
                        value={form.supplier_name}
                        onChange={(e) => handleChange('supplier_name', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">PO Reference (optional)</label>
                    <input
                        className={inputCls}
                        placeholder="Purchase order ID"
                        value={form.purchase_order_id}
                        onChange={(e) => handleChange('purchase_order_id', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Batch Number *</label>
                    <input
                        className={inputCls}
                        placeholder="e.g. BATCH-1024"
                        value={form.batch_number}
                        onChange={(e) => handleChange('batch_number', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Manufacturing Date</label>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.manufacturing_date}
                        onChange={(e) => handleChange('manufacturing_date', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Expiry Date *</label>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.expiry_date}
                        onChange={(e) => handleChange('expiry_date', e.target.value)}
                    />
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
                        value={form.direct_quantity}
                        min={0}
                        onChange={(e) => handleChange('direct_quantity', Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Computed Quantity</label>
                    <div className="px-3 py-2 rounded-lg border border-border-main bg-surface text-sm font-semibold text-text-main">
                        {computedQuantity} {selectedItem?.unit ?? 'units'}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Purchase Price (base unit)</label>
                    <input
                        type="number"
                        className={inputCls}
                        step="0.01"
                        min={0}
                        value={form.purchase_price}
                        onChange={(e) => handleChange('purchase_price', Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Selling Price (base unit)</label>
                    <input
                        type="number"
                        className={inputCls}
                        step="0.01"
                        min={0}
                        value={form.selling_price}
                        onChange={(e) => handleChange('selling_price', Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Discount</label>
                    <input
                        type="number"
                        className={inputCls}
                        step="0.01"
                        min={0}
                        value={form.discount}
                        onChange={(e) => handleChange('discount', Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Tax</label>
                    <input
                        type="number"
                        className={inputCls}
                        step="0.01"
                        min={0}
                        value={form.tax}
                        onChange={(e) => handleChange('tax', Number(e.target.value))}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-dim">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" loading={loading} onClick={handleSubmit}>
                    Create + Confirm GRN
                </Button>
            </div>
        </div>
    );
}
