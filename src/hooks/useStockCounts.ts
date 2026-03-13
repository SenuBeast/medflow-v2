import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { StockCountSession, StockCountAuditLog } from '../lib/types';
import { useAuthStore } from '../store/authStore';

export function useStockCountSessions() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['stock_count_sessions', user?.tenant_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock_count_sessions')
                .select(`
                    *,
                    creator:users!stock_count_sessions_created_by_fkey(id, full_name, email),
                    approver:users!stock_count_sessions_approved_by_fkey(id, full_name, email)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as StockCountSession[];
        },
        enabled: !!user?.tenant_id,
    });
}

export function useStockCountSession(sessionId: string) {
    return useQuery({
        queryKey: ['stock_count_session', sessionId],
        queryFn: async () => {
            // Fetch session
            const { data: session, error: sessionError } = await supabase
                .from('stock_count_sessions')
                .select(`
                    *,
                    creator:users!stock_count_sessions_created_by_fkey(id, full_name, email),
                    approver:users!stock_count_sessions_approved_by_fkey(id, full_name, email)
                `)
                .eq('id', sessionId)
                .single();
            if (sessionError) throw sessionError;

            // Fetch items with batch and parent item info
            const { data: items, error: itemsError } = await supabase
                .from('stock_count_items')
                .select(`
                    *,
                    batch:item_batches(*),
                    item:inventory_items(*)
                `)
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });
            if (itemsError) throw itemsError;

            session.items = items;
            return session as StockCountSession;
        },
        enabled: !!sessionId,
    });
}

export function useStockCountAuditLogs(sessionId: string) {
    return useQuery({
        queryKey: ['stock_count_audit_logs', sessionId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock_count_audit_logs')
                .select(`
                    *,
                    user:users!stock_count_audit_logs_performed_by_fkey(id, full_name, email)
                `)
                .eq('session_id', sessionId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as StockCountAuditLog[];
        },
        enabled: !!sessionId,
    });
}

export function useCreateStockCountSession() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async ({ type, notes }: { type: 'full' | 'partial' | 'cycle', notes?: string }) => {
            if (!user) throw new Error('Not authenticated');

            // 1. Create Session
            const { data: session, error: sessionError } = await supabase
                .from('stock_count_sessions')
                .insert({
                    type,
                    notes: notes || null,
                    status: 'draft',
                    created_by: user.id,
                    tenant_id: user.tenant_id,
                })
                .select()
                .single();
            if (sessionError) throw sessionError;

            // 2. Fetch appropriate batches to count (For MVP, we'll fetch all active/quarantined batches)
            const { data: batches, error: batchesError } = await supabase
                .from('batches')
                .select('id, product_id, quantity')
                .in('status', ['active', 'quarantined']);

            if (batchesError) throw batchesError;

            // 3. Create stock count items line entries
            if (batches && batches.length > 0) {
                const itemsToInsert = batches.map(b => ({
                    session_id: session.id,
                    item_id: b.product_id,
                    batch_id: b.id,
                    system_quantity: b.quantity,
                    physical_count: null,
                }));

                const { error: itemsError } = await supabase.from('stock_count_items').insert(itemsToInsert);
                if (itemsError) throw itemsError;
            }

            // 4. Create Audit Log
            await supabase.from('stock_count_audit_logs').insert({
                session_id: session.id,
                action: 'created',
                performed_by: user.id,
                details: { type, total_batches: batches?.length || 0 }
            });

            return session;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock_count_sessions'] });
        },
    });
}

export function useUpdateStockCountItem() {
    return useMutation({
        mutationFn: async ({ id, physical_count, notes }: { id: string; physical_count: number; notes?: string }) => {
            const { data, error } = await supabase
                .from('stock_count_items')
                .update({ physical_count, notes: notes || null, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // We only invalidate the specific session to avoid full refetch if we can, but let's just invalidate all relevant ones
            // Actually, we shouldn't invalidate aggressively while user is typing. We leave that to the component.
        },
    });
}

export function useSubmitStockCountSession() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('stock_count_sessions')
                .update({ status: 'submitted', updated_at: new Date().toISOString() })
                .eq('id', sessionId)
                .select()
                .single();
            if (error) throw error;

            await supabase.from('stock_count_audit_logs').insert({
                session_id: sessionId,
                action: 'submitted',
                performed_by: user.id,
                details: null
            });

            return data;
        },
        onSuccess: (_, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ['stock_count_session', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['stock_count_sessions'] });
            queryClient.invalidateQueries({ queryKey: ['stock_count_audit_logs', sessionId] });
        },
    });
}

export function useApproveStockCountSession() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async ({ sessionId, isApproved }: { sessionId: string; isApproved: boolean }) => {
            if (!user) throw new Error('Not authenticated');

            const newStatus = isApproved ? 'approved' : 'rejected';

            // 1. Update Session Status
            const { data: session, error: sessionError } = await supabase
                .from('stock_count_sessions')
                .update({
                    status: newStatus,
                    approved_by: user.id,
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', sessionId)
                .select()
                .single();
            if (sessionError) throw sessionError;

            // 2. If approved, apply discrepancies to batches
            if (isApproved) {
                // Fetch the counted items
                const { data: items, error: itemsError } = await supabase
                    .from('stock_count_items')
                    .select('*')
                    .eq('session_id', sessionId)
                    .not('physical_count', 'is', null);

                if (itemsError) throw itemsError;

                // Sync each batch's quantity to the physical count if there's a variance
                for (const item of items) {
                    if (item.variance !== 0 && item.physical_count !== null) {
                        const { error: batchErr } = await supabase
                            .from('batches')
                            .update({ quantity: item.physical_count, updated_at: new Date().toISOString() })
                            .eq('id', item.batch_id);
                        if (batchErr) console.error("Failed to update batch", item.batch_id, batchErr);

                        // We should ideally also log to stock_adjustments table, but keeping it simple for now
                    }
                }
            }

            // 3. Audit Log
            await supabase.from('stock_count_audit_logs').insert({
                session_id: sessionId,
                action: isApproved ? 'approved' : 'rejected',
                performed_by: user.id,
                details: null
            });

            return session;
        },
        onSuccess: (_, { sessionId }) => {
            queryClient.invalidateQueries({ queryKey: ['stock_count_session', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['stock_count_sessions'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] }); // Refresh inventory
        },
    });
}
