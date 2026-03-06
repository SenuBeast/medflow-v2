import { useAuthStore } from '../store/authStore';
import { hasPermission, hasAllPermissions, hasAnyPermission } from '../lib/permissionUtils';
import type { PermissionKey } from '../lib/constants';

export function usePermission(key: PermissionKey): boolean {
    useAuthStore((state) => state.permissions); // subscribe to changes
    return hasPermission(key);
}

export function useAllPermissions(keys: PermissionKey[]): boolean {
    useAuthStore((state) => state.permissions);
    return hasAllPermissions(keys);
}

export function useAnyPermission(keys: PermissionKey[]): boolean {
    useAuthStore((state) => state.permissions);
    return hasAnyPermission(keys);
}
