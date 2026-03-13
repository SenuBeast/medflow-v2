import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { InventoryItem, ItemBatch, ProductUnitOption } from '../lib/types';
import { useAuth } from './useAuth';

type ProductRow = {
    id: string;
    tenant_id: string;
    product_code: string;
    medicine_name: string;
    generic_name: string | null;
    category: string | null;
    unit_type: string;
    pack_size: number | null;
    minimum_stock_level: number | null;
    reorder_level: number | null;
    controlled_drug: boolean;
    notes: string | null;
    barcode: string | null;
    created_at: string;
    updated_at: string;
    batches?: BatchRow[];
    units?: UnitRow[];
};

type BatchStatus = 'active' | 'quarantined' | 'recalled' | 'expired' | 'depleted';
type BatchRow = {
    id: string;
    product_id: string;
    batch_number: string;
    expiry_date: string;
    manufacturing_date: string | null;
    purchase_price: number | null;
    selling_price: number | null;
    quantity: number;
    status: BatchStatus;
    created_at: string;
    updated_at: string;
};

type UnitRow = {
    unit_name: string;
    conversion_factor: number;
    is_base: boolean;
};

function toUiBatchStatus(status: BatchStatus): ItemBatch['status'] {
    if (status === 'recalled') return 'quarantined';
    if (status === 'expired') return 'disposed';
    return status;
}

function mapProduct(product: ProductRow): InventoryItem & { batches: ItemBatch[] } {
    const mappedBatches: ItemBatch[] = (product.batches ?? []).map((batch) => ({
        id: batch.id,
        item_id: batch.product_id,
        batch_number: batch.batch_number,
        quantity: Number(batch.quantity ?? 0),
        expiry_date: batch.expiry_date,
        purchase_date: batch.manufacturing_date,
        supplier: null,
        cost_price: batch.purchase_price ?? null,
        status: toUiBatchStatus(batch.status),
        location: null,
        created_at: batch.created_at,
        updated_at: batch.updated_at,
    }));

    const activeBatches = (product.batches ?? [])
        .filter((b) => b.status === 'active' && Number(b.quantity) > 0)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

    const totalStock = activeBatches.reduce((sum, b) => sum + Number(b.quantity ?? 0), 0);
    const avgCost = activeBatches.length
        ? activeBatches.reduce((sum, b) => sum + Number(b.purchase_price ?? 0), 0) / activeBatches.length
        : 0;
    const fefoSellingPrice = activeBatches[0]?.selling_price ?? 0;

    const mappedUnits: ProductUnitOption[] = (product.units ?? []).map((u) => ({
        unit_name: u.unit_name,
        conversion_factor: Number(u.conversion_factor ?? 1),
        is_base: !!u.is_base,
    }));

    const hasBase = mappedUnits.some((u) => u.is_base || u.conversion_factor === 1 || u.unit_name.toLowerCase() === product.unit_type.toLowerCase());
    const fallbackUnits: ProductUnitOption[] = hasBase
        ? []
        : [{ unit_name: product.unit_type, conversion_factor: 1, is_base: true }];

    const hasPack = mappedUnits.some((u) => u.conversion_factor > 1);
    const fallbackPack: ProductUnitOption[] =
        !hasPack && Number(product.pack_size ?? 1) > 1
            ? [{ unit_name: 'pack', conversion_factor: Number(product.pack_size), is_base: false }]
            : [];

    const unitOptions = [...mappedUnits, ...fallbackUnits, ...fallbackPack]
        .filter((u, idx, arr) => arr.findIndex((x) => x.unit_name.toLowerCase() === u.unit_name.toLowerCase()) === idx)
        .sort((a, b) => Number(b.conversion_factor) - Number(a.conversion_factor));

    return {
        id: product.id,
        name: product.medicine_name,
        generic_name: product.generic_name,
        description: product.notes,
        sku: product.product_code,
        category: product.category,
        quantity: totalStock,
        unit: product.unit_type,
        cost_price: avgCost || null,
        selling_price: fefoSellingPrice || null,
        expiry_date: activeBatches[0]?.expiry_date ?? null,
        is_controlled: product.controlled_drug,
        minimum_order_quantity: Number(product.minimum_stock_level ?? product.reorder_level ?? 0),
        tenant_id: product.tenant_id,
        base_unit: product.unit_type,
        unit_options: unitOptions,
        created_at: product.created_at,
        updated_at: product.updated_at,
        batches: mappedBatches,
    };
}

export function useProducts(categoryId?: string, search?: string) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['pos_products', categoryId, search],
        queryFn: async () => {
            let query = supabase
                .from('products')
                .select(`
                    id,
                    tenant_id,
                    product_code,
                    medicine_name,
                    generic_name,
                    category,
                    unit_type,
                    pack_size,
                    minimum_stock_level,
                    reorder_level,
                    controlled_drug,
                    notes,
                    barcode,
                    created_at,
                    updated_at,
                    batches:batches(
                        id,
                        product_id,
                        batch_number,
                        expiry_date,
                        manufacturing_date,
                        purchase_price,
                        selling_price,
                        quantity,
                        status,
                        created_at,
                        updated_at
                    ),
                    units:units(
                        unit_name,
                        conversion_factor,
                        is_base
                    )
                `)
                .order('medicine_name');

            if (categoryId && categoryId !== 'all') {
                query = query.eq('category', categoryId);
            }

            if (search) {
                query = query.or(
                    `medicine_name.ilike.%${search}%,product_code.ilike.%${search}%,barcode.ilike.%${search}%,generic_name.ilike.%${search}%`
                );
            }

            if (user?.tenant_id) {
                query = query.eq('tenant_id', user.tenant_id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return ((data ?? []) as ProductRow[]).map(mapProduct);
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
                .from('products')
                .select('category');

            if (user?.tenant_id) {
                query = query.eq('tenant_id', user.tenant_id);
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
