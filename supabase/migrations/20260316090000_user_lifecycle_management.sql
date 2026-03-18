-- ============================================================================
-- MedFlow v2 - Migration 20260316090000
-- User lifecycle management: deactivate, reactivate, and permanent deletion
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Extend users + audit logs
-- ----------------------------------------------------------------------------

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS actor_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_deactivated_at ON public.users(deactivated_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON public.audit_logs(target_user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2) Internal deleted-user role
-- ----------------------------------------------------------------------------

INSERT INTO public.roles (name, description, is_system)
VALUES ('Deleted User', 'Internal system role assigned to scrubbed deleted accounts.', true)
ON CONFLICT (name) DO UPDATE
SET
    description = EXCLUDED.description,
    is_system = true;

-- ----------------------------------------------------------------------------
-- 3) Helper functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_has_permission_for_user(
    p_user_id UUID,
    p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.role_permissions rp ON rp.role_id = u.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE u.id = p_user_id
          AND u.deleted_at IS NULL
          AND p.key = p_permission_key
    );
$$;

CREATE OR REPLACE FUNCTION public.insert_user_lifecycle_audit_log(
    p_actor_admin_id UUID,
    p_target_user_id UUID,
    p_action TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH actor_user AS (
        SELECT tenant_id
        FROM public.users
        WHERE id = p_actor_admin_id
        LIMIT 1
    ),
    target_user AS (
        SELECT tenant_id
        FROM public.users
        WHERE id = p_target_user_id
        LIMIT 1
    )
    INSERT INTO public.audit_logs (
        user_id,
        actor_admin_id,
        target_user_id,
        action,
        entity_type,
        entity_id,
        reason,
        details,
        tenant_id
    )
    SELECT
        p_actor_admin_id,
        p_actor_admin_id,
        p_target_user_id,
        p_action,
        'user',
        p_target_user_id::text,
        p_reason,
        jsonb_build_object(
            'target_user_id', p_target_user_id,
            'reason', p_reason
        ),
        COALESCE(
            (SELECT tenant_id FROM actor_user),
            (SELECT tenant_id FROM target_user),
            public.current_tenant_id()
        );
$$;

CREATE OR REPLACE FUNCTION public.get_user_delete_guardrails(
    p_actor_admin_id UUID,
    p_target_user_id UUID
)
RETURNS TABLE (
    allowed BOOLEAN,
    error_code TEXT,
    message TEXT,
    confirmation_value TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor public.users%ROWTYPE;
    v_target public.users%ROWTYPE;
    v_target_role_name TEXT;
    v_admin_count BIGINT;
BEGIN
    SELECT *
    INTO v_actor
    FROM public.users
    WHERE id = p_actor_admin_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'ACTOR_NOT_FOUND', 'This account cannot be deleted.', ''::TEXT;
        RETURN;
    END IF;

    IF NOT public.user_has_permission_for_user(p_actor_admin_id, 'admin.users.deactivate') THEN
        RETURN QUERY SELECT false, 'INSUFFICIENT_PERMISSION', 'This account cannot be deleted.', ''::TEXT;
        RETURN;
    END IF;

    SELECT u.*, r.name
    INTO v_target, v_target_role_name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = p_target_user_id
      AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'TARGET_NOT_FOUND', 'This account cannot be deleted.', ''::TEXT;
        RETURN;
    END IF;

    IF v_actor.tenant_id IS DISTINCT FROM v_target.tenant_id THEN
        RETURN QUERY SELECT false, 'CROSS_TENANT', 'This account cannot be deleted.', ''::TEXT;
        RETURN;
    END IF;

    IF p_actor_admin_id = p_target_user_id THEN
        RETURN QUERY SELECT false, 'CURRENTLY_LOGGED_IN', 'This account cannot be deleted.', COALESCE(NULLIF(v_target.full_name, ''), v_target.email);
        RETURN;
    END IF;

    IF v_target_role_name = 'Super Admin' THEN
        RETURN QUERY SELECT false, 'SUPER_ADMIN', 'This account cannot be deleted.', COALESCE(NULLIF(v_target.full_name, ''), v_target.email);
        RETURN;
    END IF;

    SELECT COUNT(DISTINCT u.id)
    INTO v_admin_count
    FROM public.users u
    JOIN public.role_permissions rp ON rp.role_id = u.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE u.deleted_at IS NULL
      AND u.tenant_id = v_target.tenant_id
      AND p.key = 'admin.access_panel';

    IF public.user_has_permission_for_user(p_target_user_id, 'admin.access_panel') AND COALESCE(v_admin_count, 0) <= 1 THEN
        RETURN QUERY SELECT false, 'LAST_ADMIN', 'This account cannot be deleted.', COALESCE(NULLIF(v_target.full_name, ''), v_target.email);
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        true,
        NULL::TEXT,
        NULL::TEXT,
        COALESCE(NULLIF(v_target.full_name, ''), v_target.email);
END;
$$;

-- ----------------------------------------------------------------------------
-- 4) Authenticated admin RPCs for deactivate/reactivate
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_deactivate_user(
    p_target_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor public.users%ROWTYPE;
    v_target public.users%ROWTYPE;
    v_result public.users%ROWTYPE;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT *
    INTO v_actor
    FROM public.users
    WHERE id = v_actor_id
      AND deleted_at IS NULL;

    IF NOT FOUND OR NOT public.user_has_permission_for_user(v_actor_id, 'admin.users.deactivate') THEN
        RAISE EXCEPTION 'Not authorized to deactivate users';
    END IF;

    SELECT *
    INTO v_target
    FROM public.users
    WHERE id = p_target_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_actor.tenant_id IS DISTINCT FROM v_target.tenant_id THEN
        RAISE EXCEPTION 'Cross-tenant operation denied';
    END IF;

    UPDATE public.users
    SET
        is_active = false,
        deactivated_at = now(),
        deactivated_by = v_actor_id,
        updated_at = now()
    WHERE id = p_target_user_id
    RETURNING *
    INTO v_result;

    PERFORM public.insert_user_lifecycle_audit_log(
        v_actor_id,
        p_target_user_id,
        'USER_DEACTIVATED',
        p_reason
    );

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reactivate_user(
    p_target_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor public.users%ROWTYPE;
    v_target public.users%ROWTYPE;
    v_result public.users%ROWTYPE;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT *
    INTO v_actor
    FROM public.users
    WHERE id = v_actor_id
      AND deleted_at IS NULL;

    IF NOT FOUND OR NOT public.user_has_permission_for_user(v_actor_id, 'admin.users.deactivate') THEN
        RAISE EXCEPTION 'Not authorized to reactivate users';
    END IF;

    SELECT *
    INTO v_target
    FROM public.users
    WHERE id = p_target_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_actor.tenant_id IS DISTINCT FROM v_target.tenant_id THEN
        RAISE EXCEPTION 'Cross-tenant operation denied';
    END IF;

    UPDATE public.users
    SET
        is_active = true,
        deactivated_at = NULL,
        deactivated_by = NULL,
        updated_at = now()
    WHERE id = p_target_user_id
    RETURNING *
    INTO v_result;

    PERFORM public.insert_user_lifecycle_audit_log(
        v_actor_id,
        p_target_user_id,
        'USER_REACTIVATED',
        p_reason
    );

    RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5) Service-side delete finalization
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_finalize_user_delete(
    p_actor_admin_id UUID,
    p_target_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_guard RECORD;
    v_deleted_role_id UUID;
    v_scrub_email TEXT;
BEGIN
    SELECT *
    INTO v_guard
    FROM public.get_user_delete_guardrails(p_actor_admin_id, p_target_user_id);

    IF NOT COALESCE(v_guard.allowed, false) THEN
        RAISE EXCEPTION '%', COALESCE(v_guard.message, 'This account cannot be deleted.');
    END IF;

    SELECT id
    INTO v_deleted_role_id
    FROM public.roles
    WHERE name = 'Deleted User'
    LIMIT 1;

    IF v_deleted_role_id IS NULL THEN
        RAISE EXCEPTION 'Deleted User role is missing';
    END IF;

    v_scrub_email := 'deleted_user+' || replace(p_target_user_id::text, '-', '') || '@deleted.medflow.local';

    UPDATE public.users
    SET
        email = v_scrub_email,
        full_name = 'deleted_user',
        avatar_url = NULL,
        provider = 'email',
        role_id = v_deleted_role_id,
        is_active = false,
        deactivated_at = COALESCE(deactivated_at, now()),
        deactivated_by = COALESCE(deactivated_by, p_actor_admin_id),
        deleted_at = now(),
        deleted_by = p_actor_admin_id,
        updated_at = now()
    WHERE id = p_target_user_id
      AND deleted_at IS NULL;

    IF to_regclass('public.otp_codes') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.otp_codes WHERE user_id = $1'
        USING p_target_user_id;
    END IF;

    PERFORM public.insert_user_lifecycle_audit_log(
        p_actor_admin_id,
        p_target_user_id,
        'USER_DELETED',
        p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_user_id', p_target_user_id,
        'confirmation_value', v_guard.confirmation_value
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
