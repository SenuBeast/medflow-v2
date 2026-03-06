// ─── Permission Keys ──────────────────────────────────────────────────────────

export const PERMISSIONS = {
    // Admin
    ADMIN_ACCESS_PANEL: 'admin.access_panel',
    ADMIN_USERS_VIEW: 'admin.users.view',
    ADMIN_USERS_CREATE: 'admin.users.create',
    ADMIN_USERS_DEACTIVATE: 'admin.users.deactivate',
    ADMIN_ROLES_MANAGE: 'admin.roles.manage',
    ADMIN_ROLES_ASSIGN: 'admin.roles.assign',
    ADMIN_PERMISSIONS_MANAGE: 'admin.permissions.manage',
    ADMIN_AUDIT_VIEW: 'admin.audit.view',

    // Inventory
    INVENTORY_VIEW: 'inventory.view',
    INVENTORY_ADD: 'inventory.add',
    INVENTORY_EDIT: 'inventory.edit',
    INVENTORY_ADJUST: 'inventory.adjust',
    INVENTORY_BULK_IMPORT: 'inventory.bulk_import',

    // Stock Counts
    STOCK_COUNTS_PERFORM: 'stock_counts.perform',
    STOCK_COUNTS_APPROVE: 'stock_counts.approve',

    // Medical / Controlled
    INVENTORY_CONTROLLED_VIEW: 'inventory.controlled.view',
    INVENTORY_CONTROLLED_MANAGE: 'inventory.controlled.manage',

    // Expiry
    INVENTORY_EXPIRY_VIEW: 'inventory.expiry.view',
    INVENTORY_EXPIRY_MANAGE: 'inventory.expiry.manage',
    INVENTORY_EXPIRY_DISPOSE: 'inventory.expiry.dispose',

    // Sales
    SALES_VIEW: 'sales.view',
    SALES_CREATE: 'sales.create',
    SALES_REFUND: 'sales.refund',
    SALES_DISCOUNT: 'sales.discount',

    // Reports
    REPORTS_VIEW: 'reports.view',
    REPORTS_EXPORT: 'reports.export',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ─── Critical Permissions ────────────────────────────────────────────────────

export const CRITICAL_PERMISSIONS: PermissionKey[] = [
    PERMISSIONS.ADMIN_ACCESS_PANEL,
    PERMISSIONS.ADMIN_USERS_CREATE,
    PERMISSIONS.ADMIN_USERS_DEACTIVATE,
    PERMISSIONS.ADMIN_ROLES_MANAGE,
    PERMISSIONS.ADMIN_PERMISSIONS_MANAGE,
    PERMISSIONS.INVENTORY_CONTROLLED_MANAGE,
    PERMISSIONS.INVENTORY_EXPIRY_DISPOSE,
];

// ─── Role Colors ──────────────────────────────────────────────────────────────

export const ROLE_COLORS: Record<string, {
    bg: string;
    text: string;
    border: string;
    dot: string;
}> = {
    'Super Admin': {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
        dot: 'bg-red-500',
    },
    'Pharmacist': {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
    },
    'Manager': {
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        dot: 'bg-indigo-500',
    },
    'Warehouse Staff': {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-200',
        dot: 'bg-orange-500',
    },
    'Accountant': {
        bg: 'bg-teal-100',
        text: 'text-teal-700',
        border: 'border-teal-200',
        dot: 'bg-teal-500',
    },
    'Viewer': {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        border: 'border-gray-200',
        dot: 'bg-gray-400',
    },
    'Sales Representative': {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-200',
        dot: 'bg-green-500',
    },
};

export const CUSTOM_ROLE_COLOR = {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
};

// ─── Permission Categories ────────────────────────────────────────────────────

export const PERMISSION_CATEGORIES = [
    'Admin',
    'Inventory',
    'Medical',
    'Sales',
    'Reports',
] as const;

// ─── Pharmacy Configuration ───────────────────────────────────────────────────

export const PHARMACY_CONFIG = {
    name: 'MedFlow Pharmacy',
    address: '123 Health Ave, Medical District',
    tax_rate: 8.5, // 8.5%
    currency: 'USD',
    currency_symbol: '$'
};

