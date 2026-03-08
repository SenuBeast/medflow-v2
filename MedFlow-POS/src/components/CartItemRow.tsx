import { Minus, Plus, X } from 'lucide-react';
import type { CartItem } from '../lib/types';
import { useCartStore } from '../store/cartStore';

export default function CartItemRow({ item }: { item: CartItem }) {
    const { updateQuantity, removeItem } = useCartStore();

    return (
        <div className="flex flex-col py-3 border-b border-border-main hover:bg-surface-elevated transition-colors px-2">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="font-bold text-sm text-text-main">{item.name}</div>
                    <div className="text-text-dim text-xs font-mono">{item.sku} • {item.unit}</div>
                </div>
                <div className="font-mono font-bold text-brand">
                    ${item.subtotal.toFixed(2)}
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 bg-background border border-border-main rounded">
                    <button
                        onClick={() => updateQuantity(item.item_id, item.batch_id, -1)}
                        className="p-1 hover:text-brand transition-colors disabled:opacity-50 text-text-main"
                    >
                        <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-mono text-sm text-text-main">{item.quantity}</span>
                    <button
                        onClick={() => updateQuantity(item.item_id, item.batch_id, 1)}
                        disabled={item.quantity >= item.max_quantity}
                        className="p-1 hover:text-brand transition-colors disabled:opacity-50 text-text-main"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-text-dim font-mono">${item.unit_price.toFixed(2)} ea</span>
                    <button
                        onClick={() => removeItem(item.item_id, item.batch_id)}
                        className="text-text-dim hover:text-danger transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
            {item.quantity >= item.max_quantity && (
                <div className="text-[10px] text-danger uppercase tracking-widest mt-1 text-right">Max stock reached</div>
            )}
        </div>
    );
}
