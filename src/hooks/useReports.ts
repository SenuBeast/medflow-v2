import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ReportFilters, InventoryItem, SaleTransaction, StockCountSession, AuditLog } from '../lib/types';

// ─── Inventory Report ─────────────────────────────────────────────────────────

export interface InventoryReportRow {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    is_controlled: boolean;
    total_stock: number;
    unit: string;
    minimum_order_quantity: number;
    cost_price: number | null;
    selling_price: number | null;
    total_value: number;
    status: 'ok' | 'low' | 'out';
}

export function useInventoryReport(filters: ReportFilters) {
    return useQuery({
        queryKey: ['report_inventory', filters],
        queryFn: async (): Promise<InventoryReportRow[]> => {
            let q = supabase
                .from('inventory_items')
                .select('*, batches:item_batches(quantity,status)')
                .order('name');

            if (filters.search) q = q.ilike('name', `%${filters.search}%`);
            if (filters.category) q = q.eq('category', filters.category);
            if (filters.controlledOnly) q = q.eq('is_controlled', true);

            const { data, error } = await q;
            if (error) throw error;

            return ((data ?? []) as InventoryItem[]).map(item => {
                const activeBatches = (item.batches ?? []).filter(b => b.status === 'active');
                const totalStock = activeBatches.reduce((s, b) => s + b.quantity, 0);
                const totalValue = totalStock * (item.cost_price ?? 0);
                const status: 'ok' | 'low' | 'out' =
                    totalStock === 0 ? 'out' :
                        totalStock <= item.minimum_order_quantity ? 'low' : 'ok';
                return {
                    id: item.id,
                    name: item.name,
                    sku: item.sku,
                    category: item.category,
                    is_controlled: item.is_controlled,
                    total_stock: totalStock,
                    unit: item.unit,
                    minimum_order_quantity: item.minimum_order_quantity,
                    cost_price: item.cost_price,
                    selling_price: item.selling_price,
                    total_value: totalValue,
                    status,
                };
            });
        },
    });
}

// ─── Sales Report ─────────────────────────────────────────────────────────────

export interface SalesReportData {
    transactions: SaleTransaction[];
    totalRevenue: number;
    totalTransactions: number;
    avgOrderValue: number;
    topProducts: { name: string; qty: number; revenue: number }[];
}

export function useSalesReport(filters: ReportFilters) {
    return useQuery({
        queryKey: ['report_sales', filters],
        queryFn: async (): Promise<SalesReportData> => {
            let q = supabase
                .from('sale_transactions')
                .select('*, seller:users!sale_transactions_sold_by_fkey(id,full_name,email), items:sale_items(*)')
                .order('created_at', { ascending: false });

            if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
            if (filters.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59`);

            const { data, error } = await q;
            if (error) throw error;

            const transactions = (data ?? []) as SaleTransaction[];
            const completedTx = transactions.filter(tx => tx.status !== 'refunded');
            const totalRevenue = completedTx.reduce((s, tx) => s + tx.total, 0);
            const avgOrderValue = completedTx.length ? totalRevenue / completedTx.length : 0;

            // Aggregate top products
            const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
            for (const tx of completedTx) {
                for (const item of (tx.items ?? [])) {
                    const prev = productMap.get(item.item_id) ?? { name: item.item_name, qty: 0, revenue: 0 };
                    productMap.set(item.item_id, { name: item.item_name, qty: prev.qty + item.quantity, revenue: prev.revenue + item.subtotal });
                }
            }
            const topProducts = [...productMap.values()]
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10);

            return { transactions, totalRevenue, totalTransactions: completedTx.length, avgOrderValue, topProducts };
        },
    });
}

// ─── Expiry Report ────────────────────────────────────────────────────────────

export interface ExpiryReportRow {
    id: string;
    item_id: string;
    item_name: string;
    item_sku: string | null;
    batch_number: string;
    quantity: number;
    expiry_date: string;
    days_to_expiry: number;
    status: 'expired' | 'critical' | 'warning' | 'ok';
}

export function useExpiryReport(filters: ReportFilters) {
    return useQuery({
        queryKey: ['report_expiry', filters],
        queryFn: async (): Promise<ExpiryReportRow[]> => {
            const window = filters.expiryWindow ?? 30;
            const days = window === 'expired' ? 3650 : window;
            const { data, error } = await supabase.rpc('inventory_report_expiry', { p_days: days });
            if (error) throw error;

            return ((data ?? []) as Array<{
                batch_id: string;
                product_id: string;
                medicine_name: string;
                batch_number: string;
                expiry_date: string;
                quantity: number;
                days_to_expiry: number;
                expiry_status: 'expired' | 'near_expiry' | 'ok';
            }>)
                .map((row) => {
                    const mappedStatus: ExpiryReportRow['status'] =
                        row.expiry_status === 'expired'
                            ? 'expired'
                            : Number(row.days_to_expiry) <= 30
                                ? 'critical'
                                : Number(row.days_to_expiry) <= 60
                                    ? 'warning'
                                    : 'ok';

                    return {
                        id: row.batch_id,
                        item_id: row.product_id,
                        item_name: row.medicine_name,
                        item_sku: null,
                        batch_number: row.batch_number,
                        quantity: row.quantity,
                        expiry_date: row.expiry_date,
                        days_to_expiry: Number(row.days_to_expiry),
                        status: mappedStatus,
                    };
                })
                .filter((row) => {
                    if (filters.search && !row.item_name.toLowerCase().includes(filters.search.toLowerCase())) return false;
                    if (window === 'expired') return row.days_to_expiry < 0;
                    return row.days_to_expiry >= 0 && row.days_to_expiry <= window;
                });
        },
    });
}

// ─── Controlled Report ────────────────────────────────────────────────────────

export function useControlledReport(filters: ReportFilters) {
    return useQuery({
        queryKey: ['report_controlled', filters],
        queryFn: async (): Promise<InventoryItem[]> => {
            let q = supabase
                .from('inventory_items')
                .select('*, batches:item_batches(*)')
                .eq('is_controlled', true)
                .order('name');

            if (filters.search) q = q.ilike('name', `%${filters.search}%`);

            const { data, error } = await q;
            if (error) throw error;
            return (data ?? []) as InventoryItem[];
        },
    });
}

// ─── Stock Count Report ───────────────────────────────────────────────────────

export function useStockCountReport(filters: ReportFilters) {
    return useQuery({
        queryKey: ['report_stock_counts', filters],
        queryFn: async (): Promise<StockCountSession[]> => {
            let q = supabase
                .from('stock_count_sessions')
                .select(`
                    *,
                    creator:users!stock_count_sessions_created_by_fkey(full_name, email),
                    items:stock_count_items(*, item:inventory_items(name, sku))
                `)
                .order('created_at', { ascending: false });

            if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
            if (filters.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59`);

            const { data, error } = await q;
            if (error) throw error;
            return (data ?? []) as StockCountSession[];
        },
    });
}

// ─── Audit Report ─────────────────────────────────────────────────────────────

export function useAuditReport(filters: ReportFilters) {
    return useQuery({
        queryKey: ['report_audit', filters],
        queryFn: async (): Promise<AuditLog[]> => {
            let q = supabase
                .from('audit_logs')
                .select('*, user:users(full_name, email)')
                .order('created_at', { ascending: false })
                .limit(200);

            if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
            if (filters.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59`);
            if (filters.search) q = q.or(`action.ilike.%${filters.search}%,entity_type.ilike.%${filters.search}%`);

            const { data, error } = await q;
            if (error) throw error;
            return (data ?? []) as AuditLog[];
        },
    });
}
