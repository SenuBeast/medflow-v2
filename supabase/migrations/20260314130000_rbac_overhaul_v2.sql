-- ═══════════════════════════════════════════════════════════════════════════
-- MedFlow v2 - Migration 20260314130000
-- RBAC System Overhaul: Granular Permissions and Default Role Mapping
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Standardize all current permissions in the system
INSERT INTO public.permissions (key, category, description) VALUES
    -- Admin & Access Control
    ('admin.access_panel',         'Admin',     'Access the admin panel'),
    ('admin.users.view',           'Admin',     'View users list'),
    ('admin.users.create',         'Admin',     'Create new users'),
    ('admin.users.deactivate',     'Admin',     'Deactivate / activate users'),
    ('admin.roles.manage',         'Admin',     'Create, edit, and delete custom roles'),
    ('admin.roles.assign',         'Admin',     'Assign roles to users'),
    ('admin.permissions.manage',   'Admin',     'Manage permission assignments'),
    ('admin.audit.view',           'Admin',     'View audit logs'),

    -- Inventory Management
    ('inventory.products.view',    'Inventory', 'View medicine master and product catalog'),
    ('inventory.products.manage',  'Inventory', 'Create and update products'),
    ('inventory.suppliers.view',   'Inventory', 'View suppliers'),
    ('inventory.suppliers.manage', 'Inventory', 'Create and update suppliers'),
    ('inventory.purchase.manage',  'Inventory', 'Manage purchase orders, GRN, and invoices'),
    ('inventory.batches.manage',   'Inventory', 'Manage batches and expiry statuses'),
    ('inventory.adjustments.manage','Inventory', 'Perform stock adjustments'),
    ('inventory.returns.manage',   'Inventory', 'Process supplier and customer returns'),
    ('inventory.movements.view',   'Inventory', 'View inventory movement logs'),
    ('inventory.bulk_import',      'Inventory', 'Bulk import inventory via CSV'),
    ('stock_counts.perform',       'Inventory', 'Perform stock counts'),

    -- Medical & Controlled Substances
    ('inventory.controlled.view',  'Medical',   'View controlled drug records'),
    ('inventory.controlled.manage','Medical',   'Manage controlled drug stock'),
    ('inventory.expiry.view',      'Medical',   'View expiry tracking'),
    ('inventory.expiry.manage',    'Medical',   'Update and manage expiring items'),
    ('inventory.expiry.dispose',   'Medical',   'Mark expired items as disposed'),
    ('patients.view',              'Medical',   'View patient records'),
    ('patients.manage',            'Medical',   'Create and edit patient records'),
    ('prescriptions.view',         'Medical',   'View prescriptions'),
    ('prescriptions.create',       'Medical',   'Create prescriptions'),
    ('prescriptions.dispense',     'Medical',   'Dispense prescribed medications'),
    ('medical_records.view',       'Medical',   'View medical records'),
    ('medical_records.manage',     'Medical',   'Create and edit medical records'),

    -- Sales & Billing
    ('sales.view',                 'Sales',     'View sales records'),
    ('sales.create',               'Sales',     'Create new sales'),
    ('sales.refund',               'Sales',     'Process refunds on completed sales'),
    ('sales.discount',             'Sales',     'Apply discounts when creating a sale'),
    ('pos.access',                 'Sales',     'Access the POS module'),
    ('billing.view',               'Billing',   'View billing records'),
    ('billing.manage',             'Billing',   'Manage and reconcile billing'),

    -- Reports & Analytics
    ('reports.view',               'Reports',   'View reports and analytics'),
    ('reports.export',             'Reports',   'Export reports to CSV/PDF'),
    ('stock_counts.approve',       'Reports',   'Approve or reject stock counts'),
    ('inventory.reports.view',     'Reports',   'View inventory reports and alerts')
ON CONFLICT (key) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- 2) Clear existing system role mapping to apply new architect standards
-- (Only for system roles to avoid disrupting custom role users)
DELETE FROM public.role_permissions
WHERE role_id IN (SELECT id FROM public.roles WHERE is_system = true);

-- 3) Apply default mappings per Architect specification

-- Helper Function to grant permissions to a role
CREATE OR REPLACE FUNCTION tmp_grant_permissions(role_name TEXT, keys TEXT[])
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM public.roles r
    CROSS JOIN public.permissions p
    WHERE r.name = role_name
      AND p.key = ANY(keys)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Super Admin: ALL permissions
SELECT tmp_grant_permissions('Super Admin', ARRAY(SELECT key FROM public.permissions));

-- Manager
SELECT tmp_grant_permissions('Manager', ARRAY[
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
]);

-- Pharmacist
SELECT tmp_grant_permissions('Pharmacist', ARRAY[
    'inventory.products.view', 'inventory.batches.manage', 'inventory.movements.view',
    'inventory.controlled.view', 'inventory.controlled.manage',
    'inventory.expiry.view', 'inventory.expiry.manage',
    'patients.view', 'patients.manage',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.dispense',
    'sales.view', 'sales.create', 'pos.access',
    'medical_records.view', 'medical_records.manage',
    'reports.view'
]);

-- Accountant
SELECT tmp_grant_permissions('Accountant', ARRAY[
    'sales.view', 'sales.refund',
    'billing.view', 'billing.manage',
    'reports.view', 'reports.export',
    'inventory.movements.view', 'inventory.reports.view'
]);

-- Warehouse Staff
SELECT tmp_grant_permissions('Warehouse Staff', ARRAY[
    'inventory.products.view', 'inventory.suppliers.view', 'inventory.purchase.manage',
    'inventory.batches.manage', 'inventory.adjustments.manage', 'inventory.movements.view',
    'inventory.returns.manage', 'inventory.bulk_import', 'inventory.expiry.view',
    'stock_counts.perform', 'inventory.reports.view'
]);

-- Sales Representative
SELECT tmp_grant_permissions('Sales Representative', ARRAY[
    'pos.access', 'sales.view', 'sales.create', 'sales.discount',
    'patients.view', 'prescriptions.view',
    'inventory.products.view', 'inventory.expiry.view'
]);

-- Viewer
SELECT tmp_grant_permissions('Viewer', ARRAY[
    'inventory.products.view', 'inventory.suppliers.view', 'inventory.movements.view',
    'patients.view', 'prescriptions.view', 'sales.view', 'billing.view',
    'reports.view', 'inventory.reports.view'
]);

DROP FUNCTION tmp_grant_permissions(TEXT, TEXT[]);

-- 4) Protection: Prevent deletion of core roles (Super Admin, Manager, Pharmacist)
-- (This is usually handled in application logic, but we ensure is_system is set)
UPDATE public.roles SET is_system = true 
WHERE name IN ('Super Admin', 'Manager', 'Pharmacist', 'Warehouse Staff', 'Accountant', 'Sales Representative', 'Viewer');
