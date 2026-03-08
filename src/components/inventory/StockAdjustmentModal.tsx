import { useState } from 'react';
import { useAdjustBatchStock } from '../../hooks/useInventory';
import type { InventoryItem } from '../../lib/types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { clsx } from 'clsx';

export function StockAdjustmentModal({
    item,
    isOpen,
    onClose,
    onAdjust
}: {
    item: InventoryItem;
    isOpen: boolean;
    onClose: () => void;
    onAdjust?: (batch_id: string, quantity: number, type: 'add' | 'remove' | 'set', reason: string) => Promise<void>;
}) {
    const adjust = useAdjustBatchStock();
    const [type, setType] = useState<'add' | 'remove' | 'set'>('add');
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState('');
    const [batchId, setBatchId] = useState(item.batches?.[0]?.id || '');

    const handleSave = async () => {
        if (!batchId) return;
        if (onAdjust) {
            await onAdjust(batchId, qty, type, reason);
        } else {
            await adjust.mutateAsync({ batch_id: batchId, type, quantity: qty, reason });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Modal title={`Adjust Stock: ${item.name}`} onClose={onClose}>
            <div className="space-y-4">
                <div className="p-3 bg-surface-dim rounded-xl text-sm">
                    <span className="text-text-sub">Total item stock:</span>{' '}
                    <span className="font-bold text-text-main">{item.quantity} {item.unit}</span>
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Target Batch</label>
                    <select
                        title="Select batch"
                        className="w-full px-3 py-2 rounded-lg border border-border-main text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={batchId}
                        onChange={(e) => setBatchId(e.target.value)}
                    >
                        {(!item.batches || item.batches.length === 0) && (
                            <option value="">No batches available</option>
                        )}
                        {item.batches?.map(b => (
                            <option key={b.id} value={b.id}>
                                Batch {b.batch_number} (Qty: {b.quantity})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Adjustment Type</label>
                    <div className="flex gap-2">
                        {(['add', 'remove', 'set'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={clsx(
                                    'flex-1 py-2 rounded-lg text-xs font-medium transition',
                                    type === t
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-text-sub hover:bg-gray-200'
                                )}
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">
                        Quantity to {type === 'set' ? 'set' : type}
                    </label>
                    <input
                        type="number"
                        placeholder="1"
                        className="w-full px-3 py-2 rounded-lg border border-border-main text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={qty}
                        onChange={(e) => setQty(Number(e.target.value))}
                        min={0}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-sub mb-1">Reason</label>
                    <input
                        className="w-full px-3 py-2 rounded-lg border border-border-main text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Stock count, received shipment, etc."
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" loading={adjust.isPending} onClick={handleSave} disabled={!batchId}>
                        Apply Adjustment
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
