-- ============================================================================
-- MedFlow v2 — Migration 011: Sales Dashboard Realtime & RPC Analytics
-- ============================================================================

-- 1. Enable REPLICA IDENTITY FULL for targeted tables so old records are fully broadcasted.
ALTER TABLE public.sale_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.sale_items REPLICA IDENTITY FULL;

-- 2. Add tables to the supabase_realtime publication to enable WebSocket broadcasting.
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;

-- 3. Analytics RPC Functions

-- Hourly sales aggregation for the line chart (Today's data)
DROP FUNCTION IF EXISTS public.get_hourly_sales(UUID, DATE);

CREATE OR REPLACE FUNCTION public.get_hourly_sales(
    p_tenant_id UUID,
    p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    hour_of_day TEXT,
    revenue NUMERIC
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
    WITH hours AS (
        SELECT to_char(generate_series(
            p_target_date::timestamp, 
            p_target_date::timestamp + interval '23 hours', 
            interval '1 hour'
        ), 'HH24:00') AS h
    )
    SELECT
        h.h AS hour_of_day,
        COALESCE(SUM(st.total), 0) AS revenue
    FROM hours h
    LEFT JOIN sale_transactions st 
        ON to_char(st.created_at, 'HH24:00') = h.h
        AND st.tenant_id = p_tenant_id 
        AND st.status != 'refunded'
        AND st.created_at >= p_target_date
        AND st.created_at < p_target_date + interval '1 day'
    GROUP BY h.h
    ORDER BY h.h;
$$;


-- Today's specific quick metrics to avoid calling get_sales_overview_metrics which aggregates week/month too.
DROP FUNCTION IF EXISTS public.get_today_sales_metrics(UUID);

CREATE OR REPLACE FUNCTION public.get_today_sales_metrics(
    p_tenant_id UUID
)
RETURNS TABLE (
    revenue NUMERIC,
    transactions_count BIGINT,
    average_order_value NUMERIC,
    items_sold BIGINT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
    WITH today_sales AS (
        SELECT id, total
        FROM sale_transactions
        WHERE tenant_id = p_tenant_id 
          AND status != 'refunded'
          AND created_at >= date_trunc('day', now())
    )
    SELECT
        COALESCE(SUM(ts.total), 0) AS revenue,
        COUNT(ts.id) AS transactions_count,
        CASE 
            WHEN COUNT(ts.id) > 0 THEN ROUND((SUM(ts.total) / COUNT(ts.id))::NUMERIC, 2)
            ELSE 0 
        END AS average_order_value,
        COALESCE((
            SELECT SUM(si.quantity)
            FROM sale_items si
            JOIN today_sales ts2 ON si.transaction_id = ts2.id
        ), 0) AS items_sold
    FROM today_sales ts;
$$;
