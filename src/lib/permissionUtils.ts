import { useAuthStore } from '../store/authStore';
import type { PermissionKey } from './constants';

/**
 * Global helper to check if the current user has a specific permission.
 * This reads directly from the centralized Zustand auth store.
 * 
 * @param permissionKey - The strict string literal of the permission required (e.g. 'inventory.view')
 * @returns boolean true if the user's role contains the permission, or if they are Super Admin
 */
export function hasPermission(permissionKey: PermissionKey | string): boolean {
    const store = useAuthStore.getState();
    if (store.user?.role?.name === 'Super Admin') return true;
    return store.permissions.some((p) => p.key === permissionKey);
}

export function useHasPermission(permissionKey: PermissionKey | string): boolean {
    const userRole = useAuthStore(state => state.user?.role?.name);
    const permissions = useAuthStore(state => state.permissions);

    if (userRole === 'Super Admin') return true;
    return permissions.some((p) => p.key === permissionKey);
}

/**
 * Helper to check if the user has ANY of the provided permissions.
 * Useful for broad route guards (e.g. "can they see the admin panel at all?")
 */
export function hasAnyPermission(permissionKeys: (PermissionKey | string)[]): boolean {
    return permissionKeys.some(key => hasPermission(key));
}

export function useHasAnyPermission(permissionKeys: (PermissionKey | string)[]): boolean {
    const userRole = useAuthStore(state => state.user?.role?.name);
    const permissions = useAuthStore(state => state.permissions);

    if (userRole === 'Super Admin') return true;
    return permissionKeys.some(key => permissions.some(p => p.key === key));
}

export function hasAllPermissions(permissionKeys: (PermissionKey | string)[]): boolean {
    return permissionKeys.every(key => hasPermission(key));
}
