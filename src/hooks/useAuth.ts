import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { hasPermission, useHasPermission } from '../lib/permissionUtils';
import { getMfaAssuranceState } from '../lib/mfa';
import type { User } from '../lib/types';

async function fetchUserProfile(userId: string): Promise<User | null> {
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (userError || !user) return null;

    let role = null;
    if (user.role_id) {
        const { data: roleData } = await supabase
            .from('roles')
            .select('*')
            .eq('id', user.role_id)
            .maybeSingle();
        role = roleData;
    }

    let permissions: unknown[] = [];
    if (user.role_id) {
        const { data: rpData } = await supabase
            .from('role_permissions')
            .select('permission:permissions(*)')
            .eq('role_id', user.role_id);

        if (rpData) {
            permissions = rpData.map((rp: { permission: unknown }) => rp.permission).filter(Boolean);
        }
    }

    return { ...user, role: { ...role, permissions } } as User;
}

async function ensureUserRecord(
    userId: string,
    email: string,
    userMetadata?: Record<string, unknown>,
    appMetadata?: Record<string, unknown>
): Promise<void> {
    const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

    const providersArray = (appMetadata?.providers as string[]) ?? [];
    const isGoogleLinked = providersArray.includes('google');

    const provider = isGoogleLinked && providersArray.includes('email')
        ? 'email+google'
        : isGoogleLinked
            ? 'google'
            : 'email';

    const googleName = (userMetadata?.full_name ?? userMetadata?.name ?? null) as string | null;
    const googleAvatar = (userMetadata?.avatar_url ?? null) as string | null;

    if (error || !data) {
        const { data: viewerRole } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'Viewer')
            .maybeSingle();

        if (viewerRole) {
            await supabase.from('users').insert({
                id: userId,
                email,
                full_name: googleName ?? email.split('@')[0],
                avatar_url: googleAvatar,
                provider,
                role_id: viewerRole.id,
                is_active: true,
            });
        }
        return;
    }

    if (isGoogleLinked) {
        await supabase
            .from('users')
            .update({
                provider,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
    ]);
}

let loadingUser = false;

async function initUser(
    userId: string,
    email: string,
    forceRefresh = false,
    userMetadata?: Record<string, unknown>,
    appMetadata?: Record<string, unknown>,
    deferCompletion = false
) {
    if (loadingUser) return;

    const currentUser = useAuthStore.getState().user;
    if (!forceRefresh && currentUser?.id === userId) return;

    loadingUser = true;
    if (!forceRefresh) useAuthStore.getState().setLoading(true);

    try {
        await withTimeout(ensureUserRecord(userId, email, userMetadata, appMetadata), 10000);
        const profile = await withTimeout(fetchUserProfile(userId), 10000);

        if (profile) {
            useAuthStore.getState().setUser(profile);
            useAuthStore.getState().setPermissions(profile.role?.permissions ?? []);
        } else {
            console.warn('[AUTH] Profile not found for user:', userId);
        }
    } catch (err: unknown) {
        console.error('[AUTH] Failed to initialize user profile:', err instanceof Error ? err.message : String(err));
    } finally {
        if (!deferCompletion) {
            useAuthStore.getState().setLoading(false);
            useAuthStore.getState().setInitialized(true);
        }
        loadingUser = false;
    }
}

async function syncTwoFactorState() {
    try {
        const assurance = await getMfaAssuranceState();
        useAuthStore.getState().setTwoFactorVerified(!assurance.requiresChallenge);
    } catch (err: unknown) {
        console.error('[AUTH] Failed to resolve MFA assurance level:', err instanceof Error ? err.message : String(err));
        useAuthStore.getState().setTwoFactorVerified(false);
    }
}

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function setupRealtimeSync(userId: string, email: string) {
    if (realtimeChannel) return;

    realtimeChannel = supabase.channel('admin_sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, () => {
            void initUser(userId, email, true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, () => {
            void initUser(userId, email, true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, () => {
            void initUser(userId, email, true);
        })
        .subscribe();
}

function cleanupRealtimeSync() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

let listenerStarted = false;

function startGlobalAuthListener() {
    if (listenerStarted) return;
    listenerStarted = true;

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
        if (error || !session?.user) {
            cleanupRealtimeSync();
            useAuthStore.getState().reset();
            return;
        }

        await initUser(
            session.user.id,
            session.user.email ?? '',
            false,
            session.user.user_metadata,
            session.user.app_metadata,
            true
        );
        setupRealtimeSync(session.user.id, session.user.email ?? '');
        await syncTwoFactorState();
        useAuthStore.getState().setLoading(false);
        useAuthStore.getState().setInitialized(true);
    });

    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            cleanupRealtimeSync();
            useAuthStore.getState().reset();
            return;
        }

        if (['SIGNED_IN', 'USER_UPDATED', 'IDENTITY_LINKED', 'TOKEN_REFRESHED', 'MFA_CHALLENGE_VERIFIED'].includes(event as string) && session?.user) {
            void initUser(
                session.user.id,
                session.user.email ?? '',
                true,
                session.user.user_metadata,
                session.user.app_metadata
            );
            setupRealtimeSync(session.user.id, session.user.email ?? '');
            void syncTwoFactorState();
        }
    });
}

startGlobalAuthListener();

export function useAuth() {
    const { user, permissions, isLoading, isInitialized, isTwoFactorVerified } = useAuthStore();

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) throw error;
    };

    const signOut = async () => {
        cleanupRealtimeSync();
        await supabase.auth.signOut();
        useAuthStore.getState().reset();
    };

    const linkGoogleAccount = async () => {
        const { error } = await supabase.auth.linkIdentity({ provider: 'google' });
        if (error) throw error;
    };

    const updateProfile = async (data: { full_name?: string; avatar_url?: string }) => {
        const { user: currentUser } = useAuthStore.getState();
        if (!currentUser) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('users')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id);
        if (error) throw error;

        useAuthStore.getState().setUser({ ...currentUser, ...data });
    };

    const refreshMfaState = async () => {
        await syncTwoFactorState();
    };

    return {
        user,
        permissions,
        isLoading,
        isInitialized,
        isTwoFactorVerified,
        hasPermission,
        useHasPermission,
        signIn,
        signInWithGoogle,
        signOut,
        linkGoogleAccount,
        updateProfile,
        refreshMfaState,
    };
}
