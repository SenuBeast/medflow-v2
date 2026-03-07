-- ═══════════════════════════════════════════════════════════════════════════
-- MedFlow v2 — Migration 010: Multi-Tenant Architecture & RPC Analytics
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert a default tenant for backwards compatibility with existing dev data
INSERT INTO public.tenants (id, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Tenant') 
ON CONFLICT DO NOTHING;

-- 2. Drop any existing FKs on company_id before rename (they may reference users.id, not tenants.id)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_company_id_fkey;
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_company_id_fkey;
ALTER TABLE public.sale_transactions DROP CONSTRAINT IF EXISTS sale_transactions_company_id_fkey;

-- Rename company_id to tenant_id on existing tables
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='company_id') THEN
      ALTER TABLE public.users RENAME COLUMN company_id TO tenant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' AND column_name='company_id') THEN
      ALTER TABLE public.inventory_items RENAME COLUMN company_id TO tenant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sale_transactions' AND column_name='company_id') THEN
      ALTER TABLE public.sale_transactions RENAME COLUMN company_id TO tenant_id;
  END IF;
END $$;

-- 3. Overwrite ALL existing tenant_id values to point to the default tenant
-- (old values were user IDs referencing users table, not tenant IDs)
UPDATE public.users SET tenant_id = '00000000-0000-0000-0000-000000000000';
UPDATE public.inventory_items SET tenant_id = '00000000-0000-0000-0000-000000000000';
UPDATE public.sale_transactions SET tenant_id = '00000000-0000-0000-0000-000000000000';

-- Drop any stale FK constraints then re-add pointing to tenants
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_user_tenant;
ALTER TABLE public.users ADD CONSTRAINT fk_user_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS fk_inv_tenant;
ALTER TABLE public.inventory_items ADD CONSTRAINT fk_inv_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.sale_transactions DROP CONSTRAINT IF EXISTS fk_txn_tenant;
ALTER TABLE public.sale_transactions ADD CONSTRAINT fk_txn_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Make them NOT NULL
ALTER TABLE public.users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.inventory_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.sale_transactions ALTER COLUMN tenant_id SET NOT NULL;

-- 4. Add tenant_id to other business tables and backfill data
-- `stock_counts` was replaced by `stock_count_sessions` in migration 005, but in case legacy rows exist:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
        ALTER TABLE public.stock_counts ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.tenants(id) ON DELETE CASCADE;
        UPDATE public.stock_counts SET tenant_id = '00000000-0000-0000-0000-000000000000';
        ALTER TABLE public.stock_counts ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_select" ON public.stock_counts';
        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.stock_counts';
        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_update" ON public.stock_counts';
        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.stock_counts';
        EXECUTE 'CREATE POLICY "tenant_isolation_select" ON public.stock_counts FOR SELECT USING (tenant_id = NULLIF(current_setting(''request.jwt.claim.tenant_id'', true), '''')::uuid OR tenant_id = (auth.jwt()->>''tenant_id'')::uuid)';
        EXECUTE 'CREATE POLICY "tenant_isolation_insert" ON public.stock_counts FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting(''request.jwt.claim.tenant_id'', true), '''')::uuid OR tenant_id = (auth.jwt()->>''tenant_id'')::uuid)';
        EXECUTE 'CREATE POLICY "tenant_isolation_update" ON public.stock_counts FOR UPDATE USING (tenant_id = NULLIF(current_setting(''request.jwt.claim.tenant_id'', true), '''')::uuid OR tenant_id = (auth.jwt()->>''tenant_id'')::uuid)';
        EXECUTE 'CREATE POLICY "tenant_isolation_delete" ON public.stock_counts FOR DELETE USING (tenant_id = NULLIF(current_setting(''request.jwt.claim.tenant_id'', true), '''')::uuid OR tenant_id = (auth.jwt()->>''tenant_id'')::uuid)';
    END IF;
END $$;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.sale_refunds ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.item_batches ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.sale_items SET tenant_id = COALESCE((SELECT tenant_id FROM public.sale_transactions st WHERE st.id = sale_items.transaction_id), '00000000-0000-0000-0000-000000000000');
UPDATE public.sale_refunds SET tenant_id = COALESCE((SELECT tenant_id FROM public.sale_transactions st WHERE st.id = sale_refunds.transaction_id), '00000000-0000-0000-0000-000000000000');
UPDATE public.item_batches SET tenant_id = COALESCE((SELECT tenant_id FROM public.inventory_items i WHERE i.id = item_batches.item_id), '00000000-0000-0000-0000-000000000000');
UPDATE public.audit_logs SET tenant_id = COALESCE((SELECT tenant_id FROM public.users u WHERE u.id = audit_logs.user_id), '00000000-0000-0000-0000-000000000000');

-- ALTER TABLE public.stock_counts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.sale_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.sale_refunds ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.item_batches ALTER COLUMN tenant_id SET NOT NULL;

-- 5. MANDATORY TENANT ISOLATION POLICIES ──────────────────────────────────
-- First, ensure RLS is enabled on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_batches ENABLE ROW LEVEL SECURITY;

-- Creating standard isolation policy for each table. 
-- In Postgres, if a user has `sales.view` AND `auth.jwt()->>'tenant_id'` matches, they can select.
-- For absolute security, we can just use `auth.jwt() ->> 'tenant_id'` across everything.
-- Here we add it as an overriding check if the user is using the app. We'll implement strict basic isolation.

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['users', 'inventory_items', 'sale_transactions', 'sale_items', 'sale_refunds', 'audit_logs', 'item_batches']) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_update" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.%I', t);
        
        -- Creating standard SELECT isolation
        EXECUTE format('CREATE POLICY "tenant_isolation_select" ON public.%I FOR SELECT USING (tenant_id = NULLIF(current_setting(''request.jwt.claim.tenant_id'', true), '''')::uuid OR tenant_id = (auth.jwt()->>''tenant_id'')::uuid)', t);
        EXECUTE format('CREATE POLICY "tenant_isolation_insert" ON public.%I FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting(''request.jwt.claim.tenant_id'', true), '''')::uuid OR tenant_id = (auth.jwt()->>''tenant_id'')::uuid)', t);
        EXECUTE format('CREATE POLICY "tenant_isolation_update" ON public.%I FOR UPDATE USING (tenant_id = NULLIF(current_setting(''request.jwt.claim.tenant_id'', true), '''')::uuid OR tenant_id = (auth.jwt()->>''tenant_id'')::uuid)', t);
        EXECUTE format('CREATE POLICY "tenant_isolation_delete" ON public.%I FOR DELETE USING (tenant_id = NULLIF(current_setting(''request.jwt.claim.tenant_id'', true), '''')::uuid OR tenant_id = (auth.jwt()->>''tenant_id'')::uuid)', t);
    END LOOP;
END $$;


-- 6. ANALYTICS RPC FUNCTIONS ──────────────────────────────────────────────
-- These handle calculations purely server-side.

-- Top level monthly revenue trend
CREATE OR REPLACE FUNCTION public.get_monthly_revenue(p_tenant UUID)
RETURNS TABLE (
    month TEXT,
    revenue NUMERIC
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        to_char(created_at, 'YYYY-MM') AS month,
        SUM(total) AS revenue
    FROM sale_transactions
    WHERE tenant_id = p_tenant AND status != 'refunded'
    GROUP BY month
    ORDER BY month ASC;
$$;

-- Top selling products
CREATE OR REPLACE FUNCTION public.get_top_products(p_tenant UUID)
RETURNS TABLE (
    product_name TEXT,
    total_sold BIGINT,
    total_revenue NUMERIC
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        si.item_name AS product_name,
        SUM(si.quantity) AS total_sold,
        SUM(si.subtotal) AS total_revenue
    FROM sale_items si
    WHERE si.tenant_id = p_tenant
    GROUP BY si.item_name
    ORDER BY SUM(si.quantity) DESC
    LIMIT 10;
$$;

-- Staff Sales Rankings
CREATE OR REPLACE FUNCTION public.get_staff_sales(p_tenant UUID)
RETURNS TABLE (
    staff_name TEXT,
    revenue NUMERIC,
    transactions_count BIGINT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COALESCE(u.full_name, 'Unknown Staff') AS staff_name,
        SUM(st.total) AS revenue,
        COUNT(st.id) AS transactions_count
    FROM sale_transactions st
    LEFT JOIN users u ON u.id = st.sold_by
    WHERE st.tenant_id = p_tenant AND st.status != 'refunded'
    GROUP BY u.full_name
    ORDER BY SUM(st.total) DESC;
$$;

-- Quick Overview Metrics
CREATE OR REPLACE FUNCTION public.get_sales_overview_metrics(p_tenant UUID)
RETURNS TABLE (
    today_revenue NUMERIC,
    week_revenue NUMERIC,
    month_revenue NUMERIC,
    total_transactions BIGINT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('day', now()) THEN total ELSE 0 END), 0) AS today_revenue,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('week', now()) THEN total ELSE 0 END), 0) AS week_revenue,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', now()) THEN total ELSE 0 END), 0) AS month_revenue,
        COUNT(*) AS total_transactions
    FROM sale_transactions
    WHERE tenant_id = p_tenant AND status != 'refunded';
$$;

-- Drop down to restrict Realtime syncing to admin settings
-- Using publication supabase_realtime
-- Ensure the roles and users table are broadcasting
ALTER PUBLICATION supabase_realtime ADD TABLE public.roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
