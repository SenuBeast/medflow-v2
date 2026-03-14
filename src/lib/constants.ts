// ─── Permission Keys ──────────────────────────────────────────────────────────

export const PERMISSIONS = {
    // Admin & Access Control
    ADMIN_ACCESS_PANEL: 'admin.access_panel',
    ADMIN_USERS_VIEW: 'admin.users.view',
    ADMIN_USERS_CREATE: 'admin.users.create',
    ADMIN_USERS_DEACTIVATE: 'admin.users.deactivate',
    ADMIN_ROLES_MANAGE: 'admin.roles.manage',
    ADMIN_ROLES_ASSIGN: 'admin.roles.assign',
    ADMIN_PERMISSIONS_MANAGE: 'admin.permissions.manage',
    ADMIN_AUDIT_VIEW: 'admin.audit.view',

    // Inventory Management
    INVENTORY_PRODUCTS_VIEW: 'inventory.products.view',
    INVENTORY_PRODUCTS_MANAGE: 'inventory.products.manage',
    INVENTORY_SUPPLIERS_VIEW: 'inventory.suppliers.view',
    INVENTORY_SUPPLIERS_MANAGE: 'inventory.suppliers.manage',
    INVENTORY_PURCHASE_MANAGE: 'inventory.purchase.manage',
    INVENTORY_BATCHES_MANAGE: 'inventory.batches.manage',
    INVENTORY_ADJUSTMENTS_MANAGE: 'inventory.adjustments.manage',
    INVENTORY_RETURNS_MANAGE: 'inventory.returns.manage',
    INVENTORY_MOVEMENTS_VIEW: 'inventory.movements.view',
    INVENTORY_BULK_IMPORT: 'inventory.bulk_import',
    STOCK_COUNTS_PERFORM: 'stock_counts.perform',
    
    // Medical & Controlled Substances
    INVENTORY_CONTROLLED_VIEW: 'inventory.controlled.view',
    INVENTORY_CONTROLLED_MANAGE: 'inventory.controlled.manage',
    INVENTORY_EXPIRY_VIEW: 'inventory.expiry.view',
    INVENTORY_EXPIRY_MANAGE: 'inventory.expiry.manage',
    INVENTORY_EXPIRY_DISPOSE: 'inventory.expiry.dispose',
    PATIENTS_VIEW: 'patients.view',
    PATIENTS_MANAGE: 'patients.manage',
    PRESCRIPTIONS_VIEW: 'prescriptions.view',
    PRESCRIPTIONS_CREATE: 'prescriptions.create',
    PRESCRIPTIONS_DISPENSE: 'prescriptions.dispense',
    MEDICAL_RECORDS_VIEW: 'medical_records.view',
    MEDICAL_RECORDS_MANAGE: 'medical_records.manage',

    // Sales & Billing
    SALES_VIEW: 'sales.view',
    SALES_CREATE: 'sales.create',
    SALES_REFUND: 'sales.refund',
    SALES_DISCOUNT: 'sales.discount',
    POS_ACCESS: 'pos.access',
    BILLING_VIEW: 'billing.view',
    BILLING_MANAGE: 'billing.manage',

    // Reports & Analytics
    REPORTS_VIEW: 'reports.view',
    REPORTS_EXPORT: 'reports.export',
    STOCK_COUNTS_APPROVE: 'stock_counts.approve',
    INVENTORY_REPORTS_VIEW: 'inventory.reports.view',

    // Legacy (to be deprecated, keeping for compatibility during migration)
    INVENTORY_VIEW: 'inventory.view',
    INVENTORY_ADD: 'inventory.add',
    INVENTORY_EDIT: 'inventory.edit',
    INVENTORY_ADJUST: 'inventory.adjust',
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
    PERMISSIONS.SALES_REFUND,
    PERMISSIONS.BILLING_MANAGE,
];

// ─── Role Colors ──────────────────────────────────────────────────────────────

export const ROLE_COLORS: Record<string, {
    bg: string;
    text: string;
    border: string;
    dot: string;
}> = {
    'Super Admin': {
        bg: 'bg-transparent',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-[#b91c1c]',
        dot: 'bg-red-500',
    },
    'Pharmacist': {
        bg: 'bg-transparent',
        text: 'text-teal-700 dark:text-teal-400',
        border: 'border-[#0f766e]',
        dot: 'bg-teal-500',
    },
    'Manager': {
        bg: 'bg-transparent',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-[#1d4ed8]',
        dot: 'bg-blue-500',
    },
    'Warehouse Staff': {
        bg: 'bg-transparent',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-[#b45309]',
        dot: 'bg-amber-500',
    },
    'Accountant': {
        bg: 'bg-pink-700 dark:text-pink-400',
        text: 'text-pink-700 dark:text-pink-400',
        border: 'border-[#a21caf]',
        dot: 'bg-pink-500',
    },
    'Viewer': {
        bg: 'bg-transparent',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-[#475569]',
        dot: 'bg-slate-400',
    },
    'Sales Representative': {
        bg: 'bg-transparent',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-[#4338ca]',
        dot: 'bg-indigo-500',
    },
};

export const CUSTOM_ROLE_COLOR = {
    bg: 'bg-transparent',
    text: 'text-text-main',
    border: 'border-black dark:border-white opacity-80',
    dot: 'bg-indigo-500',
};

// ─── Permission Categories with UI Metadata ───────────────────────────────────

export const PERMISSION_CATEGORIES = [
    { id: 'Admin', label: 'Admin & Access Control', icon: 'Shield' },
    { id: 'Inventory', label: 'Inventory Management', icon: 'Box' },
    { id: 'Medical', label: 'Medical & Controlled Substances', icon: 'Pill' },
    { id: 'Sales', label: 'Sales & Billing', icon: 'ShoppingBag' },
    { id: 'Reports', label: 'Reports & Analytics', icon: 'BarChart' },
] as const;

// ─── Role Hierarchy (Highest → Lowest) ───────────────────────────────────────

export const ROLE_HIERARCHY = [
    'Super Admin',
    'Manager',
    'Pharmacist',
    'Accountant',
    'Warehouse Staff',
    'Sales Representative',
    'Viewer',
];

// ─── System Role Default Permissions ──────────────────────────────────────────

export const SYSTEM_ROLE_DEFAULTS: Record<string, string[]> = {
    'Super Admin': Object.values(PERMISSIONS),
    'Manager': [
        'admin.users.view', 'admin.users.create', 'admin.users.deactivate', 'admin.roles.assign', 'admin.audit.view',
        'inventory.products.view', 'inventory.products.manage', 'inventory.suppliers.view', 'inventory.suppliers.manage',
        'inventory.purchase.manage', 'inventory.batches.manage', 'inventory.adjustments.manage', 'inventory.returns.manage',
        'inventory.movements.view', 'inventory.bulk_import', 'stock_counts.perform',
        'inventory.controlled.view', 'inventory.controlled.manage',
        'inventory.expiry.view', 'inventory.expiry.manage', 'inventory.expiry.dispose',
        'patients.view', 'patients.manage',
        'prescriptions.view', 'prescriptions.create', 'prescriptions.dispense',
        'sales.view', 'sales.create', 'sales.refund', 'sales.discount', 'pos.access',
        'medical_records.view', 'medical_records.manage',
        'billing.view', 'billing.manage',
        'reports.view', 'reports.export', 'stock_counts.approve', 'inventory.reports.view'
    ],
    'Pharmacist': [
        'inventory.products.view', 'inventory.batches.manage', 'inventory.movements.view',
        'inventory.controlled.view', 'inventory.controlled.manage',
        'inventory.expiry.view', 'inventory.expiry.manage',
        'patients.view', 'patients.manage',
        'prescriptions.view', 'prescriptions.create', 'prescriptions.dispense',
        'sales.view', 'sales.create', 'pos.access',
        'medical_records.view', 'medical_records.manage',
        'reports.view'
    ],
    'Accountant': [
        'sales.view', 'sales.refund',
        'billing.view', 'billing.manage',
        'reports.view', 'reports.export',
        'inventory.movements.view', 'inventory.reports.view'
    ],
    'Warehouse Staff': [
        'inventory.products.view', 'inventory.suppliers.view', 'inventory.purchase.manage',
        'inventory.batches.manage', 'inventory.adjustments.manage', 'inventory.movements.view',
        'inventory.returns.manage', 'inventory.bulk_import', 'inventory.expiry.view',
        'stock_counts.perform', 'inventory.reports.view'
    ],
    'Sales Representative': [
        'pos.access', 'sales.view', 'sales.create', 'sales.discount',
        'patients.view', 'prescriptions.view',
        'inventory.products.view', 'inventory.expiry.view'
    ],
    'Viewer': [
        'inventory.products.view', 'inventory.suppliers.view', 'inventory.movements.view',
        'patients.view', 'prescriptions.view', 'sales.view', 'billing.view',
        'reports.view', 'inventory.reports.view'
    ],
};
