import { Minus, Plus, X } from 'lucide-react';
import type { CartItem } from '../lib/types';
import { useCartStore } from '../store/cartStore';

export default function CartItemRow({ item }: { item: CartItem }) {
    const { updateQuantity, removeItem } = useCartStore();

    return (
        <div className="flex flex-col py-3 border-b border-pos-border hover:bg-pos-surface-hover transition-colors px-2">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-pos-text-muted text-xs font-mono">{item.sku} • {item.unit}</div>
                </div>
                <div className="font-mono font-bold text-pos-primary">
                    ${item.subtotal.toFixed(2)}
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 bg-pos-bg border border-pos-border rounded">
                    <button
                        onClick={() => updateQuantity(item.item_id, item.batch_id, -1)}
                        className="p-1 hover:text-pos-primary transition-colors disabled:opacity-50"
                    >
                        <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                    <button
                        onClick={() => updateQuantity(item.item_id, item.batch_id, 1)}
                        disabled={item.quantity >= item.max_quantity}
                        className="p-1 hover:text-pos-primary transition-colors disabled:opacity-50"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-pos-text-muted font-mono">${item.unit_price.toFixed(2)} ea</span>
                    <button
                        onClick={() => removeItem(item.item_id, item.batch_id)}
                        className="text-pos-text-muted hover:text-pos-accent transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
            {item.quantity >= item.max_quantity && (
                <div className="text-[10px] text-pos-accent uppercase tracking-widest mt-1 text-right">Max stock reached</div>
            )}
        </div>
    );
}
