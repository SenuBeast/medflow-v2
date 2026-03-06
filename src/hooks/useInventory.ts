import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { InventoryItem, ItemBatch } from '../lib/types';

export function useInventory() {
    return useQuery({
        queryKey: ['inventory'],
        queryFn: async (): Promise<InventoryItem[]> => {
            const { data, error } = await supabase
                .from('inventory_items')
                .select(`
            *,
            batches:item_batches(*)
        `)
                .order('name');
            if (error) throw error;
            return (data ?? []) as InventoryItem[];
        },
    });
}

export function useAddInventoryItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
            const { error } = await supabase.from('inventory_items').insert(item);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}

export function useUpdateInventoryItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            ...updates
        }: Partial<InventoryItem> & { id: string }) => {
            const { error } = await supabase
                .from('inventory_items')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}

export function useAdjustBatchStock() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ batch_id, type, quantity, reason }: { batch_id: string; type: 'add' | 'remove' | 'set'; quantity: number; reason: string }) => {
            // Fetch current batch quantity
            const { data: batch, error: fetchError } = await supabase
                .from('item_batches')
                .select('quantity, item_id')
                .eq('id', batch_id)
                .single();

            if (fetchError || !batch) throw fetchError ?? new Error('Batch not found');

            let newQty: number;
            if (type === 'add') {
                newQty = batch.quantity + quantity;
            } else if (type === 'remove') {
                newQty = Math.max(0, batch.quantity - quantity);
            } else {
                newQty = quantity;
            }

            const { error: updateError } = await supabase
                .from('item_batches')
                .update({ quantity: newQty, updated_at: new Date().toISOString() })
                .eq('id', batch_id);

            if (updateError) throw updateError;

            // Log adjustment 
            const { error: logError } = await supabase
                .from('stock_adjustments')
                .insert({
                    item_id: batch.item_id, // we still log against the item for history view
                    type: type === 'add' ? 'in' : type === 'remove' ? 'out' : 'adjustment',
                    quantity: type === 'set' ? newQty - batch.quantity : quantity,
                    reason: `[Batch Adjustment] ${reason}`,
                    date: new Date().toISOString()
                });
            if (logError) console.error("Failed to log adjustment", logError);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}

export function useDeleteInventoryItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('inventory_items').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}

export function useAddBatch() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (batch: Omit<ItemBatch, 'id' | 'created_at' | 'updated_at'>) => {
            const { error } = await supabase.from('item_batches').insert(batch);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}

export function useUpdateBatchStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: ItemBatch['status'] }) => {
            const { error } = await supabase
                .from('item_batches')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}
