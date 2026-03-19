-- ============================================================================
-- MedFlow v2 — Migration 012: User Profile Fields & Google OAuth Sync
-- ============================================================================

-- 1. Extend public.users with profile columns
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS avatar_url  TEXT,
    ADD COLUMN IF NOT EXISTS provider    TEXT NOT NULL DEFAULT 'email',
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- 2. Create Supabase Storage bucket for avatars (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS — users can manage only their own avatar
DROP POLICY IF EXISTS "avatar_select_own" ON storage.objects;
CREATE POLICY "avatar_select_own" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatar_insert_own" ON storage.objects;
CREATE POLICY "avatar_insert_own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "avatar_update_own" ON storage.objects;
CREATE POLICY "avatar_update_own" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "avatar_delete_own" ON storage.objects;
CREATE POLICY "avatar_delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. Allow users to UPDATE their own profile row
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5. Auto-sync trigger: fires when a new auth.users row is inserted
--    (covers both Email signup and Google OAuth first login)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_provider  TEXT;
    v_name      TEXT;
    v_avatar    TEXT;
    v_role_id   UUID;
BEGIN
    -- Detect auth provider
    v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

    -- Extract metadata (Google fills these automatically)
    v_name   := COALESCE(
                    NEW.raw_user_meta_data->>'full_name',
                    NEW.raw_user_meta_data->>'name',
                    split_part(NEW.email, '@', 1)
                );
    v_avatar := NEW.raw_user_meta_data->>'avatar_url';

    -- Fallback to Viewer role if none specified
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'Viewer' LIMIT 1;

    INSERT INTO public.users (id, email, full_name, avatar_url, provider, role_id, is_active, tenant_id)
    VALUES (
        NEW.id,
        NEW.email,
        v_name,
        v_avatar,
        v_provider,
        v_role_id,
        true,
        '00000000-0000-0000-0000-000000000000'  -- default tenant; update during onboarding
    )
    ON CONFLICT (id) DO UPDATE
        SET
            avatar_url  = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
            full_name   = COALESCE(public.users.full_name, EXCLUDED.full_name),
            updated_at  = NOW();

    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (safe to re-create)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
