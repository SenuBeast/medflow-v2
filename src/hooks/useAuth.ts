import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { hasPermission } from '../lib/permissionUtils';
import type { User } from '../lib/types';

async function fetchUserProfile(userId: string): Promise<User | null> {
    // Step 1: fetch the user row (no joins — avoid PostgREST FK ambiguity)
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();  // maybeSingle avoids 406 when 0 rows returned

    if (userError || !user) return null;

    // Step 2: fetch the role row separately
    let role = null;
    if (user.role_id) {
        const { data: roleData } = await supabase
            .from('roles')
            .select('*')
            .eq('id', user.role_id)
            .maybeSingle();
        role = roleData;
    }

    // Step 3: fetch permissions for this role
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

async function ensureUserRecord(userId: string, email: string): Promise<void> {
    const { data, error } = await supabase
        .from('users').select('id').eq('id', userId).maybeSingle();

    if (error || data) return;

    // Use maybeSingle to avoid 406 if RLS blocks the roles table
    const { data: viewerRole } = await supabase
        .from('roles').select('id').eq('name', 'Viewer').maybeSingle();

    if (viewerRole) {
        await supabase.from('users').insert({
            id: userId,
            email,
            full_name: email.split('@')[0],
            role_id: viewerRole.id,
            is_active: true,
        });
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
        ),
    ]);
}

let _loadingUser = false;

async function initUser(userId: string, email: string) {
    if (_loadingUser) return;

    // Skip if already loaded for this exact user
    const currentUser = useAuthStore.getState().user;
    if (currentUser?.id === userId) return;

    _loadingUser = true;
    useAuthStore.getState().setLoading(true);

    try {
        await withTimeout(ensureUserRecord(userId, email), 10000);
        const profile = await withTimeout(fetchUserProfile(userId), 10000);

        if (profile) {
            useAuthStore.getState().setUser(profile);
            useAuthStore.getState().setPermissions(profile.role?.permissions ?? []);
        } else {
            // Profile row missing but auth session valid — mark initialized without reset
            // Resetting here wipes 2FA flag → triggers signOut → SIGNED_IN loops infinitely
            console.warn('[AUTH] Profile not found for user:', userId);
        }
    } catch (err: unknown) {
        // Log the error but do NOT reset — resetting causes the sign-out loop
        console.error('[AUTH] Failed to initialize user profile:', err instanceof Error ? err.message : String(err));
    } finally {
        useAuthStore.getState().setLoading(false);
        useAuthStore.getState().setInitialized(true);
        _loadingUser = false;
    }
}

let _listenerStarted = false;

function startGlobalAuthListener() {
    if (_listenerStarted) return;
    _listenerStarted = true;

    // 1. Boot Sequence: check if we have a trusted (2FA-verified) session or a dangling unverified one
    supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error || !session?.user) {
            // No session: reset to clean state
            useAuthStore.getState().reset();
        } else if (localStorage.getItem('_mf2a') === '1') {
            // Session exists AND user completed 2FA: restore fully
            initUser(session.user.id, session.user.email ?? '').then(() => {
                useAuthStore.getState().setTwoFactorVerified(true);
            });
        } else {
            // Dangling unverified session — load the profile so the store has the user,
            // but keep isTwoFactorVerified = false. Route guards block protected pages.
            // DO NOT call signOut() here — it destroys the session token, causes all
            // Supabase queries to fail (RLS sees auth.uid()=null), and creates an
            // infinite sign-out loop that breaks the Google OAuth + OTP flow.
            initUser(session.user.id, session.user.email ?? '');
        }
    });

    // 2. Subsequent Auth Events (after the user actively signs in/out)
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            useAuthStore.getState().reset();
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            if (session?.user) {
                initUser(session.user.id, session.user.email ?? '');
            }
        }
    });
}

// Start listener immediately upon file parse
startGlobalAuthListener();

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
    const { user, permissions, isLoading, isInitialized } = useAuthStore();

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
        await supabase.auth.signOut();
        useAuthStore.getState().reset();
    };

    return { user, permissions, isLoading, isInitialized, hasPermission, signIn, signInWithGoogle, signOut };
}
