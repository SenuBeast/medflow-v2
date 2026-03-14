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

function formatRpcError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (!error || typeof error !== 'object') return 'Failed to complete sale';

    const maybe = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [maybe.message, maybe.details, maybe.hint].filter(Boolean) as string[];
    const text = parts.join(' | ').trim();
    return text || (maybe.code ? `Failed to complete sale (${maybe.code})` : 'Failed to complete sale');
}

export function usePOSSale() {
    const qc = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (payload: POSSalePayload) => {
            if (!user) throw new Error('Not authenticated');
            if (!user.tenant_id) throw new Error('Your account is not linked to a tenant. Contact an administrator.');

            const unitRows = new Map<string, {
                tenant_id: string;
                product_id: string;
                unit_name: string;
                conversion_factor: number;
                is_base: boolean;
            }>();

            for (const ci of payload.cart) {
                const baseUnit = ci.base_unit || 'unit';
                const selectedFactor = Math.max(1, Number(ci.units_per_sale_unit || 1));

                const baseKey = `${ci.item_id}:${baseUnit.toLowerCase()}`;
                if (!unitRows.has(baseKey)) {
                    unitRows.set(baseKey, {
                        tenant_id: user.tenant_id,
                        product_id: ci.item_id,
                        unit_name: baseUnit,
                        conversion_factor: 1,
                        is_base: true,
                    });
                }

                const selectedKey = `${ci.item_id}:${ci.unit.toLowerCase()}`;
                unitRows.set(selectedKey, {
                    tenant_id: user.tenant_id,
                    product_id: ci.item_id,
                    unit_name: ci.unit,
                    conversion_factor: selectedFactor,
                    is_base: ci.unit.toLowerCase() === baseUnit.toLowerCase(),
                });
            }

            if (unitRows.size > 0) {
                const { error: unitError } = await supabase
                    .from('units')
                    .upsert([...unitRows.values()], { onConflict: 'tenant_id,product_id,unit_name' });

                if (unitError) {
                    throw new Error(formatRpcError(unitError));
                }
            }

            // 1. Format the cart for the RPC payload
            const p_cart = payload.cart.map(ci => {
                return {
                    product_id: ci.item_id,
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

            // 2. Call the atomic FEFO PostgreSQL RPC
            const { data, error } = await supabase.rpc('process_pos_sale_fefo', {
                p_payment_method: payload.payment_method,
                p_discount_amount: payload.discount_amount,
                p_tax_rate: payload.tax_rate,
                p_notes: payload.notes,
                p_cart,
            });

            if (error) {
                throw new Error(formatRpcError(error));
            }

            return ((data as { transaction?: SaleTransaction } | null)?.transaction ?? data) as SaleTransaction;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['pos_products'] });
            qc.invalidateQueries({ queryKey: ['sale_transactions'] });
        },
    });
}
