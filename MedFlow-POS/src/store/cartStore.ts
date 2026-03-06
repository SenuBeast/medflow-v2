import { create } from 'zustand';
import type { CartItem, PaymentMethod } from '../lib/types';

interface CartState {
    items: CartItem[];
    paymentMethod: PaymentMethod;
    discountAmount: number;
    taxRate: number;

    // Actions
    addItem: (item: CartItem) => void;
    updateQuantity: (itemId: string, batchId: string | null, delta: number) => void;
    removeItem: (itemId: string, batchId: string | null) => void;
    setPaymentMethod: (method: PaymentMethod) => void;
    setDiscount: (amount: number) => void;
    clearCart: () => void;

    // Computed (getters)
    getSubtotal: () => number;
    getGrandTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    paymentMethod: 'cash',
    discountAmount: 0,
    taxRate: 8.5, // Move to config dynamically if needed

    addItem: (newItem) => set((state) => {
        const existing = state.items.find(i => i.item_id === newItem.item_id && i.batch_id === newItem.batch_id);

        if (existing) {
            // Check max quantity constraint
            if (existing.quantity + newItem.quantity > existing.max_quantity) {
                return state; // Reached stock limit
            }

            const updatedItems = state.items.map(i => {
                if (i.item_id === newItem.item_id && i.batch_id === newItem.batch_id) {
                    const newQty = i.quantity + newItem.quantity;
                    return { ...i, quantity: newQty, subtotal: newQty * i.unit_price };
                }
                return i;
            });
            return { items: updatedItems };
        }

        return { items: [...state.items, newItem] };
    }),

    updateQuantity: (itemId, batchId, delta) => set((state) => {
        const item = state.items.find(i => i.item_id === itemId && i.batch_id === batchId);
        if (!item) return state;

        const newQty = item.quantity + delta;
        if (newQty <= 0) {
            return { items: state.items.filter(i => !(i.item_id === itemId && i.batch_id === batchId)) };
        }
        if (newQty > item.max_quantity) {
            return state; // Can't exceed stock
        }

        const updatedItems = state.items.map(i => {
            if (i.item_id === itemId && i.batch_id === batchId) {
                return { ...i, quantity: newQty, subtotal: newQty * i.unit_price };
            }
            return i;
        });

        return { items: updatedItems };
    }),

    removeItem: (itemId, batchId) => set((state) => ({
        items: state.items.filter(i => !(i.item_id === itemId && i.batch_id === batchId))
    })),

    setPaymentMethod: (method) => set({ paymentMethod: method }),
    setDiscount: (amount) => set({ discountAmount: Math.max(0, amount) }),

    clearCart: () => set({ items: [], paymentMethod: 'cash', discountAmount: 0 }),

    getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.subtotal, 0);
    },

    getGrandTotal: () => {
        const sub = get().getSubtotal();
        const afterDiscount = Math.max(0, sub - get().discountAmount);
        const tax = afterDiscount * (get().taxRate / 100);
        return afterDiscount + tax;
    }
}));
