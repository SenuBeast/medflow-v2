import { ROLE_HIERARCHY } from './constants';
import type { Role } from './types';

/**
 * Role Utility Functions for styling and mapping
 */
export function getRoleClassName(roleName: string): string {
    const map: Record<string, string> = {
        'Super Admin': 'super-admin',
        'Manager': 'manager',
        'Pharmacist': 'pharmacist',
        'Accountant': 'accountant',
        'Warehouse Staff': 'warehouse-staff',
        'Sales Representative': 'sales-representative',
        'Viewer': 'viewer-auditor',
    };
    return map[roleName] || 'custom-role';
}

export function getRoleColorHex(roleName: string): string {
    const map: Record<string, string> = {
        'Super Admin': '#ef4444',
        'Manager': '#3b82f6',
        'Pharmacist': '#14b8a6',
        'Accountant': '#d946ef',
        'Warehouse Staff': '#f59e0b',
        'Sales Representative': '#6366f1',
        'Viewer': '#64748b',
    };
    return map[roleName] || '#8b5cf6';
}

export function sortRoles(roles: Role[]): Role[] {
    return [...roles].sort((a, b) => {
        const indexA = ROLE_HIERARCHY.indexOf(a.name);
        const indexB = ROLE_HIERARCHY.indexOf(b.name);
        
        // Both roles in hierarchy
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        
        // System roles go before custom roles
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        
        // Both custom roles, sort alphabetically
        return a.name.localeCompare(b.name);
    });
}
