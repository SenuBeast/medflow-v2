import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { InventoryItem, ItemBatch } from '../lib/types';
import { useAuth } from './useAuth';

export function useProducts(categoryId?: string, search?: string) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['pos_products', categoryId, search],
        queryFn: async () => {
            let query = supabase
                .from('inventory_items')
                .select(`
                    *,
                    batches:item_batches(*)
                `)
                .order('name');

            if (categoryId && categoryId !== 'all') {
                query = query.eq('category', categoryId);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
            }

            // In future multi-tenant:
            if (user?.company_id) {
                query = query.eq('company_id', user.company_id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as (InventoryItem & { batches: ItemBatch[] })[];
        },
        enabled: !!user
    });
}

// Fetch distinct categories for the filter
export function useCategories() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['pos_categories'],
        queryFn: async () => {
            let query = supabase
                .from('inventory_items')
                .select('category');

            if (user?.company_id) {
                query = query.eq('company_id', user.company_id);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Extract distinct non-null categories
            const cats = data.map(d => d.category).filter(Boolean) as string[];
            return [...new Set(cats)].sort();
        },
        enabled: !!user
    });
}
