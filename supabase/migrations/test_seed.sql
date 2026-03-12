-- ==============================================================================
-- TESTING SCRIPT: Enable POS Integration for Testing
-- Run this in your Supabase SQL Editor AFTER running the main migration
-- ==============================================================================

-- 1. Give 'Admin' Role the new POS permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' 
  AND p.key IN (
    'pos.access',
    'patients.view', 'patients.manage',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.dispense',
    'medical_records.view', 'medical_records.manage',
    'billing.view', 'billing.manage'
  )
ON CONFLICT DO NOTHING;

-- 2. Create an active POS + MedFlow subscription for the FIRST tenant found
-- (If you are logged into a specific tenant, ensure it's this one, or replace with your actual tenant_id)
DO $$
DECLARE
    first_tenant_id UUID;
BEGIN
    SELECT id INTO first_tenant_id FROM tenants LIMIT 1;

    IF first_tenant_id IS NOT NULL THEN
        -- Add MedFlow Subscription
        INSERT INTO tenant_subscriptions (tenant_id, product, plan, status, starts_at)
        VALUES (first_tenant_id, 'medflow', 'professional', 'active', now())
        ON CONFLICT (tenant_id, product) DO UPDATE SET status = 'active';

        -- Add POS Subscription
        INSERT INTO tenant_subscriptions (tenant_id, product, plan, status, starts_at)
        VALUES (first_tenant_id, 'pos', 'professional', 'active', now())
        ON CONFLICT (tenant_id, product) DO UPDATE SET status = 'active';
        
        RAISE NOTICE 'Added subscriptions to tenant %', first_tenant_id;
    ELSE
        RAISE NOTICE 'No tenants found to attach subscriptions to.';
    END IF;
END $$;
