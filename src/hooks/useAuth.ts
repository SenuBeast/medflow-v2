import { queryClient } from '../lib/queryClient';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { hasPermission, useHasPermission } from '../lib/permissionUtils';
import { getMfaAssuranceState } from '../lib/mfa';
import type { User } from '../lib/types';

const DEACTIVATED_ACCOUNT_NOTICE = {
    title: 'Account Deactivated',
    message:
        'Your MedFlow account has been deactivated by the administrator.\nPlease contact your administrator for assistance.',
};

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
        .select('id, avatar_url')
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
        const updatePayload: Record<string, unknown> = {
            provider,
            updated_at: new Date().toISOString(),
        };

        if (googleAvatar) {
            const currentAvatar = (data as { id: string; avatar_url?: string | null }).avatar_url;
            // Only overwrite avatar if it's absent or still points to Google's CDN.
            // This preserves any custom photo the user has uploaded.
            const isGoogleHostedOrMissing = !currentAvatar || currentAvatar.includes('googleusercontent.com');

            if (isGoogleHostedOrMissing) {
                updatePayload.avatar_url = googleAvatar;
            }
        }

        await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', userId);
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
    ]);
}

let blockedAccountSignOutInProgress = false;
let activeUserLoadPromise: Promise<boolean> | null = null;

async function signOutBlockedAccount() {
    if (blockedAccountSignOutInProgress) return;

    blockedAccountSignOutInProgress = true;
    cleanupRealtimeSync();
    useAuthStore.getState().setDeactivatedAccountNotice(DEACTIVATED_ACCOUNT_NOTICE);

    try {
        await supabase.auth.signOut();
    } catch (err: unknown) {
        console.error('[AUTH] Failed to sign out blocked account:', err instanceof Error ? err.message : String(err));
    } finally {
        useAuthStore.getState().reset(true);
        blockedAccountSignOutInProgress = false;
    }
}

async function initUser(
    userId: string,
    email: string,
    forceRefresh = false,
    userMetadata?: Record<string, unknown>,
    appMetadata?: Record<string, unknown>,
    deferCompletion = false
) : Promise<boolean> {
    const currentUser = useAuthStore.getState().user;
    if (!forceRefresh && currentUser?.id === userId) return true;

    if (activeUserLoadPromise) {
        return activeUserLoadPromise;
    }

    activeUserLoadPromise = (async () => {
        const shouldShowLoading = !forceRefresh || !currentUser || currentUser.id !== userId;
        if (shouldShowLoading) useAuthStore.getState().setLoading(true);
        let shouldSkipCompletion = false;

        try {
            await withTimeout(ensureUserRecord(userId, email, userMetadata, appMetadata), 10000);
            const profile = await withTimeout(fetchUserProfile(userId), 10000);

            if (profile?.deleted_at || profile?.is_active === false) {
                shouldSkipCompletion = true;
                await signOutBlockedAccount();
                return false;
            }

            if (profile) {
                useAuthStore.getState().setUser(profile);
                useAuthStore.getState().setPermissions(profile.role?.permissions ?? []);
                useAuthStore.getState().clearDeactivatedAccountNotice();
                return true;
            }

            console.warn('[AUTH] Profile not found for user:', userId);
            return false;
        } catch (err: unknown) {
            console.error('[AUTH] Failed to initialize user profile:', err instanceof Error ? err.message : String(err));
            return false;
        } finally {
            if (!deferCompletion && !shouldSkipCompletion) {
                useAuthStore.getState().setLoading(false);
                useAuthStore.getState().setInitialized(true);
            }
            activeUserLoadPromise = null;
        }
    })();

    return activeUserLoadPromise;
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
let authBootstrapCompleted = false;

function resetToSignedOutState(
    preserveDeactivatedNotice = Boolean(useAuthStore.getState().deactivatedAccountNotice)
) {
    cleanupRealtimeSync();
    useAuthStore.getState().reset(preserveDeactivatedNotice);
}

export async function rehydrateAuthFromSession(): Promise<boolean> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) {
        return false;
    }

    const initialized = await initUser(
        session.user.id,
        session.user.email ?? '',
        false,
        session.user.user_metadata,
        session.user.app_metadata,
        false
    );

    if (!initialized) {
        return false;
    }

    setupRealtimeSync(session.user.id, session.user.email ?? '');
    await syncTwoFactorState();
    authBootstrapCompleted = true;
    return true;
}

function startGlobalAuthListener() {
    if (listenerStarted) return;
    listenerStarted = true;

    void rehydrateAuthFromSession()
        .then((ok) => {
            if (!ok) {
                authBootstrapCompleted = true;
                resetToSignedOutState();
            }
        })
        .catch((err: unknown) => {
            console.error('[AUTH] Failed to resolve initial session:', err instanceof Error ? err.message : String(err));
            authBootstrapCompleted = true;
            resetToSignedOutState();
        });

    supabase.auth.onAuthStateChange((event, session) => {
        // During bootstrap, ignore event churn and rely on getSession hydration.
        if (!authBootstrapCompleted) {
            return;
        }

        if (event === 'SIGNED_OUT') {
            // Guard against transient SIGNED_OUT during token churn.
            void supabase.auth.getSession()
                .then(({ data: { session: latestSession } }) => {
                    if (latestSession?.user) {
                        const currentUserId = useAuthStore.getState().user?.id;
                        void initUser(
                            latestSession.user.id,
                            latestSession.user.email ?? '',
                            currentUserId === latestSession.user.id,
                            latestSession.user.user_metadata,
                            latestSession.user.app_metadata
                        );
                        setupRealtimeSync(latestSession.user.id, latestSession.user.email ?? '');
                        void syncTwoFactorState();
                        return;
                    }

                    resetToSignedOutState();
                })
                .catch(() => {
                    resetToSignedOutState();
                });
            return;
        }

        if (event === 'INITIAL_SESSION') {
            return;
        }

        if (['SIGNED_IN', 'USER_UPDATED', 'IDENTITY_LINKED', 'TOKEN_REFRESHED', 'MFA_CHALLENGE_VERIFIED'].includes(event as string) && session?.user) {
            const currentUserId = useAuthStore.getState().user?.id;
            void initUser(
                session.user.id,
                session.user.email ?? '',
                currentUserId === session.user.id,
                session.user.user_metadata,
                session.user.app_metadata
            );
            setupRealtimeSync(session.user.id, session.user.email ?? '');
            void syncTwoFactorState();
            authBootstrapCompleted = true;
        }
    });
}

startGlobalAuthListener();

export function useAuth() {
    const {
        user,
        permissions,
        isLoading,
        isInitialized,
        isTwoFactorVerified,
    } = useAuthStore();

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const initialized = await rehydrateAuthFromSession();
        if (!initialized) {
            if (useAuthStore.getState().deactivatedAccountNotice) {
                throw new Error('ACCOUNT_DEACTIVATED');
            }

            throw new Error('Failed to initialize authenticated session.');
        }
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
        useAuthStore.getState().clearDeactivatedAccountNotice();
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

        // Update local auth state immediately
        useAuthStore.getState().setUser({ ...currentUser, ...data });

        // Invalidate the admin users list so the admin tab reflects changes without reload
        queryClient.invalidateQueries({ queryKey: ['users'] });
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
