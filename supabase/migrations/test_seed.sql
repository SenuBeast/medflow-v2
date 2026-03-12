-- ==============================================================================
-- TESTING SCRIPT: Enable POS Integrations
-- Run this in your Supabase SQL Editor AFTER running the main migration.
-- It grants the correct POS permissions to Admin and Super Admin roles.
-- ==============================================================================

-- Give 'Admin' and 'Super Admin' Roles the new POS permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('Admin', 'Super Admin')
  AND p.key IN (
    'pos.access',
    'patients.view', 'patients.manage',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.dispense',
    'medical_records.view', 'medical_records.manage',
    'billing.view', 'billing.manage'
  )
ON CONFLICT DO NOTHING;

-- All done!
