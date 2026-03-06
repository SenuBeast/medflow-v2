import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SaleTransaction, CartItem } from '../lib/types';
import { useAuth } from './useAuth';

export interface POSSalePayload {
    cart: CartItem[];
    payment_method: 'cash' | 'card' | 'split';
    discount_amount: number;
    tax_rate: number;
    notes?: string;
}

export function usePOSSale() {
    const qc = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (payload: POSSalePayload) => {
            if (!user) throw new Error('Not authenticated');

            // 1. Format the cart for the RPC payload
            const p_cart = payload.cart.map(ci => {
                if (!ci.batch_id) {
                    throw new Error(`Batch ID missing for: ${ci.name}. Please select a batch.`);
                }
                return {
                    item_id: ci.item_id,
                    batch_id: ci.batch_id,
                    name: ci.name,
                    sku: ci.sku,
                    unit: ci.unit,
                    unit_price: ci.unit_price,
                    quantity: ci.quantity,
                    subtotal: ci.subtotal
                };
            });

            // 2. Call the Atomic PostgreSQL RPC
            const { data, error } = await supabase.rpc('process_pos_sale', {
                p_payment_method: payload.payment_method,
                p_discount_amount: payload.discount_amount,
                p_tax_rate: payload.tax_rate,
                p_notes: payload.notes,
                p_cart,
            });

            if (error) {
                // Surface specific stock errors raised by our Postgres function
                if (error.message.includes('INSUFFICIENT_STOCK')) {
                    throw new Error(error.message);
                }
                throw error;
            }

            return data as SaleTransaction;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['pos_products'] });
            qc.invalidateQueries({ queryKey: ['sale_transactions'] });
        },
    });
}
