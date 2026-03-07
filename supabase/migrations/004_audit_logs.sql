-- migration: 004_audit_logs.sql
-- Description: Adds the audit_logs table to track system activity and assigns permissions.

-- 1. Create the audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    action text NOT NULL, -- e.g., 'UPDATE_ROLE', 'DELETE_USER', 'APPROVE_STOCK_COUNT'
    entity_type text NOT NULL, -- e.g., 'role', 'user', 'inventory_item'
    entity_id text, -- ID of the affected record (text to accommodate uuids or strings)
    details jsonb, -- JSON payload for before/after states or specific changes
    ip_address text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Add the permission key if it doesn't already exist from the initial seed
INSERT INTO public.permissions (key, category, description)
VALUES 
    ('admin.audit.view', 'Admin', 'View system audit logs')
ON CONFLICT (key) DO NOTHING;

-- 3. Assign the permission to the 'Super Admin' role
DO $$
DECLARE
    super_admin_id uuid;
    audit_perm_id uuid;
BEGIN
    SELECT id INTO super_admin_id FROM public.roles WHERE name = 'Super Admin' LIMIT 1;
    SELECT id INTO audit_perm_id FROM public.permissions WHERE key = 'admin.audit.view' LIMIT 1;

    IF super_admin_id IS NOT NULL AND audit_perm_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (super_admin_id, audit_perm_id)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
END $$;

-- 4. Set up Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins with admin.audit.view can select logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        public.user_has_permission('admin.audit.view')
    );

-- Policy: Authenticated users can insert their own actions (system triggers can also bypass RLS)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- 5. Force schema cache refresh (PostgREST)
NOTIFY pgrst, 'reload schema';
