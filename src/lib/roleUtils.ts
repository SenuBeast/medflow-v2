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
