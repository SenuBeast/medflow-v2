import { useState } from 'react';
import { Button } from '../ui/Button';
import type { ItemBatch } from '../../lib/types';


export function ItemBatchForm({
    itemId,
    onSave,
    onClose,
    loading,
}: {
    itemId: string;
    onSave: (data: Omit<ItemBatch, 'id' | 'created_at' | 'updated_at'>) => void;
    onClose: () => void;
    loading: boolean;
}) {
    const [form, setForm] = useState({
        item_id: itemId,
        batch_number: '',
        quantity: 0,
        expiry_date: '',
        purchase_date: '',
        supplier: '',
        cost_price: 0,
        status: 'active' as const,
        location: '',
    });

    const [error, setError] = useState<string | null>(null);

    const handleChange = (field: string, value: string | number) => {
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
        if (form.quantity < 0) {
            setError('Quantity cannot be negative');
            return;
        }

        onSave({
            ...form,
            purchase_date: form.purchase_date || null,
            supplier: form.supplier || null,
            cost_price: form.cost_price || null,
            location: form.location || null,
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
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Batch Number *</label>
                    <input className={inputCls} placeholder="e.g. BATCH-A01" value={form.batch_number} onChange={(e) => handleChange('batch_number', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Expiry Date *</label>
                    <input type="date" title="Expiry Date" placeholder="YYYY-MM-DD" className={inputCls} value={form.expiry_date} onChange={(e) => handleChange('expiry_date', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Quantity</label>
                    <input type="number" placeholder="0" className={inputCls} value={form.quantity} onChange={(e) => handleChange('quantity', Number(e.target.value))} min={0} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Cost Price ($)</label>
                    <input type="number" placeholder="0.00" className={inputCls} value={form.cost_price} onChange={(e) => handleChange('cost_price', Number(e.target.value))} min={0} step="0.01" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Supplier</label>
                    <input className={inputCls} placeholder="e.g. PharmaCorp" value={form.supplier} onChange={(e) => handleChange('supplier', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Purchase Date</label>
                    <input type="date" title="Purchase Date" placeholder="YYYY-MM-DD" className={inputCls} value={form.purchase_date} onChange={(e) => handleChange('purchase_date', e.target.value)} />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-text-sub mb-1">Location</label>
                    <input className={inputCls} placeholder="e.g. Aisle 4, Shelf B" value={form.location} onChange={(e) => handleChange('location', e.target.value)} />
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
