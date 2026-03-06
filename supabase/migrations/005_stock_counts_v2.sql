-- ═══════════════════════════════════════════════════════════════════════════
-- MedFlow v2 — Migration 005: Advanced Stock Counts
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Drop existing placeholder table (We assume no production data yet or data loss is acceptable for this MVP upgrade)
DROP TABLE IF EXISTS public.stock_counts CASCADE;

-- 2. Create Stock Count Sessions table
CREATE TABLE public.stock_count_sessions (
    id uuid primary key default uuid_generate_v4(),
    type text not null check (type in ('full', 'partial', 'cycle')),
    status text not null default 'draft' check (status in ('draft', 'in_progress', 'submitted', 'approved', 'rejected')),
    notes text,
    created_by uuid not null references public.users(id) on delete restrict,
    approved_by uuid references public.users(id) on delete restrict,
    approved_at timestamptz,
    company_id uuid, -- For strict multi-tenant filtering
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Create Stock Count Items table
-- Links a count session to a specific inventory batch
CREATE TABLE public.stock_count_items (
    id uuid primary key default uuid_generate_v4(),
    session_id uuid not null references public.stock_count_sessions(id) on delete cascade,
    item_id uuid not null references public.inventory_items(id) on delete restrict,
    batch_id uuid not null references public.item_batches(id) on delete restrict,
    system_quantity integer not null, -- Snapshot of quantity at the time of counting
    physical_count integer, -- Nullable until counted
    variance integer GENERATED ALWAYS AS (physical_count - system_quantity) STORED,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    UNIQUE(session_id, batch_id) -- A batch should only be counted once per session
);

-- 4. Create Stock Count Audit Logs table
CREATE TABLE public.stock_count_audit_logs (
    id uuid primary key default uuid_generate_v4(),
    session_id uuid not null references public.stock_count_sessions(id) on delete cascade,
    action text not null, -- e.g., 'created', 'started', 'item_counted', 'submitted', 'approved', 'rejected'
    performed_by uuid not null references public.users(id) on delete restrict,
    details jsonb, -- Flexible schema for storing what exactly changed
    created_at timestamptz not null default now()
);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_count_sessions_status ON public.stock_count_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stock_count_sessions_company ON public.stock_count_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_session ON public.stock_count_items(session_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_batch ON public.stock_count_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_audit_logs_session ON public.stock_count_audit_logs(session_id);

-- 6. Enable RLS
ALTER TABLE public.stock_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- We rely on the `user_has_permission()` helper defined in '003_rls.sql'

-- SESSIONS
CREATE POLICY "Users can view stock count sessions in their company"
    ON public.stock_count_sessions FOR SELECT
    USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) 
        OR current_user_is_admin()
    );

CREATE POLICY "Users with perform permission can create sessions"
    ON public.stock_count_sessions FOR INSERT
    WITH CHECK (
        user_has_permission('stock_counts.perform') AND
        (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
    );

CREATE POLICY "Users with perform or approve permission can update sessions"
    ON public.stock_count_sessions FOR UPDATE
    USING (
        (user_has_permission('stock_counts.perform') OR user_has_permission('stock_counts.approve')) AND
        (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
    );

CREATE POLICY "Users with perform permission can delete draft sessions"
    ON public.stock_count_sessions FOR DELETE
    USING (
        user_has_permission('stock_counts.perform') AND status = 'draft' AND
        (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
    );

-- ITEMS
CREATE POLICY "Users can view stock count items for their company"
    ON public.stock_count_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = session_id AND (s.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
        )
    );

CREATE POLICY "Users with perform permission can insert stock count items"
    ON public.stock_count_items FOR INSERT
    WITH CHECK (
        user_has_permission('stock_counts.perform') AND
        EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = session_id AND s.status IN ('draft', 'in_progress') AND (s.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
        )
    );

CREATE POLICY "Users with perform permission can update stock count items"
    ON public.stock_count_items FOR UPDATE
    USING (
        user_has_permission('stock_counts.perform') AND
        EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = session_id AND s.status IN ('draft', 'in_progress') AND (s.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
        )
    );

CREATE POLICY "Users with perform permission can delete stock count items"
    ON public.stock_count_items FOR DELETE
    USING (
        user_has_permission('stock_counts.perform') AND
        EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = session_id AND s.status IN ('draft', 'in_progress') AND (s.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
        )
    );

-- AUDIT LOGS
CREATE POLICY "Users can view audit logs for their company's sessions"
    ON public.stock_count_audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = session_id AND (s.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
        )
    );

CREATE POLICY "System can insert audit logs"
    ON public.stock_count_audit_logs FOR INSERT
    WITH CHECK (
        -- Assuming app layer will insert logs during actions
        EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = session_id AND (s.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
        )
    );
