import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SaleTransaction, SaleItem, CartItem, RefundLineItem } from '../lib/types';
import { useAuthStore } from '../store/authStore';

function formatRpcError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (!error || typeof error !== 'object') return 'Failed to complete sale';

    const maybe = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [maybe.message, maybe.details, maybe.hint].filter(Boolean) as string[];
    const text = parts.join(' | ').trim();
    return text || (maybe.code ? `Failed to complete sale (${maybe.code})` : 'Failed to complete sale');
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useSaleTransactions(filters?: {
    dateFrom?: string;
    dateTo?: string;
    paymentMethod?: string;
    staffId?: string;
}) {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['sale_transactions', filters],
        queryFn: async (): Promise<SaleTransaction[]> => {
            let query = supabase
                .from('sale_transactions')
                .select(`
                    *,
                    seller:users!sale_transactions_sold_by_fkey(id, full_name, email),
                    items:sale_items(*)
                `)
                .order('created_at', { ascending: false });

            if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
            if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);
            if (filters?.paymentMethod && filters.paymentMethod !== 'all')
                query = query.eq('payment_method', filters.paymentMethod);
            if (filters?.staffId && filters.staffId !== 'all')
                query = query.eq('sold_by', filters.staffId);

            const { data, error } = await query;
            if (error) throw error;
            return (data ?? []) as SaleTransaction[];
        },
        enabled: !!user,
    });
}

export function useSaleTransaction(id: string) {
    return useQuery({
        queryKey: ['sale_transaction', id],
        queryFn: async (): Promise<SaleTransaction> => {
            const { data, error } = await supabase
                .from('sale_transactions')
                .select(`
                    *,
                    seller:users!sale_transactions_sold_by_fkey(id, full_name, email),
                    items:sale_items(*),
                    refunds:sale_refunds(*, performer:users!sale_refunds_performed_by_fkey(id, full_name, email))
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as SaleTransaction;
        },
        enabled: !!id,
    });
}

// ─── Create Sale Transaction ──────────────────────────────────────────────────

export interface CreateSalePayload {
    cart: CartItem[];
    payment_method: 'cash' | 'card' | 'split';
    discount_amount: number;
    tax_rate: number;
    notes?: string;
}

export function useCreateSaleTransaction() {
    const qc = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (payload: CreateSalePayload) => {
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
                const unitName = (ci.unit || 'unit').trim() || 'unit';
                const key = `${ci.item_id}:${unitName.toLowerCase()}`;
                unitRows.set(key, {
                    tenant_id: user.tenant_id,
                    product_id: ci.item_id,
                    unit_name: unitName,
                    conversion_factor: 1,
                    is_base: true,
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

            const p_cart = payload.cart.map((ci) => ({
                product_id: ci.item_id,
                item_id: ci.item_id,
                batch_id: ci.batch_id,
                name: ci.name,
                sku: ci.sku,
                unit: ci.unit,
                unit_price: ci.unit_price,
                quantity: ci.quantity,
                subtotal: ci.subtotal,
            }));

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

            const tx = ((data as { transaction?: SaleTransaction } | null)?.transaction ?? data) as SaleTransaction;
            return tx;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sale_transactions'] });
            qc.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
}

// ─── Create Refund ────────────────────────────────────────────────────────────

export interface CreateRefundPayload {
    transaction_id: string;
    reason: string;
    refund_type: 'full' | 'partial';
    refund_items?: RefundLineItem[];  // for partial
}

export function useCreateRefund() {
    const qc = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (payload: CreateRefundPayload) => {
            if (!user) throw new Error('Not authenticated');

            // Fetch transaction with items
            const { data: tx, error: txFetchErr } = await supabase
                .from('sale_transactions')
                .select('*, items:sale_items(*)')
                .eq('id', payload.transaction_id)
                .single();
            if (txFetchErr || !tx) throw txFetchErr ?? new Error('Transaction not found');
            if (tx.status === 'refunded') throw new Error('Transaction already fully refunded');

            const items = payload.refund_type === 'full'
                ? (tx.items as SaleItem[]).map(i => ({ item_id: i.item_id, item_name: i.item_name, quantity: i.quantity, amount: i.subtotal }))
                : (payload.refund_items ?? []);

            const refundTotal = payload.refund_type === 'full'
                ? tx.total
                : items.reduce((s: number, i: RefundLineItem) => s + i.amount, 0);

            // Insert refund record
            const { error: refundErr } = await supabase.from('sale_refunds').insert({
                transaction_id: payload.transaction_id,
                reason: payload.reason,
                refund_type: payload.refund_type,
                refund_total: refundTotal,
                refund_items: items,
                performed_by: user.id,
            });
            if (refundErr) throw refundErr;

            // Update transaction status
            const newStatus = payload.refund_type === 'full' ? 'refunded' : 'partial_refund';
            await supabase
                .from('sale_transactions')
                .update({ status: newStatus })
                .eq('id', payload.transaction_id);

            // Restock items
            for (const ri of items) {
                const matchedItem = (tx.items as SaleItem[]).find(i => i.item_id === ri.item_id);
                if (matchedItem?.batch_id) {
                    const { error: returnErr } = await supabase.rpc('process_customer_return', {
                        p_sale_id: payload.transaction_id,
                        p_product_id: matchedItem.item_id,
                        p_batch_id: matchedItem.batch_id,
                        p_quantity: ri.quantity,
                        p_refund_amount: ri.amount,
                    });
                    if (returnErr) throw returnErr;
                }
            }
        },
        onSuccess: (_, payload) => {
            qc.invalidateQueries({ queryKey: ['sale_transactions'] });
            qc.invalidateQueries({ queryKey: ['sale_transaction', payload.transaction_id] });
            qc.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
}

// ─── Legacy support ───────────────────────────────────────────────────────────
// Keep old useSales/useCreateSale exported so nothing breaks during transition
export function useSales() {
    return useSaleTransactions();
}

export function useCreateSale() {
    return useMutation({
        mutationFn: async () => { throw new Error('Use useCreateSaleTransaction instead'); },
    });
}
