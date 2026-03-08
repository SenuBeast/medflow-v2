import { Trash2, ShieldAlert, AlertTriangle, Minus, Plus, Tag } from 'lucide-react';
import type { CartItem } from '../../../lib/types';
import { Button } from '../../../components/ui/Button';
import { clsx } from 'clsx';

interface CartPanelProps {
    cart: CartItem[];
    paymentMethod: 'cash' | 'card' | 'split';
    discountAmount: number;
    taxRate: number;
    canApplyDiscount: boolean;
    onUpdateQuantity: (itemId: string, quantity: number) => void;
    onRemoveItem: (itemId: string) => void;
    onPaymentMethodChange: (method: 'cash' | 'card' | 'split') => void;
    onDiscountChange: (amount: number) => void;
    onCheckout: () => void;
    isProcessing: boolean;
}

export function CartPanel({
    cart, paymentMethod, discountAmount, taxRate, canApplyDiscount,
    onUpdateQuantity, onRemoveItem, onPaymentMethodChange, onDiscountChange,
    onCheckout, isProcessing,
}: CartPanelProps) {
    const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
    const validDiscount = Math.min(discountAmount, subtotal);
    const afterDiscount = subtotal - validDiscount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const total = afterDiscount + taxAmount;

    const PAYMENT_METHODS = [
        { id: 'cash' as const, label: 'Cash' },
        { id: 'card' as const, label: 'Card' },
        { id: 'split' as const, label: 'Split' },
    ];

    return (
        <div className="flex flex-col h-full bg-card border-l border-border-dim">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border-dim flex items-center justify-between">
                <h2 className="font-bold text-text-main text-base">Cart</h2>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </span>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {cart.length === 0 ? (
                    <div className="py-16 text-center text-text-dim">
                        <p className="text-sm font-medium">Cart is empty</p>
                        <p className="text-xs mt-1">Search and click a product to add it</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.item_id} className="px-4 py-3 group">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-sm font-semibold text-text-main truncate">{item.name}</p>
                                        {item.is_controlled && (
                                            <span title="Controlled Drug">
                                                <ShieldAlert size={12} className="text-red-500 shrink-0" />
                                            </span>
                                        )}
                                        {item.expiry_warning && (
                                            <span title="Expires soon">
                                                <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                                            </span>
                                        )}
                                    </div>
                                    {item.sku && <p className="text-xs text-text-dim font-mono">{item.sku}</p>}
                                    <p className="text-xs text-text-sub mt-0.5">
                                        ${item.unit_price.toFixed(2)} / {item.unit}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onRemoveItem(item.item_id)}
                                    className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove item"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Quantity control */}
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-0 bg-gray-100 rounded-lg p-0.5">
                                    <button
                                        onClick={() => onUpdateQuantity(item.item_id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className="p-1.5 rounded-md hover:bg-card transition disabled:opacity-40"
                                        title="Decrease quantity"
                                    >
                                        <Minus size={12} />
                                    </button>
                                    <span className="px-3 text-sm font-bold text-text-main min-w-[2rem] text-center">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => onUpdateQuantity(item.item_id, item.quantity + 1)}
                                        disabled={item.quantity >= item.max_quantity}
                                        className="p-1.5 rounded-md hover:bg-card transition disabled:opacity-40"
                                        title="Increase quantity"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                                <span className="text-sm font-bold text-text-main">
                                    ${item.subtotal.toFixed(2)}
                                </span>
                            </div>

                            {/* Max stock warning */}
                            {item.quantity >= item.max_quantity && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                    <AlertTriangle size={11} /> Max stock reached ({item.max_quantity} {item.unit})
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Order Summary & Checkout */}
            <div className="p-4 border-t border-border-dim space-y-3">
                {/* Discount input */}
                {canApplyDiscount && (
                    <div className="flex items-center gap-2">
                        <Tag size={14} className="text-text-dim shrink-0" />
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">$</span>
                            <input
                                type="number"
                                min={0}
                                max={subtotal}
                                step="0.01"
                                placeholder="0.00"
                                value={discountAmount || ''}
                                onChange={e => onDiscountChange(parseFloat(e.target.value) || 0)}
                                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border-main text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                title="Discount amount"
                            />
                        </div>
                        <span className="text-xs text-text-dim shrink-0">Discount</span>
                    </div>
                )}

                {/* Totals */}
                <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-text-sub">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {validDiscount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                            <span>Discount</span>
                            <span>-${validDiscount.toFixed(2)}</span>
                        </div>
                    )}
                    {taxRate > 0 && (
                        <div className="flex justify-between text-text-sub">
                            <span>Tax ({taxRate}%)</span>
                            <span>${taxAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-text-main text-base pt-1 border-t border-border-dim">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Payment Method */}
                <div>
                    <p className="text-xs text-text-sub mb-1.5 font-medium">Payment Method</p>
                    <div className="grid grid-cols-3 gap-1.5">
                        {PAYMENT_METHODS.map(pm => (
                            <button
                                key={pm.id}
                                onClick={() => onPaymentMethodChange(pm.id)}
                                className={clsx(
                                    'py-2 rounded-lg text-xs font-semibold transition-all border',
                                    paymentMethod === pm.id
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-card text-text-sub border-border-main hover:border-blue-300'
                                )}
                            >
                                {pm.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Process Sale */}
                <Button
                    variant="primary"
                    className="w-full py-3 text-base font-bold"
                    onClick={onCheckout}
                    loading={isProcessing}
                    disabled={cart.length === 0 || isProcessing}
                >
                    Process Sale — ${total.toFixed(2)}
                </Button>
            </div>
        </div>
    );
}
