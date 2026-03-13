import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export type GrnStatus = 'Draft' | 'Confirmed' | 'Cancelled';

type SupplierRel = { id: string; supplier_name: string } | { id: string; supplier_name: string }[] | null;
type ProductRel = { id: string; medicine_name: string; product_code: string | null; unit_type: string } | { id: string; medicine_name: string; product_code: string | null; unit_type: string }[] | null;
type InvoiceRel = { id: string; invoice_number: string; payment_status: string; outstanding_balance: number; total_amount: number } | { id: string; invoice_number: string; payment_status: string; outstanding_balance: number; total_amount: number }[] | null;

type GrnItemRow = {
    id: string;
    product_id: string;
    batch_number: string;
    manufacturing_date: string | null;
    expiry_date: string;
    purchase_price: number;
    selling_price: number;
    quantity_received: number;
    discount: number;
    tax: number;
    product: ProductRel;
};

type GrnRow = {
    id: string;
    grn_number: string;
    supplier_id: string;
    purchase_order_id: string | null;
    received_date: string;
    status: GrnStatus;
    confirmed_at: string | null;
    created_at: string;
    supplier: SupplierRel;
    items: GrnItemRow[];
    invoice: InvoiceRel;
};

export type GrnHistoryItem = {
    id: string;
    product_id: string;
    product_name: string;
    product_code: string | null;
    base_unit: string;
    batch_number: string;
    manufacturing_date: string | null;
    expiry_date: string;
    purchase_price: number;
    selling_price: number;
    quantity_received: number;
    discount: number;
    tax: number;
    line_total: number;
};

export type GrnHistoryEntry = {
    id: string;
    grn_number: string;
    supplier_id: string;
    supplier_name: string;
    purchase_order_id: string | null;
    received_date: string;
    status: GrnStatus;
    confirmed_at: string | null;
    created_at: string;
    total_quantity: number;
    total_amount: number;
    total_tax: number;
    item_count: number;
    invoice_id: string | null;
    invoice_number: string | null;
    invoice_payment_status: string | null;
    invoice_outstanding_balance: number | null;
    invoice_total_amount: number | null;
    items: GrnHistoryItem[];
};

export type GrnHistoryFilters = {
    status?: GrnStatus | 'all';
    search?: string;
    date_from?: string;
    date_to?: string;
};

function one<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapGrnRow(row: GrnRow): GrnHistoryEntry {
    const items = (row.items ?? []).map((item) => {
        const product = one(item.product);
        const lineTotal = (Number(item.purchase_price) * Number(item.quantity_received))
            - Number(item.discount ?? 0)
            + Number(item.tax ?? 0);

        return {
            id: item.id,
            product_id: item.product_id,
            product_name: product?.medicine_name ?? 'Unknown Product',
            product_code: product?.product_code ?? null,
            base_unit: product?.unit_type ?? 'unit',
            batch_number: item.batch_number,
            manufacturing_date: item.manufacturing_date,
            expiry_date: item.expiry_date,
            purchase_price: Number(item.purchase_price ?? 0),
            selling_price: Number(item.selling_price ?? 0),
            quantity_received: Number(item.quantity_received ?? 0),
            discount: Number(item.discount ?? 0),
            tax: Number(item.tax ?? 0),
            line_total: Math.max(0, Number(lineTotal ?? 0)),
        };
    });

    const invoice = one(row.invoice);
    const supplier = one(row.supplier);

    return {
        id: row.id,
        grn_number: row.grn_number,
        supplier_id: row.supplier_id,
        supplier_name: supplier?.supplier_name ?? 'Unknown Supplier',
        purchase_order_id: row.purchase_order_id,
        received_date: row.received_date,
        status: row.status,
        confirmed_at: row.confirmed_at,
        created_at: row.created_at,
        total_quantity: items.reduce((sum, item) => sum + item.quantity_received, 0),
        total_amount: items.reduce((sum, item) => sum + item.line_total, 0),
        total_tax: items.reduce((sum, item) => sum + item.tax, 0),
        item_count: items.length,
        invoice_id: invoice?.id ?? null,
        invoice_number: invoice?.invoice_number ?? null,
        invoice_payment_status: invoice?.payment_status ?? null,
        invoice_outstanding_balance: invoice ? Number(invoice.outstanding_balance ?? 0) : null,
        invoice_total_amount: invoice ? Number(invoice.total_amount ?? 0) : null,
        items,
    };
}

export function useGrnHistory(filters?: GrnHistoryFilters) {
    const { user } = useAuthStore();

    return useQuery({
        queryKey: ['grn_history', user?.tenant_id, filters],
        queryFn: async (): Promise<GrnHistoryEntry[]> => {
            let query = supabase
                .from('grn')
                .select(`
                    id,
                    grn_number,
                    supplier_id,
                    purchase_order_id,
                    received_date,
                    status,
                    confirmed_at,
                    created_at,
                    supplier:suppliers(
                        id,
                        supplier_name
                    ),
                    items:grn_items(
                        id,
                        product_id,
                        batch_number,
                        manufacturing_date,
                        expiry_date,
                        purchase_price,
                        selling_price,
                        quantity_received,
                        discount,
                        tax,
                        product:products(
                            id,
                            medicine_name,
                            product_code,
                            unit_type
                        )
                    ),
                    invoice:purchase_invoices(
                        id,
                        invoice_number,
                        payment_status,
                        outstanding_balance,
                        total_amount
                    )
                `)
                .order('created_at', { ascending: false });

            if (filters?.status && filters.status !== 'all') {
                query = query.eq('status', filters.status);
            }
            if (filters?.date_from) {
                query = query.gte('received_date', filters.date_from);
            }
            if (filters?.date_to) {
                query = query.lte('received_date', filters.date_to);
            }

            const { data, error } = await query;
            if (error) throw error;

            let mapped = ((data ?? []) as GrnRow[]).map(mapGrnRow);

            const q = (filters?.search ?? '').trim().toLowerCase();
            if (q) {
                mapped = mapped.filter((row) =>
                    row.grn_number.toLowerCase().includes(q)
                    || row.supplier_name.toLowerCase().includes(q)
                    || (row.invoice_number ?? '').toLowerCase().includes(q)
                    || row.items.some((item) =>
                        item.product_name.toLowerCase().includes(q)
                        || (item.product_code ?? '').toLowerCase().includes(q)
                        || item.batch_number.toLowerCase().includes(q)
                    )
                );
            }

            return mapped;
        },
        enabled: !!user?.tenant_id,
    });
}

export function useConfirmGrn() {
    const qc = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (grnId: string) => {
            const { data, error } = await supabase.rpc('confirm_grn', {
                p_grn_id: grnId,
                p_received_by: user?.id ?? null,
                p_generate_invoice: true,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['grn_history'] });
            qc.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
}

export function useCancelGrn() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (grnId: string) => {
            const { error } = await supabase
                .from('grn')
                .update({
                    status: 'Cancelled',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', grnId)
                .eq('status', 'Draft');

            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['grn_history'] });
        },
    });
}

