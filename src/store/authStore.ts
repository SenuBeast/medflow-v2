import { create } from 'zustand';
import type { User, Permission } from '../lib/types';

interface DeactivatedAccountNotice {
    title: string;
    message: string;
}

interface AuthState {
    user: User | null;
    permissions: Permission[];
    isLoading: boolean;
    isInitialized: boolean;
    isTwoFactorVerified: boolean;
    deactivatedAccountNotice: DeactivatedAccountNotice | null;
    setUser: (user: User | null) => void;
    setPermissions: (permissions: Permission[]) => void;
    setLoading: (loading: boolean) => void;
    setInitialized: (initialized: boolean) => void;
    setTwoFactorVerified: (verified: boolean) => void;
    setDeactivatedAccountNotice: (notice: DeactivatedAccountNotice | null) => void;
    clearDeactivatedAccountNotice: () => void;
    reset: (preserveDeactivatedNotice?: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    permissions: [],
    isLoading: true,
    isInitialized: false,
    isTwoFactorVerified: false,
    deactivatedAccountNotice: null,

    setUser: (user) => set({ user }),
    setPermissions: (permissions) => set({ permissions }),
    setLoading: (isLoading) => set({ isLoading }),
    setInitialized: (isInitialized) => set({ isInitialized }),
    setTwoFactorVerified: (isTwoFactorVerified) => set({ isTwoFactorVerified }),
    setDeactivatedAccountNotice: (deactivatedAccountNotice) => set({ deactivatedAccountNotice }),
    clearDeactivatedAccountNotice: () => set({ deactivatedAccountNotice: null }),

    reset: (preserveDeactivatedNotice = false) => {
        set((state) => ({
            user: null,
            permissions: [],
            isLoading: false,
            isInitialized: true,
            isTwoFactorVerified: false,
            deactivatedAccountNotice: preserveDeactivatedNotice ? state.deactivatedAccountNotice : null,
        }));
    },
}));
