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

    // Super Admin override - they can do everything
    if (store.user?.role?.name === 'Super Admin') {
        return true;
    }

    // Otherwise check explicit permission list
    return store.permissions.some((p) => p.key === permissionKey);
}

/**
 * Helper to check if the user has ANY of the provided permissions.
 * Useful for broad route guards (e.g. "can they see the admin panel at all?")
 */
export function hasAnyPermission(permissionKeys: (PermissionKey | string)[]): boolean {
    return permissionKeys.some(hasPermission);
}

/**
 * Helper to check if the user has ALL of the provided permissions.
 */
export function hasAllPermissions(permissionKeys: (PermissionKey | string)[]): boolean {
    return permissionKeys.every(hasPermission);
}
