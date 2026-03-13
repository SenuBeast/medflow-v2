import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { InventoryItem, ItemBatch } from '../lib/types';
import { useAuthStore } from '../store/authStore';

type SupplierRow = {
    id: string;
    supplier_name: string;
};

type ProductRow = {
    id: string;
    tenant_id: string;
    product_code: string;
    medicine_name: string;
    generic_name: string | null;
    brand_name: string | null;
    category: string | null;
    manufacturer: string | null;
    barcode: string | null;
    unit_type: string;
    pack_size: number | null;
    minimum_stock_level: number | null;
    reorder_level: number | null;
    controlled_drug: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    batches?: BatchRow[];
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
    supplier_id: string | null;
    grn_id: string | null;
    quantity: number;
    status: BatchStatus;
    created_at: string;
    updated_at: string;
    supplier?: SupplierRow | SupplierRow[] | null;
};

export type InventorySupplier = {
    id: string;
    supplier_name: string;
};

export type GrnReceiptInput = {
    supplier_id?: string | null;
    supplier_name?: string | null;
    purchase_order_id?: string | null;
    received_date: string;
    product_id: string;
    batch_number: string;
    manufacturing_date?: string | null;
    expiry_date: string;
    purchase_price: number;
    selling_price: number;
    quantity_received: number;
    discount?: number;
    tax?: number;
    unit_name?: string | null;
    units_per_pack?: number | null;
};

function toUiBatchStatus(status: BatchStatus): ItemBatch['status'] {
    if (status === 'recalled') return 'quarantined';
    if (status === 'expired') return 'disposed';
    return status;
}

function fromUiBatchStatus(status: ItemBatch['status']): BatchStatus {
    if (status === 'disposed') return 'expired';
    return status;
}

function stripUndefined<T extends Record<string, unknown>>(payload: T): Partial<T> {
    const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
    return Object.fromEntries(entries) as Partial<T>;
}

function buildProductCode(inputSku: string | null | undefined): string {
    const value = (inputSku ?? '').trim();
    if (value) return value;
    return `MED-${Date.now()}`;
}

function mapProductToInventoryItem(product: ProductRow): InventoryItem {
    const resolveSupplier = (batch: BatchRow): SupplierRow | null => {
        if (Array.isArray(batch.supplier)) return batch.supplier[0] ?? null;
        return batch.supplier ?? null;
    };

    const mappedBatches: ItemBatch[] = (product.batches ?? []).map((batch) => ({
        id: batch.id,
        item_id: batch.product_id,
        batch_number: batch.batch_number,
        quantity: Number(batch.quantity ?? 0),
        selling_price: batch.selling_price ?? null,
        expiry_date: batch.expiry_date,
        purchase_date: batch.manufacturing_date,
        manufacturing_date: batch.manufacturing_date,
        supplier: resolveSupplier(batch)?.supplier_name ?? null,
        supplier_id: batch.supplier_id,
        cost_price: batch.purchase_price ?? null,
        grn_id: batch.grn_id,
        status: toUiBatchStatus(batch.status),
        location: null,
        created_at: batch.created_at,
        updated_at: batch.updated_at,
    }));

    const activeBatches = (product.batches ?? [])
        .filter((b) => b.status === 'active' && Number(b.quantity) > 0)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

    const quantity = activeBatches.reduce((sum, b) => sum + Number(b.quantity ?? 0), 0);
    const avgCost = activeBatches.length
        ? activeBatches.reduce((sum, b) => sum + Number(b.purchase_price ?? 0), 0) / activeBatches.length
        : 0;
    const fefoSelling = activeBatches[0]?.selling_price ?? 0;

    return {
        id: product.id,
        name: product.medicine_name,
        generic_name: product.generic_name,
        description: product.notes,
        sku: product.product_code,
        barcode: product.barcode,
        manufacturer: product.manufacturer,
        brand_name: product.brand_name,
        category: product.category,
        quantity,
        unit: product.unit_type,
        pack_size: Number(product.pack_size ?? 1),
        cost_price: avgCost || null,
        selling_price: fefoSelling || null,
        expiry_date: activeBatches[0]?.expiry_date ?? null,
        is_controlled: product.controlled_drug,
        minimum_order_quantity: Number(product.minimum_stock_level ?? 0),
        reorder_level: Number(product.reorder_level ?? 0),
        tenant_id: product.tenant_id,
        created_at: product.created_at,
        updated_at: product.updated_at,
        batches: mappedBatches,
    };
}

async function ensureSupplierId({
    supplierId,
    supplierName,
    tenantId,
}: {
    supplierId?: string | null;
    supplierName?: string | null;
    tenantId: string;
}): Promise<string> {
    if (supplierId) return supplierId;

    const normalizedName = (supplierName ?? '').trim();
    if (!normalizedName) {
        throw new Error('Supplier is required for GRN.');
    }

    const { data: existing, error: findError } = await supabase
        .from('suppliers')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('supplier_name', normalizedName)
        .maybeSingle();

    if (findError) throw findError;
    if (existing?.id) return existing.id as string;

    const { data: created, error: createError } = await supabase
        .from('suppliers')
        .insert({
            tenant_id: tenantId,
            supplier_name: normalizedName,
        })
        .select('id')
        .single();

    if (createError || !created?.id) throw createError ?? new Error('Failed to create supplier');
    return created.id as string;
}

async function upsertPackUnitIfProvided({
    tenantId,
    productId,
    unitName,
    conversionFactor,
}: {
    tenantId: string;
    productId: string;
    unitName?: string | null;
    conversionFactor?: number | null;
}) {
    const name = (unitName ?? '').trim();
    const factor = Number(conversionFactor ?? 0);

    if (!name || factor <= 0 || factor === 1) return;

    const { error } = await supabase.from('units').upsert(
        {
            tenant_id: tenantId,
            product_id: productId,
            unit_name: name,
            conversion_factor: factor,
            is_base: false,
        },
        { onConflict: 'tenant_id,product_id,unit_name' }
    );

    if (error) throw error;
}

function normalizeUuid(value?: string | null): string | null {
    const normalized = (value ?? '').trim();
    if (!normalized) return null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(normalized) ? normalized : null;
}

export function useInventory() {
    const { user } = useAuthStore();

    return useQuery({
        queryKey: ['inventory', user?.tenant_id],
        queryFn: async (): Promise<InventoryItem[]> => {
            const { data, error } = await supabase
                .from('products')
                .select(`
                    id,
                    tenant_id,
                    product_code,
                    medicine_name,
                    generic_name,
                    brand_name,
                    category,
                    manufacturer,
                    barcode,
                    unit_type,
                    pack_size,
                    minimum_stock_level,
                    reorder_level,
                    controlled_drug,
                    notes,
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
                        supplier_id,
                        grn_id,
                        quantity,
                        status,
                        created_at,
                        updated_at,
                        supplier:suppliers(
                            id,
                            supplier_name
                        )
                    )
                `)
                .order('medicine_name');

            if (error) throw error;
            return ((data ?? []) as ProductRow[]).map(mapProductToInventoryItem);
        },
        enabled: !!user?.tenant_id,
    });
}

export function useSuppliers() {
    const { user } = useAuthStore();

    return useQuery({
        queryKey: ['inventory_suppliers', user?.tenant_id],
        queryFn: async (): Promise<InventorySupplier[]> => {
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, supplier_name')
                .order('supplier_name');

            if (error) throw error;
            return (data ?? []) as InventorySupplier[];
        },
        enabled: !!user?.tenant_id,
    });
}

export function useAddInventoryItem() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
            const tenantId = useAuthStore.getState().user?.tenant_id;
            if (!tenantId) throw new Error('Missing tenant context');

            const payload = {
                tenant_id: tenantId,
                product_code: buildProductCode(item.sku),
                medicine_name: item.name,
                generic_name: item.generic_name ?? null,
                brand_name: item.brand_name ?? null,
                category: item.category ?? null,
                manufacturer: item.manufacturer ?? null,
                barcode: item.barcode ?? null,
                unit_type: item.unit || 'unit',
                pack_size: Math.max(1, Number(item.pack_size ?? 1)),
                minimum_stock_level: Math.max(0, Number(item.minimum_order_quantity ?? 0)),
                reorder_level: Math.max(0, Number(item.reorder_level ?? item.minimum_order_quantity ?? 0)),
                controlled_drug: !!item.is_controlled,
                notes: item.description ?? null,
            };

            const { error } = await supabase.from('products').insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['inventory'] });
            qc.invalidateQueries({ queryKey: ['inventory_suppliers'] });
            qc.invalidateQueries({ queryKey: ['grn_history'] });
        },
    });
}

export function useUpdateInventoryItem() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
            const payload = stripUndefined({
                product_code: updates.sku ? buildProductCode(updates.sku) : undefined,
                medicine_name: updates.name,
                generic_name: updates.generic_name,
                brand_name: updates.brand_name,
                category: updates.category,
                manufacturer: updates.manufacturer,
                barcode: updates.barcode,
                unit_type: updates.unit,
                pack_size: updates.pack_size,
                minimum_stock_level: updates.minimum_order_quantity,
                reorder_level: updates.reorder_level ?? updates.minimum_order_quantity,
                controlled_drug: updates.is_controlled,
                notes: updates.description,
                updated_at: new Date().toISOString(),
            });

            const { error } = await supabase
                .from('products')
                .update(payload)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}

export function useAdjustBatchStock() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({
            batch_id,
            type,
            quantity,
            reason,
        }: {
            batch_id: string;
            type: 'add' | 'remove' | 'set';
            quantity: number;
            reason: string;
        }) => {
            const { data: batch, error: fetchError } = await supabase
                .from('batches')
                .select('id, product_id, quantity')
                .eq('id', batch_id)
                .single();

            if (fetchError || !batch) throw fetchError ?? new Error('Batch not found');

            const currentQty = Number(batch.quantity ?? 0);
            const requestedQty = Math.max(0, Number(quantity));
            if (requestedQty === 0 && type !== 'set') {
                return;
            }

            let adjustmentType: 'increase' | 'decrease' = 'increase';
            let delta = requestedQty;

            if (type === 'add') {
                adjustmentType = 'increase';
                delta = requestedQty;
            } else if (type === 'remove') {
                adjustmentType = 'decrease';
                delta = Math.min(requestedQty, currentQty);
            } else {
                const target = requestedQty;
                if (target === currentQty) return;
                adjustmentType = target > currentQty ? 'increase' : 'decrease';
                delta = Math.abs(target - currentQty);
            }

            const { error: adjustError } = await supabase.rpc('create_stock_adjustment', {
                p_product_id: batch.product_id,
                p_batch_id: batch_id,
                p_adjustment_type: adjustmentType,
                p_quantity_change: delta,
                p_reason: `[Batch Adjustment] ${reason}`,
            });

            if (adjustError) throw adjustError;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}

export function useDeleteInventoryItem() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}

export function useAddBatch() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (batch: Omit<ItemBatch, 'id' | 'created_at' | 'updated_at'>) => {
            const tenantId = useAuthStore.getState().user?.tenant_id;
            if (!tenantId) throw new Error('Missing tenant context');

            const payload = {
                tenant_id: tenantId,
                product_id: batch.item_id,
                batch_number: batch.batch_number,
                expiry_date: batch.expiry_date,
                manufacturing_date: batch.manufacturing_date ?? batch.purchase_date ?? null,
                purchase_price: batch.cost_price ?? 0,
                selling_price: batch.selling_price ?? 0,
                supplier_id: batch.supplier_id ?? null,
                quantity: Math.max(0, Number(batch.quantity)),
                status: fromUiBatchStatus(batch.status),
            };

            const { error } = await supabase.from('batches').insert(payload);
            if (error) throw error;

            await upsertPackUnitIfProvided({
                tenantId,
                productId: batch.item_id,
                unitName: batch.unit_name,
                conversionFactor: batch.units_per_pack ?? null,
            });
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}

export function useCreateGrnReceipt() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (input: GrnReceiptInput) => {
            const user = useAuthStore.getState().user;
            const tenantId = user?.tenant_id;

            if (!tenantId) throw new Error('Missing tenant context');

            const supplierId = await ensureSupplierId({
                supplierId: input.supplier_id,
                supplierName: input.supplier_name,
                tenantId,
            });

            const { data: grn, error: grnError } = await supabase
                .from('grn')
                .insert({
                    tenant_id: tenantId,
                    grn_number: '',
                    supplier_id: supplierId,
                    purchase_order_id: normalizeUuid(input.purchase_order_id),
                    received_date: input.received_date,
                    received_by: user?.id ?? null,
                    status: 'Draft',
                })
                .select('id')
                .single();

            if (grnError || !grn?.id) throw grnError ?? new Error('Failed to create GRN');

            const { error: grnItemError } = await supabase.from('grn_items').insert({
                grn_id: grn.id,
                product_id: input.product_id,
                batch_number: input.batch_number,
                manufacturing_date: input.manufacturing_date ?? null,
                expiry_date: input.expiry_date,
                purchase_price: Math.max(0, Number(input.purchase_price ?? 0)),
                selling_price: Math.max(0, Number(input.selling_price ?? 0)),
                quantity_received: Math.max(0, Number(input.quantity_received ?? 0)),
                discount: Math.max(0, Number(input.discount ?? 0)),
                tax: Math.max(0, Number(input.tax ?? 0)),
            });

            if (grnItemError) throw grnItemError;

            const { data: confirmData, error: confirmError } = await supabase.rpc('confirm_grn', {
                p_grn_id: grn.id,
                p_received_by: user?.id ?? null,
                p_generate_invoice: true,
            });

            if (confirmError) throw confirmError;

            await upsertPackUnitIfProvided({
                tenantId,
                productId: input.product_id,
                unitName: input.unit_name,
                conversionFactor: input.units_per_pack ?? null,
            });

            return confirmData;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['inventory'] });
            qc.invalidateQueries({ queryKey: ['inventory_suppliers'] });
        },
    });
}

export function useUpdateBatchStatus() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: ItemBatch['status'] }) => {
            const { error } = await supabase
                .from('batches')
                .update({ status: fromUiBatchStatus(status), updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
    });
}
