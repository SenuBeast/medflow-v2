-- ═══════════════════════════════════════════════════════════════════════════
-- MedFlow v2 — Migration: Full POS Integration Schema
-- Adds: tenant_subscriptions, patients, prescriptions, prescription_items,
--        medical_records, billing_records, and linking columns.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tenant Subscriptions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product     TEXT NOT NULL CHECK (product IN ('medflow', 'pos')),
    plan        TEXT NOT NULL DEFAULT 'standard'
                CHECK (plan IN ('trial', 'standard', 'professional', 'enterprise')),
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'cancelled', 'expired')),
    starts_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),

    UNIQUE (tenant_id, product)
);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_sub_select" ON public.tenant_subscriptions
    FOR SELECT USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );

-- Seed default subscriptions for the default tenant (both products active)
INSERT INTO public.tenant_subscriptions (tenant_id, product, plan, status)
VALUES
    ('00000000-0000-0000-0000-000000000000', 'medflow', 'professional', 'active'),
    ('00000000-0000-0000-0000-000000000000', 'pos', 'standard', 'active')
ON CONFLICT (tenant_id, product) DO NOTHING;

-- ─── Helper RPCs ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_active_subscription(
    p_tenant UUID,
    p_product TEXT
) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM tenant_subscriptions
        WHERE tenant_id = p_tenant
          AND product   = p_product
          AND status    = 'active'
          AND (expires_at IS NULL OR expires_at > now())
    );
$$;

CREATE OR REPLACE FUNCTION public.is_integrated_tenant(p_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
    SELECT (
        public.has_active_subscription(p_tenant, 'medflow')
        AND
        public.has_active_subscription(p_tenant, 'pos')
    );
$$;


-- ─── 2. Patients ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    dob         DATE,
    gender      TEXT CHECK (gender IN ('male', 'female', 'other')),
    address     TEXT,
    allergies   TEXT,
    notes       TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_tenant ON public.patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_name   ON public.patients(tenant_id, full_name);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_patients_select" ON public.patients
    FOR SELECT USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_patients_insert" ON public.patients
    FOR INSERT WITH CHECK (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_patients_update" ON public.patients
    FOR UPDATE USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_patients_delete" ON public.patients
    FOR DELETE USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );


-- ─── 3. Prescriptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    prescribed_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'dispensed', 'partially_dispensed', 'cancelled', 'expired')),
    diagnosis       TEXT,
    notes           TEXT,
    prescribed_at   TIMESTAMPTZ DEFAULT now(),
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant   ON public.prescriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient  ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status   ON public.prescriptions(tenant_id, status);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_prescriptions_select" ON public.prescriptions
    FOR SELECT USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_prescriptions_insert" ON public.prescriptions
    FOR INSERT WITH CHECK (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_prescriptions_update" ON public.prescriptions
    FOR UPDATE USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_prescriptions_delete" ON public.prescriptions
    FOR DELETE USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );


-- ─── 4. Prescription Items ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id   UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    item_id           UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    drug_name         TEXT NOT NULL,
    quantity          INTEGER NOT NULL CHECK (quantity > 0),
    dosage            TEXT,
    frequency         TEXT,
    duration          TEXT,
    instructions      TEXT,
    is_dispensed      BOOLEAN DEFAULT false,
    dispensed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_rx ON public.prescription_items(prescription_id);

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- prescription_items inherit access from parent prescription
CREATE POLICY "prescription_items_select" ON public.prescription_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.prescriptions p
            WHERE p.id = prescription_items.prescription_id
        )
    );
CREATE POLICY "prescription_items_insert" ON public.prescription_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.prescriptions p
            WHERE p.id = prescription_items.prescription_id
        )
    );
CREATE POLICY "prescription_items_update" ON public.prescription_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.prescriptions p
            WHERE p.id = prescription_items.prescription_id
        )
    );
CREATE POLICY "prescription_items_delete" ON public.prescription_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.prescriptions p
            WHERE p.id = prescription_items.prescription_id
        )
    );


-- ─── 5. Medical Records ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medical_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id  UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL CHECK (record_type IN ('consultation', 'lab_result', 'imaging', 'procedure', 'note')),
    title       TEXT NOT NULL,
    data        JSONB DEFAULT '{}',
    created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON public.medical_records(patient_id);

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_medical_records_select" ON public.medical_records
    FOR SELECT USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_medical_records_insert" ON public.medical_records
    FOR INSERT WITH CHECK (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_medical_records_update" ON public.medical_records
    FOR UPDATE USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_medical_records_delete" ON public.medical_records
    FOR DELETE USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );


-- ─── 6. Billing Records ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id      UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    transaction_id  UUID REFERENCES public.sale_transactions(id) ON DELETE SET NULL,
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    amount          NUMERIC(12,2) NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'partial', 'refunded', 'written_off')),
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_records_tenant  ON public.billing_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_patient ON public.billing_records(patient_id);

ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_billing_records_select" ON public.billing_records
    FOR SELECT USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_billing_records_insert" ON public.billing_records
    FOR INSERT WITH CHECK (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_billing_records_update" ON public.billing_records
    FOR UPDATE USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "tenant_isolation_billing_records_delete" ON public.billing_records
    FOR DELETE USING (
        tenant_id = NULLIF(current_setting('request.jwt.claim.tenant_id', true), '')::uuid
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );


-- ─── 7. Link sale_transactions to prescriptions and patients ────────────────
ALTER TABLE public.sale_transactions
    ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS patient_id      UUID REFERENCES public.patients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sale_txn_prescription ON public.sale_transactions(prescription_id);
CREATE INDEX IF NOT EXISTS idx_sale_txn_patient      ON public.sale_transactions(patient_id);


-- ─── 8. New Permissions ─────────────────────────────────────────────────────
INSERT INTO public.permissions (key, category, description) VALUES
    ('pos.access',              'POS',      'Access the POS module'),
    ('patients.view',           'Medical',  'View patient records'),
    ('patients.manage',         'Medical',  'Create and edit patient records'),
    ('prescriptions.view',      'Medical',  'View prescriptions'),
    ('prescriptions.create',    'Medical',  'Create prescriptions'),
    ('prescriptions.dispense',  'Medical',  'Dispense prescribed medications'),
    ('medical_records.view',    'Medical',  'View medical records'),
    ('medical_records.manage',  'Medical',  'Create and edit medical records'),
    ('billing.view',            'Billing',  'View billing records'),
    ('billing.manage',          'Billing',  'Manage and reconcile billing')
ON CONFLICT (key) DO NOTHING;

-- Grant all new permissions to Super Admin and Manager
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Super Admin', 'Manager')
  AND p.key IN (
    'pos.access', 'patients.view', 'patients.manage',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.dispense',
    'medical_records.view', 'medical_records.manage',
    'billing.view', 'billing.manage'
  )
ON CONFLICT DO NOTHING;

-- Grant view + dispense to Pharmacist
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Pharmacist'
  AND p.key IN (
    'pos.access', 'patients.view',
    'prescriptions.view', 'prescriptions.dispense',
    'billing.view'
  )
ON CONFLICT DO NOTHING;

-- Grant billing to Accountant
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Accountant'
  AND p.key IN ('billing.view', 'billing.manage', 'patients.view')
ON CONFLICT DO NOTHING;


-- ─── 9. Enable Realtime for integration tables ─────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_subscriptions;
