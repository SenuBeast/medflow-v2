-- ═══════════════════════════════════════════════════════════════════════════
-- MedFlow v2 — Seed: Roles, Permissions, Role-Permission Assignments
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── System Roles ────────────────────────────────────────────────────────────
insert into public.roles (name, description, is_system) values
  ('Super Admin',          'Full system access. All permissions.',                           true),
  ('Pharmacist',           'Manages drugs, inventory, and sales.',                           true),
  ('Manager',              'Oversees operations. No controlled drug management.',            true),
  ('Warehouse Staff',      'Stock and inventory operations only.',                           true),
  ('Accountant',           'Reports and sales view/export only.',                            true),
  ('Viewer',               'Read-only access across the system.',                            true),
  ('Sales Representative', 'Sales and limited inventory view.',                              true)
on conflict (name) do nothing;

-- ─── Permissions ─────────────────────────────────────────────────────────────
insert into public.permissions (key, category, description) values
  -- Admin
  ('admin.access_panel',         'Admin',     'Access the admin panel'),
  ('admin.users.view',           'Admin',     'View users list'),
  ('admin.users.create',         'Admin',     'Create new users'),
  ('admin.users.deactivate',     'Admin',     'Deactivate / activate users'),
  ('admin.roles.manage',         'Admin',     'Create, edit, and delete custom roles'),
  ('admin.roles.assign',         'Admin',     'Assign roles to users'),
  ('admin.permissions.manage',   'Admin',     'Manage permission assignments'),
  ('admin.audit.view',           'Admin',     'View audit logs'),
  -- Inventory
  ('inventory.view',             'Inventory', 'View inventory items'),
  ('inventory.add',              'Inventory', 'Add new inventory items'),
  ('inventory.edit',             'Inventory', 'Edit existing inventory items'),
  ('inventory.adjust',           'Inventory', 'Adjust stock quantities'),
  ('inventory.bulk_import',      'Inventory', 'Bulk import inventory via CSV'),
  -- Stock Counts
  ('stock_counts.perform',       'Inventory', 'Perform stock counts'),
  ('stock_counts.approve',       'Inventory', 'Approve or reject stock counts'),
  -- Medical / Controlled
  ('inventory.controlled.view',  'Medical',   'View controlled drug records'),
  ('inventory.controlled.manage','Medical',   'Manage controlled drug stock'),
  -- Expiry
  ('inventory.expiry.view',      'Medical',   'View expiry tracking'),
  ('inventory.expiry.manage',    'Medical',   'Update and manage expiring items'),
  ('inventory.expiry.dispose',   'Medical',   'Mark expired items as disposed'),
  -- Sales
  ('sales.view',                 'Sales',     'View sales records'),
  ('sales.create',               'Sales',     'Create new sales'),
  -- Reports
  ('reports.view',               'Reports',   'View reports and analytics'),
  ('reports.export',             'Reports',   'Export reports to CSV/PDF')
on conflict (key) do nothing;

-- ─── Helper: assign permissions to a role by key ─────────────────────────────
-- Super Admin — ALL permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'Super Admin'
on conflict do nothing;

-- Pharmacist
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.adjust',
  'inventory.controlled.view', 'inventory.controlled.manage',
  'inventory.expiry.view', 'inventory.expiry.manage', 'inventory.expiry.dispose',
  'sales.view', 'sales.create',
  'stock_counts.perform'
)
where r.name = 'Pharmacist'
on conflict do nothing;

-- Manager
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.adjust', 'inventory.bulk_import',
  'inventory.controlled.view',
  'inventory.expiry.view', 'inventory.expiry.manage',
  'sales.view', 'sales.create',
  'reports.view', 'reports.export',
  'admin.access_panel', 'admin.users.view', 'admin.audit.view',
  'stock_counts.perform', 'stock_counts.approve'
)
where r.name = 'Manager'
on conflict do nothing;

-- Warehouse Staff
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.adjust', 'inventory.bulk_import',
  'stock_counts.perform'
)
where r.name = 'Warehouse Staff'
on conflict do nothing;

-- Accountant
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'reports.view', 'reports.export',
  'sales.view'
)
where r.name = 'Accountant'
on conflict do nothing;

-- Viewer
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'inventory.view',
  'sales.view',
  'reports.view'
)
where r.name = 'Viewer'
on conflict do nothing;

-- Sales Representative
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'inventory.view',
  'sales.view', 'sales.create'
)
where r.name = 'Sales Representative'
on conflict do nothing;
