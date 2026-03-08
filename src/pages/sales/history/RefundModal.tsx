import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { SaleTransaction } from '../../../lib/types';
import { Button } from '../../../components/ui/Button';
import { useCreateRefund } from '../../../hooks/useSales';

interface RefundModalProps {
    transaction: SaleTransaction;
    onClose: () => void;
    onSuccess: () => void;
}

export function RefundModal({ transaction: tx, onClose, onSuccess }: RefundModalProps) {
    const createRefund = useCreateRefund();
    const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
    const [reason, setReason] = useState('');
    const [partialQtys, setPartialQtys] = useState<Record<string, number>>(
        Object.fromEntries((tx.items ?? []).map(i => [i.id, 0]))
    );
    const [error, setError] = useState<string | null>(null);

    const partialTotal = (tx.items ?? []).reduce((s, item) => {
        const qty = partialQtys[item.id] ?? 0;
        return s + (qty * item.unit_price);
    }, 0);

    const refundTotal = refundType === 'full' ? tx.total : partialTotal;
    const canSubmit = reason.trim() && refundTotal > 0;

    const handleSubmit = async () => {
        setError(null);
        try {
            const refundItems = refundType === 'partial'
                ? (tx.items ?? [])
                    .filter(i => (partialQtys[i.id] ?? 0) > 0)
                    .map(i => ({
                        item_id: i.item_id,
                        item_name: i.item_name,
                        quantity: partialQtys[i.id],
                        amount: partialQtys[i.id] * i.unit_price,
                    }))
                : undefined;

            await createRefund.mutateAsync({
                transaction_id: tx.id,
                reason: reason.trim(),
                refund_type: refundType,
                refund_items: refundItems,
            });
            onSuccess();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Refund failed');
        }
    };

    const inputCls = 'w-full px-3 py-2 rounded-xl border border-border-main text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30';

    return (
        <div className="space-y-5">
            {/* Warning Banner */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-amber-800">Refund Action</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                        This will update the transaction status and restock inventory items. This action cannot be undone.
                    </p>
                </div>
            </div>

            {/* Refund Type */}
            <div>
                <p className="text-xs font-semibold text-text-sub uppercase tracking-wide mb-2">Refund Type</p>
                <div className="grid grid-cols-2 gap-2">
                    {(['full', 'partial'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setRefundType(type)}
                            className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${refundType === type
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-border-main text-text-sub hover:border-gray-300'
                                }`}
                        >
                            {type} Refund
                            {type === 'full' && <span className="block text-xs font-normal text-text-dim mt-0.5">${tx.total.toFixed(2)}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Partial Item Quantities */}
            {refundType === 'partial' && (
                <div>
                    <p className="text-xs font-semibold text-text-sub uppercase tracking-wide mb-2">Select Quantities to Refund</p>
                    <div className="space-y-2">
                        {(tx.items ?? []).map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-surface-dim rounded-xl">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">{item.item_name}</p>
                                    <p className="text-xs text-text-dim">{item.quantity} sold · ${item.unit_price.toFixed(2)}/unit</p>
                                </div>
                                <input
                                    type="number"
                                    min={0}
                                    max={item.quantity}
                                    value={partialQtys[item.id] ?? 0}
                                    onChange={e => setPartialQtys(prev => ({
                                        ...prev,
                                        [item.id]: Math.min(parseInt(e.target.value) || 0, item.quantity),
                                    }))}
                                    className="w-20 px-2 py-1.5 rounded-lg border border-border-main text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    title={`Refund quantity for ${item.item_name}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reason */}
            <div>
                <label className="block text-xs font-semibold text-text-sub uppercase tracking-wide mb-1">
                    Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                    className={inputCls}
                    rows={3}
                    placeholder="Enter a reason for this refund…"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                />
            </div>

            {/* Refund Total Preview */}
            <div className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-xl">
                <span className="text-sm font-semibold text-red-700">Refund Amount</span>
                <span className="text-lg font-bold text-red-700">-${refundTotal.toFixed(2)}</span>
            </div>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button
                    variant="primary"
                    className="bg-red-600 hover:bg-red-700"
                    loading={createRefund.isPending}
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                >
                    Process Refund
                </Button>
            </div>
        </div>
    );
}
