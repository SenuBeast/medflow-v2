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
    setItemUnit: (itemId: string, batchId: string | null, unitName: string) => void;
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
            const maxByUnit = Math.floor(existing.available_base_quantity / Math.max(1, existing.units_per_sale_unit));
            // Check max quantity constraint
            if (existing.quantity + newItem.quantity > maxByUnit) {
                return state; // Reached stock limit
            }

            const updatedItems = state.items.map(i => {
                if (i.item_id === newItem.item_id && i.batch_id === newItem.batch_id) {
                    const newQty = i.quantity + newItem.quantity;
                    return { ...i, quantity: newQty, max_quantity: maxByUnit, subtotal: newQty * i.unit_price };
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

        const maxByUnit = Math.floor(item.available_base_quantity / Math.max(1, item.units_per_sale_unit));
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
            return { items: state.items.filter(i => !(i.item_id === itemId && i.batch_id === batchId)) };
        }
        if (newQty > maxByUnit) {
            return state; // Can't exceed stock
        }

        const updatedItems = state.items.map(i => {
            if (i.item_id === itemId && i.batch_id === batchId) {
                return { ...i, quantity: newQty, max_quantity: maxByUnit, subtotal: newQty * i.unit_price };
            }
            return i;
        });

        return { items: updatedItems };
    }),

    setItemUnit: (itemId, batchId, unitName) => set((state) => {
        const target = state.items.find(i => i.item_id === itemId && i.batch_id === batchId);
        if (!target) return state;

        const option = target.unit_options.find((u) => u.unit_name === unitName);
        if (!option) return state;

        const newUnitsPerSaleUnit = Math.max(1, Number(option.conversion_factor || 1));
        const maxByUnit = Math.floor(target.available_base_quantity / newUnitsPerSaleUnit);
        if (maxByUnit <= 0) return state;
        const clampedQty = Math.min(target.quantity, maxByUnit);
        const newUnitPrice = target.base_unit_price * newUnitsPerSaleUnit;

        const updatedItems = state.items.map((i) => {
            if (i.item_id === itemId && i.batch_id === batchId) {
                return {
                    ...i,
                    unit: option.unit_name,
                    units_per_sale_unit: newUnitsPerSaleUnit,
                    unit_price: newUnitPrice,
                    max_quantity: maxByUnit,
                    quantity: clampedQty,
                    subtotal: clampedQty * newUnitPrice,
                };
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
