-- ─── Sales POS Module Migration ───────────────────────────────────────────────
-- Migration 006: Replaces the basic sales table with a full POS schema
-- Tables: sale_transactions, sale_items, sale_refunds

-- ─── Backup old sales data ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_backup AS SELECT * FROM sales;

-- ─── Drop old simple sales table ─────────────────────────────────────────────
DROP TABLE IF EXISTS sales CASCADE;

-- ─── Create sale_transactions table ──────────────────────────────────────────
CREATE TABLE sale_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number  TEXT UNIQUE NOT NULL,  -- e.g. INV-2026-00001
    status          TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed', 'refunded', 'partial_refund')),
    payment_method  TEXT NOT NULL DEFAULT 'cash'
                    CHECK (payment_method IN ('cash', 'card', 'split')),
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,   -- percentage e.g. 5.00 for 5%
    tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    sold_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id      UUID REFERENCES users(id) ON DELETE CASCADE,  -- tenant isolation
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoice number sequence ──────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('invoice_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
    BEFORE INSERT ON sale_transactions
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
    EXECUTE FUNCTION generate_invoice_number();

-- ─── Create sale_items table ──────────────────────────────────────────────────
CREATE TABLE sale_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES sale_transactions(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    batch_id        UUID REFERENCES item_batches(id) ON DELETE SET NULL,
    item_name       TEXT NOT NULL,       -- denormalized for history
    item_sku        TEXT,                -- denormalized
    item_unit       TEXT,                -- denormalized
    unit_price      NUMERIC(12,2) NOT NULL,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    subtotal        NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Create sale_refunds table ────────────────────────────────────────────────
CREATE TABLE sale_refunds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES sale_transactions(id) ON DELETE CASCADE,
    reason          TEXT NOT NULL,
    refund_type     TEXT NOT NULL CHECK (refund_type IN ('full', 'partial')),
    refund_total    NUMERIC(12,2) NOT NULL,
    refund_items    JSONB,    -- [{item_id, quantity, amount}] for partial refunds
    performed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sale_transactions_company ON sale_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_sale_transactions_created ON sale_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_transactions_sold_by ON sale_transactions(sold_by);
CREATE INDEX IF NOT EXISTS idx_sale_items_transaction ON sale_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_item ON sale_items(item_id);
CREATE INDEX IF NOT EXISTS idx_sale_refunds_transaction ON sale_refunds(transaction_id);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE sale_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_refunds      ENABLE ROW LEVEL SECURITY;

-- sale_transactions: view if sales.view permission
DROP POLICY IF EXISTS "allow_sale_transactions_select" ON sale_transactions;
CREATE POLICY "allow_sale_transactions_select" ON sale_transactions
    FOR SELECT USING (user_has_permission('sales.view'::text));

DROP POLICY IF EXISTS "allow_sale_transactions_insert" ON sale_transactions;
CREATE POLICY "allow_sale_transactions_insert" ON sale_transactions
    FOR INSERT WITH CHECK (user_has_permission('sales.create'::text));

DROP POLICY IF EXISTS "allow_sale_transactions_update" ON sale_transactions;
CREATE POLICY "allow_sale_transactions_update" ON sale_transactions
    FOR UPDATE USING (user_has_permission('sales.create'::text));

-- sale_items: follow parent transaction permissions
DROP POLICY IF EXISTS "allow_sale_items_select" ON sale_items;
CREATE POLICY "allow_sale_items_select" ON sale_items
    FOR SELECT USING (user_has_permission('sales.view'::text));

DROP POLICY IF EXISTS "allow_sale_items_insert" ON sale_items;
CREATE POLICY "allow_sale_items_insert" ON sale_items
    FOR INSERT WITH CHECK (user_has_permission('sales.create'::text));

-- sale_refunds
DROP POLICY IF EXISTS "allow_sale_refunds_select" ON sale_refunds;
CREATE POLICY "allow_sale_refunds_select" ON sale_refunds
    FOR SELECT USING (user_has_permission('sales.view'::text));

DROP POLICY IF EXISTS "allow_sale_refunds_insert" ON sale_refunds;
CREATE POLICY "allow_sale_refunds_insert" ON sale_refunds
    FOR INSERT WITH CHECK (user_has_permission('sales.refund'::text));

-- ─── Add new permissions to the permissions table ─────────────────────────────
INSERT INTO permissions (key, category, description) VALUES
    ('sales.refund',   'Sales', 'Process refunds on completed sales'),
    ('sales.discount', 'Sales', 'Apply discounts when creating a sale')
ON CONFLICT (key) DO NOTHING;

-- ─── Seed role_permissions for the new permissions ───────────────────────────
-- Super Admin and Manager get all sales permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('Super Admin', 'Manager')
  AND p.key IN ('sales.refund', 'sales.discount')
ON CONFLICT DO NOTHING;

-- Pharmacist and Accountant can create discounts but not refunds
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('Pharmacist', 'Accountant')
  AND p.key = 'sales.discount'
ON CONFLICT DO NOTHING;
