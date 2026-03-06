import { X, ShieldAlert, RotateCcw, CheckCircle } from 'lucide-react';
import type { SaleTransaction, RefundLineItem } from '../../../lib/types';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/Badge';
import { PermissionGuard } from '../../../components/auth/Guards';
import { PERMISSIONS } from '../../../lib/constants';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface SaleDetailDrawerProps {
    transaction: SaleTransaction | null;
    isOpen: boolean;
    onClose: () => void;
    onRefund: (tx: SaleTransaction) => void;
}

export function SaleDetailDrawer({ transaction: tx, isOpen, onClose, onRefund }: SaleDetailDrawerProps) {
    if (!isOpen || !tx) return null;

    const canRefund = tx.status !== 'refunded';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <p className="text-xs font-semibold text-blue-600 font-mono uppercase tracking-widest">
                            {tx.invoice_number}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">
                            {format(new Date(tx.created_at), 'MMMM d, yyyy · HH:mm')}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusBadge status={tx.status as 'completed' | 'refunded' | 'partial_refund'} />
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition" title="Close">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Staff & Payment */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Processed By</p>
                            <p className="font-semibold text-gray-900">{tx.seller?.full_name ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Payment Method</p>
                            <span className={clsx(
                                'inline-block text-xs font-bold px-2.5 py-1 rounded-full capitalize',
                                tx.payment_method === 'cash' ? 'bg-green-50 text-green-700' :
                                    tx.payment_method === 'card' ? 'bg-blue-50 text-blue-700' :
                                        'bg-amber-50 text-amber-700'
                            )}>
                                {tx.payment_method}
                            </span>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</h3>
                        <div className="space-y-2">
                            {(tx.items ?? []).map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{item.item_name}</p>
                                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                                            {item.item_sku} · {item.quantity} × ${item.unit_price.toFixed(2)}
                                        </p>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900">${item.subtotal.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>${tx.subtotal.toFixed(2)}</span>
                        </div>
                        {tx.discount_amount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>Discount</span>
                                <span>-${tx.discount_amount.toFixed(2)}</span>
                            </div>
                        )}
                        {tx.tax_amount > 0 && (
                            <div className="flex justify-between text-gray-500">
                                <span>Tax ({tx.tax_rate}%)</span>
                                <span>${tx.tax_amount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span>${tx.total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Notes */}
                    {tx.notes && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl italic">"{tx.notes}"</p>
                        </div>
                    )}

                    {/* Refund History */}
                    {(tx.refunds ?? []).length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Refunds</h3>
                            {(tx.refunds ?? []).map(refund => (
                                <div key={refund.id} className="p-3 bg-red-50 rounded-xl border border-red-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-red-700 uppercase">{refund.refund_type} Refund</span>
                                        <span className="text-sm font-bold text-red-700">-${refund.refund_total.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-red-600 mt-1">
                                        <span className="font-medium">Reason:</span> {refund.reason}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {format(new Date(refund.created_at), 'MMM d, yyyy · HH:mm')}
                                        {refund.performer && ` · by ${refund.performer.full_name}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <PermissionGuard permission={PERMISSIONS.SALES_REFUND}>
                        {canRefund && (
                            <Button
                                variant="secondary"
                                className="flex-1 text-red-600 hover:bg-red-50 hover:border-red-200"
                                icon={<RotateCcw size={15} />}
                                onClick={() => onRefund(tx)}
                            >
                                Refund
                            </Button>
                        )}
                    </PermissionGuard>
                    {!canRefund && (
                        <div className="flex-1 flex items-center gap-2 text-sm text-gray-500">
                            <CheckCircle size={16} className="text-gray-300" />
                            Fully refunded
                        </div>
                    )}
                    <Button variant="primary" className="flex-1" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </>
    );
}

// ─── Controlled Drug Warning badge (helper used by ProductSearch) ─────────────
export function ControlledBadge() {
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700">
            <ShieldAlert size={9} /> Controlled
        </span>
    );
}

// ─── Typed refund payload (partial refunds) ───────────────────────────────────
export interface PartialRefundState {
    items: RefundLineItem[];
}
