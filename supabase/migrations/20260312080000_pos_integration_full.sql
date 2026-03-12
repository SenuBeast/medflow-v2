-- ==============================================================================
-- MedFlow v2 — Migration: Full POS Integration Schema (Simplified)
-- Adds: patients, prescriptions, prescription_items,
--        medical_records, billing_records, and linking columns.
-- All multi-tenant isolation logic has been permanently removed.
-- ==============================================================================

-- ─── 1. Patients ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(full_name);

-- ─── 2. Prescriptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status  ON public.prescriptions(status);

-- ─── 3. Prescription Items ─────────────────────────────────────────────────
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

-- ─── 4. Medical Records ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medical_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL CHECK (record_type IN ('consultation', 'lab_result', 'imaging', 'procedure', 'note')),
    title       TEXT NOT NULL,
    data        JSONB DEFAULT '{}',
    created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON public.medical_records(patient_id);

-- ─── 5. Billing Records ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    transaction_id  UUID REFERENCES public.sale_transactions(id) ON DELETE SET NULL,
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    amount          NUMERIC(12,2) NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'partial', 'refunded', 'written_off')),
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_records_patient ON public.billing_records(patient_id);

-- ─── 6. Link sale_transactions to prescriptions and patients ────────────────
ALTER TABLE public.sale_transactions
    ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS patient_id      UUID REFERENCES public.patients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sale_txn_prescription ON public.sale_transactions(prescription_id);
CREATE INDEX IF NOT EXISTS idx_sale_txn_patient      ON public.sale_transactions(patient_id);


-- ─── 7. New Permissions ─────────────────────────────────────────────────────
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

-- Grant all new permissions to Super Admin and Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Super Admin', 'Admin', 'Manager')
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


-- ─── 8. Enable Realtime for integration tables ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'prescriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'billing_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_records;
  END IF;
END $$;
