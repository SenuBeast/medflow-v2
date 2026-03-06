import { create } from 'zustand';
import type { User, Permission } from '../lib/types';

interface AuthState {
    user: User | null;
    permissions: Permission[];
    isLoading: boolean;
    isInitialized: boolean;
    isTwoFactorVerified: boolean;
    setUser: (user: User | null) => void;
    setPermissions: (permissions: Permission[]) => void;
    setLoading: (loading: boolean) => void;
    setInitialized: (initialized: boolean) => void;
    setTwoFactorVerified: (verified: boolean) => void;
    reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    permissions: [],
    isLoading: true,
    isInitialized: false,
    isTwoFactorVerified: false,

    setUser: (user) => set({ user }),
    setPermissions: (permissions) => set({ permissions }),
    setLoading: (isLoading) => set({ isLoading }),
    setInitialized: (isInitialized) => set({ isInitialized }),
    setTwoFactorVerified: (isTwoFactorVerified) => {
        console.log('[AuthStore] isTwoFactorVerified changed to:', isTwoFactorVerified);
        if (isTwoFactorVerified) {
            localStorage.setItem('_mf2a', '1');
        } else {
            localStorage.removeItem('_mf2a');
        }
        set({ isTwoFactorVerified });
    },

    reset: () => {
        console.log('[AuthStore] Global reset() called! Wiping all state including 2FA flag.');
        console.trace();
        localStorage.removeItem('_mf2a');
        set({
            user: null,
            permissions: [],
            isLoading: false,
            isInitialized: true,
            isTwoFactorVerified: false,
        });
    },
}));
