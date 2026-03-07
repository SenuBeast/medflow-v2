import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SaleTransaction, SaleItem, CartItem, RefundLineItem } from '../lib/types';
import { useAuthStore } from '../store/authStore';

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

            const subtotal = payload.cart.reduce((s, i) => s + i.subtotal, 0);
            const afterDiscount = subtotal - payload.discount_amount;
            const taxAmount = afterDiscount * (payload.tax_rate / 100);
            const total = afterDiscount + taxAmount;

            // 1. Validate all items still have enough stock
            for (const cartItem of payload.cart) {
                if (cartItem.batch_id) {
                    const { data: batch } = await supabase
                        .from('item_batches')
                        .select('quantity')
                        .eq('id', cartItem.batch_id)
                        .single();
                    if (!batch || batch.quantity < cartItem.quantity) {
                        throw new Error(`Insufficient stock for: ${cartItem.name}`);
                    }
                }
            }

            // 2. Create the transaction header
            const { data: tx, error: txErr } = await supabase
                .from('sale_transactions')
                .insert({
                    invoice_number: `INV-${Date.now()}`, // will be overridden by trigger, but needed as fallback
                    status: 'completed',
                    payment_method: payload.payment_method,
                    subtotal,
                    discount_amount: payload.discount_amount,
                    tax_rate: payload.tax_rate,
                    tax_amount: taxAmount,
                    total,
                    notes: payload.notes ?? null,
                    sold_by: user.id,
                    tenant_id: user.tenant_id,
                })
                .select()
                .single();
            if (txErr) throw txErr;

            // 3. Insert line items
            const lineItems: Omit<SaleItem, 'id' | 'created_at'>[] = payload.cart.map(ci => ({
                transaction_id: tx.id,
                item_id: ci.item_id,
                batch_id: ci.batch_id,
                item_name: ci.name,
                item_sku: ci.sku,
                item_unit: ci.unit,
                unit_price: ci.unit_price,
                quantity: ci.quantity,
                subtotal: ci.subtotal,
            }));

            const { error: itemsErr } = await supabase.from('sale_items').insert(lineItems);
            if (itemsErr) throw itemsErr;

            // 4. Deduct stock from batches (FIFO via batch_id already resolved in POS)
            for (const ci of payload.cart) {
                if (ci.batch_id) {
                    const { data: batch } = await supabase
                        .from('item_batches')
                        .select('quantity')
                        .eq('id', ci.batch_id)
                        .single();
                    if (batch) {
                        const newQty = Math.max(0, batch.quantity - ci.quantity);
                        await supabase
                            .from('item_batches')
                            .update({ quantity: newQty, updated_at: new Date().toISOString() })
                            .eq('id', ci.batch_id);
                    }
                }
            }

            return tx as SaleTransaction;
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
                    const { data: batch } = await supabase
                        .from('item_batches')
                        .select('quantity')
                        .eq('id', matchedItem.batch_id)
                        .single();
                    if (batch) {
                        await supabase
                            .from('item_batches')
                            .update({ quantity: batch.quantity + ri.quantity, updated_at: new Date().toISOString() })
                            .eq('id', matchedItem.batch_id);
                    }
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
