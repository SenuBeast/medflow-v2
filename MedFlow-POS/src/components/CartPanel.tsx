import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { usePOSSale } from '../hooks/usePOSSale';
import CartItemRow from './CartItemRow';
import PaymentSelector from './PaymentSelector';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function CartPanel() {
    const { items, paymentMethod, discountAmount, taxRate, getSubtotal, getGrandTotal, clearCart } = useCartStore();
    const { mutateAsync: processSale, isPending } = usePOSSale();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    const subtotal = getSubtotal();
    const total = getGrandTotal();
    const taxAmount = (Math.max(0, subtotal - discountAmount)) * (taxRate / 100);

    const handleCompleteSale = async () => {
        if (items.length === 0) return;

        setError(null);
        try {
            const tx = await processSale({
                cart: items,
                payment_method: paymentMethod,
                discount_amount: discountAmount,
                tax_rate: taxRate,
                notes: 'POS Sale'
            });

            clearCart();
            // Navigate to receipt
            navigate(`/receipt/${tx.id}`);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to complete sale');
            }
        }
    };

    return (
        <div className="h-full flex flex-col pt-4">
            {/* Cart Header */}
            <div className="px-6 flex justify-between items-end border-b border-border-main pb-4">
                <h2 className="text-xl font-bold tracking-widest uppercase">Current Order</h2>
                <button
                    onClick={clearCart}
                    disabled={items.length === 0 || isPending}
                    className="text-xs text-text-dim hover:text-danger uppercase tracking-widest disabled:opacity-50 transition-colors"
                >
                    Clear All
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-6 mt-4 p-3 bg-danger/10 border border-danger flex items-start gap-3">
                    <AlertCircle className="text-danger shrink-0" size={18} />
                    <p className="text-sm font-mono text-danger">{error}</p>
                </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto px-6 no-scrollbar mt-2 text-text-main">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-dim opacity-50">
                        <div className="w-16 h-16 border-2 border-dashed border-border-main rounded-full flex items-center justify-center mb-4">
                            <span className="font-mono text-2xl">+</span>
                        </div>
                        <p className="text-sm uppercase tracking-widest">Cart is empty</p>
                        <p className="text-xs font-mono mt-2">Scan or select items</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {items.map(item => (
                            <CartItemRow key={`${item.item_id}-${item.batch_id}`} item={item} />
                        ))}
                    </div>
                )}
            </div>

            {/* Checkout Area */}
            <div className="px-6 pb-6 pt-4 bg-card border-t border-border-main">
                <PaymentSelector />

                <div className="flex justify-between items-center mb-2 px-1 text-text-main">
                    <span className="text-xs uppercase tracking-widest text-text-dim">Subtotal</span>
                    <span className="font-mono text-sm">${subtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                    <div className="flex justify-between items-center mb-2 px-1 text-brand">
                        <span className="text-xs uppercase tracking-widest">Discount</span>
                        <span className="font-mono text-sm">-${discountAmount.toFixed(2)}</span>
                    </div>
                )}

                <div className="flex justify-between items-center mb-4 px-1 text-text-main">
                    <span className="text-xs uppercase tracking-widest text-text-dim">Tax ({taxRate.toFixed(1)}%)</span>
                    <span className="font-mono text-sm">${taxAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center py-4 border-t border-border-main mb-4 px-1 text-text-main">
                    <span className="text-lg font-bold uppercase tracking-widest">Total</span>
                    <span className="text-2xl font-mono text-brand font-bold">${total.toFixed(2)}</span>
                </div>

                <button
                    onClick={handleCompleteSale}
                    disabled={items.length === 0 || isPending}
                    className="w-full bg-brand hover:bg-brand-hover disabled:bg-border-main disabled:text-text-dim disabled:cursor-not-allowed text-white py-5 text-center font-bold uppercase tracking-widest text-lg transition-all flex items-center justify-center gap-2"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="animate-spin" />
                            Processing...
                        </>
                    ) : (
                        `Complete Sale [F4]`
                    )}
                </button>
            </div>
        </div>
    );
}
