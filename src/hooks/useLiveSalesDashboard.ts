import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { SaleTransaction } from '../lib/types';
import { useQueryClient } from '@tanstack/react-query';

export interface DashboardMetrics {
    revenue: number;
    transactions_count: number;
    average_order_value: number;
    items_sold: number;
}

export interface HourlySales {
    hour_of_day: string;
    revenue: number;
}

export function useLiveSalesDashboard() {
    const { user } = useAuthStore();
    const tenantId = user?.tenant_id;
    const queryClient = useQueryClient();

    const [metrics, setMetrics] = useState<DashboardMetrics>({
        revenue: 0,
        transactions_count: 0,
        average_order_value: 0,
        items_sold: 0,
    });
    const [chartData, setChartData] = useState<HourlySales[]>([]);
    const [recentSales, setRecentSales] = useState<SaleTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchInitialData = useCallback(async () => {
        if (!tenantId) return;
        setIsLoading(true);
        try {
            // 1. Fetch Today's Metrics
            const { data: metricsData, error: metricsErr } = await supabase
                .rpc('get_today_sales_metrics', { p_tenant_id: tenantId });

            if (!metricsErr && metricsData && metricsData.length > 0) {
                setMetrics(metricsData[0]);
            }

            // 2. Fetch Hourly Chart Data
            const { data: chartFetchData, error: chartErr } = await supabase
                .rpc('get_hourly_sales', { p_tenant_id: tenantId });

            if (!chartErr && chartFetchData) {
                setChartData(chartFetchData);
            }

            // 3. Fetch recent sales feed (limit 15 for sidebar)
            const { data: salesData, error: salesErr } = await supabase
                .from('sale_transactions')
                .select(`
                    *,
                    seller:users!sale_transactions_sold_by_fkey(id, full_name, email),
                    items:sale_items(*)
                `)
                .eq('tenant_id', tenantId)
                .neq('status', 'refunded')
                .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
                .order('created_at', { ascending: false })
                .limit(15);

            if (!salesErr && salesData) {
                setRecentSales(salesData as SaleTransaction[]);
            }

        } catch (error) {
            console.error('Failed to fetch initial dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [tenantId]);

    // Setup Realtime Subscription
    useEffect(() => {
        if (!tenantId) return;

        // Perform initial fetch
        fetchInitialData();

        // Establish connection to listen for new sales in this tenant
        const channel = supabase
            .channel(`dashboard-sales-${tenantId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'sale_transactions',
                    filter: `tenant_id=eq.${tenantId}`
                },
                async (payload) => {
                    const newTx = payload.new as SaleTransaction;
                    // Ignore refunded or suspended transactions if any
                    if (newTx.status !== 'completed') return;

                    // We need full details including items and seller for the UI feed
                    // So we do a quick point-fetch for the new record
                    const { data: fullTx } = await supabase
                        .from('sale_transactions')
                        .select(`
                            *,
                            seller:users!sale_transactions_sold_by_fkey(id, full_name, email),
                            items:sale_items(*)
                        `)
                        .eq('id', newTx.id)
                        .single();

                    if (!fullTx) return;

                    // 1. Optimistically append to recent sales
                    setRecentSales(prev => [fullTx as SaleTransaction, ...prev].slice(0, 15));

                    // 2. Optimistically update metrics
                    setMetrics(prev => {
                        const newCount = prev.transactions_count + 1;
                        const newRev = prev.revenue + fullTx.total;
                        return {
                            ...prev,
                            revenue: newRev,
                            transactions_count: newCount,
                            average_order_value: newRev / newCount,
                            // Note: for exact item count, we sum the items.
                            items_sold: prev.items_sold + (fullTx.items?.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0) || 0)
                        };
                    });

                    // 3. Optimistically update chart data
                    setChartData(prev => {
                        const txHour = new Date(fullTx.created_at).getHours().toString().padStart(2, '0') + ':00';
                        return prev.map(bar =>
                            bar.hour_of_day === txHour
                                ? { ...bar, revenue: Number(bar.revenue) + fullTx.total }
                                : bar
                        );
                    });

                    // Background invalidate related queries for consistency
                    queryClient.invalidateQueries({ queryKey: ['analytics', 'top-products'] });
                    queryClient.invalidateQueries({ queryKey: ['inventory'] });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime connected: Sales Dashboard');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId, fetchInitialData, queryClient]);

    return {
        metrics,
        chartData,
        recentSales,
        isLoading,
        refresh: fetchInitialData
    };
}
