import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface MonthlyRevenue {
    month: string;
    revenue: number;
}

export interface TopProduct {
    product_name: string;
    total_sold: number;
    total_revenue: number;
}

export interface StaffSales {
    staff_name: string;
    revenue: number;
    transactions_count: number;
}

export interface OverviewMetrics {
    today_revenue: number;
    week_revenue: number;
    month_revenue: number;
    total_transactions: number;
}

export function useSalesAnalytics() {
    const { user } = useAuth();
    const tenantId = user?.tenant_id;

    const monthlyRevenue = useQuery({
        queryKey: ['analytics', 'monthly-revenue', tenantId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_monthly_revenue', { p_tenant: tenantId });
            if (error) throw error;
            return data as MonthlyRevenue[];
        },
        enabled: !!tenantId,
    });

    const topProducts = useQuery({
        queryKey: ['analytics', 'top-products', tenantId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_top_products', { p_tenant: tenantId });
            if (error) throw error;
            return data as TopProduct[];
        },
        enabled: !!tenantId,
    });

    const staffSales = useQuery({
        queryKey: ['analytics', 'staff-sales', tenantId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_staff_sales', { p_tenant: tenantId });
            if (error) throw error;
            return data as StaffSales[];
        },
        enabled: !!tenantId,
    });

    const overviewMetrics = useQuery({
        queryKey: ['analytics', 'overview-metrics', tenantId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_sales_overview_metrics', { p_tenant: tenantId });
            if (error) throw error;
            return (data?.[0] || {
                today_revenue: 0,
                week_revenue: 0,
                month_revenue: 0,
                total_transactions: 0
            }) as OverviewMetrics;
        },
        enabled: !!tenantId,
    });

    return {
        monthlyRevenue,
        topProducts,
        staffSales,
        overviewMetrics,
    };
}
