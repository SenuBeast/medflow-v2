import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, subDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

type AlertType = 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'reorder_level' | 'expired_stock';
type AlertSeverity = 'info' | 'warning' | 'critical';

type DashboardAlertRow = {
    id: string;
    alert_type: AlertType | string;
    severity: AlertSeverity | string;
    message: string;
    medicine_name: string | null;
    batch_number: string | null;
    created_at: string;
};

type InventoryAlertFallbackRow = {
    id: string;
    alert_type: AlertType | string;
    severity: AlertSeverity | string;
    message: string;
    created_at: string;
    product?: { medicine_name: string | null } | Array<{ medicine_name: string | null }> | null;
    batch?: { batch_number: string | null } | Array<{ batch_number: string | null }> | null;
};

type DashboardActivityRow = {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    created_at: string;
    user?: { full_name: string | null; email: string | null } | Array<{ full_name: string | null; email: string | null }> | null;
};

type ProductStockRow = {
    category: string | null;
    batches?: Array<{
        quantity: number | null;
        status: string | null;
    }> | null;
};

type SalesTrendRow = {
    created_at: string;
    total: number | null;
    status: string | null;
};

export type DashboardAlert = {
    id: string;
    alertType: string;
    severity: string;
    message: string;
    medicineName: string | null;
    batchNumber: string | null;
    createdAt: string;
};

export type DashboardActivity = {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorName: string;
    actorEmail: string | null;
    createdAt: string;
};

export type DashboardCategoryStock = {
    label: string;
    stock: number;
};

export type DashboardSalesTrendPoint = {
    day: string;
    revenue: number;
};

export type DashboardChartsData = {
    categoryStock: DashboardCategoryStock[];
    salesTrend: DashboardSalesTrendPoint[];
    thisWeekRevenue: number;
    weekGrowthPct: number;
};

function firstOf<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
}

export function useDashboardAlerts() {
    const tenantId = useAuthStore((s) => s.user?.tenant_id);

    return useQuery({
        queryKey: ['dashboard_alerts', tenantId],
        enabled: !!tenantId,
        queryFn: async (): Promise<DashboardAlert[]> => {
            // Regenerate latest alert snapshots. If this fails (permissions/RPC not available),
            // we still continue with existing open alerts.
            const { error: refreshError } = await supabase.rpc('generate_inventory_alerts');
            if (refreshError) {
                console.warn('generate_inventory_alerts failed:', refreshError.message);
            }

            const primary = await supabase
                .from('inventory_dashboard_alerts')
                .select('id, alert_type, severity, medicine_name, batch_number, message, created_at')
                .order('created_at', { ascending: false })
                .limit(12);

            if (!primary.error && primary.data) {
                return (primary.data as DashboardAlertRow[]).map((row) => ({
                    id: row.id,
                    alertType: row.alert_type,
                    severity: row.severity,
                    message: row.message,
                    medicineName: row.medicine_name,
                    batchNumber: row.batch_number,
                    createdAt: row.created_at,
                }));
            }

            const fallback = await supabase
                .from('inventory_alerts')
                .select(`
                    id,
                    alert_type,
                    severity,
                    message,
                    created_at,
                    product:products(medicine_name),
                    batch:batches(batch_number)
                `)
                .is('resolved_at', null)
                .order('created_at', { ascending: false })
                .limit(12);

            if (fallback.error) throw fallback.error;

            return ((fallback.data ?? []) as InventoryAlertFallbackRow[]).map((row) => ({
                id: row.id,
                alertType: row.alert_type,
                severity: row.severity,
                message: row.message,
                medicineName: firstOf(row.product)?.medicine_name ?? null,
                batchNumber: firstOf(row.batch)?.batch_number ?? null,
                createdAt: row.created_at,
            }));
        },
    });
}

export function useDashboardActivity() {
    const tenantId = useAuthStore((s) => s.user?.tenant_id);

    return useQuery({
        queryKey: ['dashboard_activity', tenantId],
        enabled: !!tenantId,
        queryFn: async (): Promise<DashboardActivity[]> => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('id, action, entity_type, entity_id, created_at, user:users(full_name, email)')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            return ((data ?? []) as DashboardActivityRow[]).map((row) => {
                const actor = firstOf(row.user);
                return {
                    id: row.id,
                    action: row.action,
                    entityType: row.entity_type,
                    entityId: row.entity_id,
                    actorName: actor?.full_name ?? actor?.email ?? 'System',
                    actorEmail: actor?.email ?? null,
                    createdAt: row.created_at,
                };
            });
        },
    });
}

export function useDashboardChartsData() {
    const tenantId = useAuthStore((s) => s.user?.tenant_id);

    return useQuery({
        queryKey: ['dashboard_charts', tenantId],
        enabled: !!tenantId,
        queryFn: async (): Promise<DashboardChartsData> => {
            const now = new Date();
            const currentWeekStart = startOfDay(subDays(now, 6));
            const previousWeekStart = startOfDay(subDays(now, 13));

            const [productsRes, salesRes] = await Promise.all([
                supabase
                    .from('products')
                    .select('category, batches:batches(quantity, status)'),
                supabase
                    .from('sale_transactions')
                    .select('created_at, total, status')
                    .gte('created_at', previousWeekStart.toISOString())
                    .neq('status', 'refunded'),
            ]);

            if (productsRes.error) throw productsRes.error;
            if (salesRes.error) throw salesRes.error;

            const products = (productsRes.data ?? []) as ProductStockRow[];
            const salesRows = (salesRes.data ?? []) as SalesTrendRow[];

            const categoryTotals = new Map<string, number>();
            for (const product of products) {
                const stock = (product.batches ?? []).reduce((sum, batch) => {
                    const status = (batch.status ?? '').toLowerCase();
                    if (status !== 'active' && status !== 'quarantined') return sum;
                    return sum + Number(batch.quantity ?? 0);
                }, 0);
                const label = (product.category ?? '').trim() || 'Uncategorized';
                categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + stock);
            }

            const categoryStock = [...categoryTotals.entries()]
                .map(([label, stock]) => ({ label, stock }))
                .sort((a, b) => b.stock - a.stock)
                .slice(0, 6);

            const salesTrend: DashboardSalesTrendPoint[] = Array.from({ length: 7 }, (_, index) => {
                const day = startOfDay(subDays(now, 6 - index));
                return {
                    day: format(day, 'EEE'),
                    revenue: 0,
                };
            });

            const trendByIsoDate = new Map<string, number>();
            salesTrend.forEach((point, index) => {
                const day = startOfDay(subDays(now, 6 - index));
                trendByIsoDate.set(format(day, 'yyyy-MM-dd'), point.revenue);
            });

            let thisWeekRevenue = 0;
            let previousWeekRevenue = 0;

            for (const row of salesRows) {
                const value = Number(row.total ?? 0);
                const saleDate = startOfDay(new Date(row.created_at));
                const isoDate = format(saleDate, 'yyyy-MM-dd');

                if (saleDate >= currentWeekStart) {
                    thisWeekRevenue += value;
                    if (trendByIsoDate.has(isoDate)) {
                        trendByIsoDate.set(isoDate, (trendByIsoDate.get(isoDate) ?? 0) + value);
                    }
                } else {
                    previousWeekRevenue += value;
                }
            }

            const normalizedTrend = salesTrend.map((point, index) => {
                const day = startOfDay(subDays(now, 6 - index));
                const isoDate = format(day, 'yyyy-MM-dd');
                return {
                    day: point.day,
                    revenue: trendByIsoDate.get(isoDate) ?? 0,
                };
            });

            const weekGrowthPct = previousWeekRevenue === 0
                ? (thisWeekRevenue > 0 ? 100 : 0)
                : ((thisWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100;

            return {
                categoryStock,
                salesTrend: normalizedTrend,
                thisWeekRevenue,
                weekGrowthPct,
            };
        },
    });
}

