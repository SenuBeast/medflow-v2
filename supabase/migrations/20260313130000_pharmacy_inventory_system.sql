-- ============================================================================
-- MedFlow v2 - Migration 20260313130000
-- Full Pharmaceutical Inventory Management Core
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Core types and helper functions
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_order_status_enum') THEN
        CREATE TYPE public.purchase_order_status_enum AS ENUM (
            'Draft',
            'Ordered',
            'Partially Received',
            'Completed',
            'Cancelled'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_invoice_payment_status_enum') THEN
        CREATE TYPE public.purchase_invoice_payment_status_enum AS ENUM (
            'unpaid',
            'partial',
            'paid',
            'cancelled'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_adjustment_type_enum') THEN
        CREATE TYPE public.stock_adjustment_type_enum AS ENUM (
            'increase',
            'decrease',
            'expired_removal',
            'damaged_removal'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_action_type_enum') THEN
        CREATE TYPE public.movement_action_type_enum AS ENUM (
            'GRN',
            'Sale',
            'Return',
            'Adjustment',
            'Transfer'
        );
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_claim text;
BEGIN
    v_claim := NULLIF(current_setting('request.jwt.claim.tenant_id', true), '');
    IF v_claim IS NULL THEN
        v_claim := NULLIF(auth.jwt() ->> 'tenant_id', '');
    END IF;

    IF v_claim IS NOT NULL
       AND v_claim ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RETURN v_claim::uuid;
    END IF;

    RETURN '00000000-0000-0000-0000-000000000000'::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1) Product / Medicine Master
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.products (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                                REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_code            text NOT NULL,
    medicine_name           text NOT NULL,
    generic_name            text,
    brand_name              text,
    category                text,
    manufacturer            text,
    barcode                 text,
    unit_type               text NOT NULL DEFAULT 'unit',
    pack_size               integer NOT NULL DEFAULT 1 CHECK (pack_size > 0),
    minimum_stock_level     numeric(14,3) NOT NULL DEFAULT 0 CHECK (minimum_stock_level >= 0),
    reorder_level           numeric(14,3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    storage_conditions      text,
    notes                   text,
    prescription_required   boolean NOT NULL DEFAULT false,
    controlled_drug         boolean NOT NULL DEFAULT false,
    tax_category            text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_products_tenant_code UNIQUE (tenant_id, product_code),
    CONSTRAINT uq_products_tenant_barcode UNIQUE (tenant_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_name ON public.products(tenant_id, medicine_name);
CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON public.products(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_products_controlled ON public.products(tenant_id, controlled_drug);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(tenant_id, barcode);

-- ----------------------------------------------------------------------------
-- 2) Supplier Management
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.suppliers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                            REFERENCES public.tenants(id) ON DELETE CASCADE,
    supplier_name       text NOT NULL,
    company             text,
    contact_person      text,
    phone               text,
    email               text,
    address             text,
    payment_terms       text,
    tax_id              text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_name ON public.suppliers(tenant_id, supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_company ON public.suppliers(tenant_id, company);

-- ----------------------------------------------------------------------------
-- 3) Purchase Order System
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                                REFERENCES public.tenants(id) ON DELETE CASCADE,
    supplier_id             uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    order_date              date NOT NULL DEFAULT current_date,
    expected_delivery_date  date,
    status                  public.purchase_order_status_enum NOT NULL DEFAULT 'Draft',
    created_by              uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id   uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity            numeric(14,3) NOT NULL CHECK (quantity > 0),
    estimated_price     numeric(12,2) NOT NULL DEFAULT 0 CHECK (estimated_price >= 0),
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_po_items_line UNIQUE (purchase_order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_status ON public.purchase_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON public.purchase_order_items(purchase_order_id);

-- ----------------------------------------------------------------------------
-- 4) Goods Received Notes (GRN)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.grn (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                            REFERENCES public.tenants(id) ON DELETE CASCADE,
    grn_number          text NOT NULL,
    supplier_id         uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    purchase_order_id   uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    received_date       date NOT NULL DEFAULT current_date,
    received_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
    status              text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Cancelled')),
    confirmed_at        timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_grn_tenant_number UNIQUE (tenant_id, grn_number)
);

CREATE TABLE IF NOT EXISTS public.grn_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id              uuid NOT NULL REFERENCES public.grn(id) ON DELETE CASCADE,
    product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_number        text NOT NULL,
    manufacturing_date  date,
    expiry_date         date NOT NULL,
    purchase_price      numeric(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    selling_price       numeric(12,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    quantity_received   numeric(14,3) NOT NULL CHECK (quantity_received > 0),
    discount            numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax                 numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_grn_item_batch UNIQUE (grn_id, product_id, batch_number),
    CONSTRAINT chk_grn_item_dates CHECK (
        manufacturing_date IS NULL OR expiry_date >= manufacturing_date
    )
);

CREATE INDEX IF NOT EXISTS idx_grn_tenant_date ON public.grn(tenant_id, received_date DESC);
CREATE INDEX IF NOT EXISTS idx_grn_status ON public.grn(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON public.grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_product ON public.grn_items(product_id);

-- ----------------------------------------------------------------------------
-- 5) Batch-Level Inventory
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.batches (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                            REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_number        text NOT NULL,
    expiry_date         date NOT NULL,
    manufacturing_date  date,
    purchase_price      numeric(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    selling_price       numeric(12,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    supplier_id         uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
    grn_id              uuid REFERENCES public.grn(id) ON DELETE SET NULL,
    quantity            numeric(14,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    status              text NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'quarantined', 'recalled', 'expired', 'depleted')),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_batches_tenant_product_batch UNIQUE (tenant_id, product_id, batch_number),
    CONSTRAINT chk_batch_dates CHECK (manufacturing_date IS NULL OR expiry_date >= manufacturing_date)
);

CREATE INDEX IF NOT EXISTS idx_batches_product_expiry ON public.batches(product_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_tenant_expiry ON public.batches(tenant_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_status ON public.batches(tenant_id, status);

-- ----------------------------------------------------------------------------
-- 6) Inventory table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                            REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id            uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    quantity_available  numeric(14,3) NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    unit_type           text NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_inventory_batch UNIQUE (batch_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_product ON public.inventory(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_batch ON public.inventory(tenant_id, batch_id);

-- ----------------------------------------------------------------------------
-- 7) Multi-unit support
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.units (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                            REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    unit_name           text NOT NULL,
    conversion_factor   numeric(14,6) NOT NULL CHECK (conversion_factor > 0),
    is_base             boolean NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_units_product_name UNIQUE (tenant_id, product_id, unit_name)
);

CREATE INDEX IF NOT EXISTS idx_units_product ON public.units(product_id);

-- ----------------------------------------------------------------------------
-- 8) Purchase invoices
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.purchase_invoices (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                            REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_number      text NOT NULL,
    supplier_id         uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    grn_id              uuid UNIQUE REFERENCES public.grn(id) ON DELETE SET NULL,
    invoice_date        date NOT NULL DEFAULT current_date,
    total_amount        numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    tax                 numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    payment_status      public.purchase_invoice_payment_status_enum NOT NULL DEFAULT 'unpaid',
    outstanding_balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (outstanding_balance >= 0),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_purchase_invoices_tenant_number UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON public.purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON public.purchase_invoices(tenant_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON public.purchase_invoices(tenant_id, payment_status);

-- ----------------------------------------------------------------------------
-- 9) Stock adjustments and movement logs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                            REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id            uuid NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    adjustment_type     public.stock_adjustment_type_enum NOT NULL,
    quantity_change     numeric(14,3) NOT NULL CHECK (quantity_change > 0),
    reason              text NOT NULL,
    created_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                            REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id            uuid REFERENCES public.batches(id) ON DELETE SET NULL,
    action_type         public.movement_action_type_enum NOT NULL,
    quantity_change     numeric(14,3) NOT NULL CHECK (quantity_change <> 0),
    reference_id        uuid,
    reference_type      text NOT NULL,
    performed_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON public.stock_adjustments(tenant_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_batch ON public.stock_adjustments(tenant_id, batch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(tenant_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON public.stock_movements(tenant_id, batch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON public.stock_movements(reference_type, reference_id);

-- ----------------------------------------------------------------------------
-- 10) Returns management
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.supplier_returns (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                        REFERENCES public.tenants(id) ON DELETE CASCADE,
    supplier_id     uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id        uuid NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    quantity        numeric(14,3) NOT NULL CHECK (quantity > 0),
    reason          text NOT NULL,
    created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_returns (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                        REFERENCES public.tenants(id) ON DELETE CASCADE,
    sale_id         uuid NOT NULL REFERENCES public.sale_transactions(id) ON DELETE RESTRICT,
    product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id        uuid NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    quantity        numeric(14,3) NOT NULL CHECK (quantity > 0),
    refund_amount   numeric(14,2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
    created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_returns_supplier ON public.supplier_returns(tenant_id, supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_returns_sale ON public.customer_returns(tenant_id, sale_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 11) Alert system and POS batch allocation traceability
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_alerts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                            REFERENCES public.tenants(id) ON DELETE CASCADE,
    alert_type          text NOT NULL
                            CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring_soon', 'reorder_level', 'expired_stock')),
    severity            text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    product_id          uuid REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id            uuid REFERENCES public.batches(id) ON DELETE CASCADE,
    message             text NOT NULL,
    generated_by_system boolean NOT NULL DEFAULT true,
    is_acknowledged     boolean NOT NULL DEFAULT false,
    resolved_at         timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_alerts_open
    ON public.inventory_alerts(tenant_id, alert_type, product_id, batch_id)
    WHERE resolved_at IS NULL AND generated_by_system = true;

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_tenant_open ON public.inventory_alerts(tenant_id, created_at DESC) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS public.sale_batch_allocations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
                            REFERENCES public.tenants(id) ON DELETE CASCADE,
    transaction_id      uuid NOT NULL REFERENCES public.sale_transactions(id) ON DELETE CASCADE,
    sale_item_id        uuid NOT NULL REFERENCES public.sale_items(id) ON DELETE CASCADE,
    product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id            uuid NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    quantity_deducted   numeric(14,3) NOT NULL CHECK (quantity_deducted > 0),
    unit_name           text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_batch_allocations_tx ON public.sale_batch_allocations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sale_batch_allocations_batch ON public.sale_batch_allocations(batch_id);

ALTER TABLE public.sale_items
    ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- ----------------------------------------------------------------------------
-- 12) Updated-at triggers
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_grn_updated_at ON public.grn;
CREATE TRIGGER trg_grn_updated_at
BEFORE UPDATE ON public.grn
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_batches_updated_at ON public.batches;
CREATE TRIGGER trg_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory;
CREATE TRIGGER trg_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_units_updated_at ON public.units;
CREATE TRIGGER trg_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_invoices_updated_at ON public.purchase_invoices;
CREATE TRIGGER trg_purchase_invoices_updated_at
BEFORE UPDATE ON public.purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 13) Compatibility backfill (existing inventory_items/item_batches -> products/batches)
-- ----------------------------------------------------------------------------

INSERT INTO public.products (
    id,
    tenant_id,
    product_code,
    medicine_name,
    generic_name,
    brand_name,
    category,
    manufacturer,
    barcode,
    unit_type,
    pack_size,
    minimum_stock_level,
    reorder_level,
    storage_conditions,
    notes,
    prescription_required,
    controlled_drug,
    tax_category,
    created_at,
    updated_at
)
SELECT
    ii.id,
    COALESCE(ii.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(NULLIF(ii.sku, ''), 'SKU-' || LEFT(ii.id::text, 8)),
    ii.name,
    ii.generic_name,
    NULL,
    ii.category,
    NULL,
    NULL,
    COALESCE(ii.unit, 'unit'),
    GREATEST(COALESCE(ii.minimum_order_quantity, 1), 1),
    COALESCE(ii.minimum_order_quantity, 0),
    COALESCE(ii.reorder_level, 0),
    NULL,
    ii.description,
    false,
    COALESCE(ii.is_controlled, false),
    NULL,
    ii.created_at,
    ii.updated_at
FROM public.inventory_items ii
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.units (tenant_id, product_id, unit_name, conversion_factor, is_base)
SELECT
    p.tenant_id,
    p.id,
    p.unit_type,
    1,
    true
FROM public.products p
ON CONFLICT (tenant_id, product_id, unit_name) DO UPDATE
SET conversion_factor = EXCLUDED.conversion_factor,
    is_base = true,
    updated_at = now();

INSERT INTO public.batches (
    id,
    tenant_id,
    product_id,
    batch_number,
    expiry_date,
    manufacturing_date,
    purchase_price,
    selling_price,
    supplier_id,
    grn_id,
    quantity,
    status,
    created_at,
    updated_at
)
SELECT
    ib.id,
    COALESCE(ib.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    ib.item_id,
    ib.batch_number,
    ib.expiry_date,
    ib.purchase_date,
    COALESCE(ib.cost_price, 0),
    COALESCE(ii.selling_price, 0),
    NULL,
    NULL,
    COALESCE(ib.quantity, 0),
    CASE ib.status
        WHEN 'active' THEN 'active'
        WHEN 'quarantined' THEN 'quarantined'
        WHEN 'disposed' THEN 'expired'
        WHEN 'depleted' THEN 'depleted'
        ELSE 'active'
    END,
    ib.created_at,
    ib.updated_at
FROM public.item_batches ib
JOIN public.inventory_items ii ON ii.id = ib.item_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inventory (
    tenant_id,
    product_id,
    batch_id,
    quantity_available,
    unit_type,
    created_at,
    updated_at
)
SELECT
    b.tenant_id,
    b.product_id,
    b.id,
    b.quantity,
    p.unit_type,
    b.created_at,
    b.updated_at
FROM public.batches b
JOIN public.products p ON p.id = b.product_id
ON CONFLICT (batch_id) DO UPDATE
SET quantity_available = EXCLUDED.quantity_available,
    unit_type = EXCLUDED.unit_type,
    updated_at = now();

UPDATE public.sale_items si
SET product_id = si.item_id
WHERE si.product_id IS NULL
  AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = si.item_id);

-- ----------------------------------------------------------------------------
-- 14) Sync and conversion service functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.to_base_units(
    p_product_id uuid,
    p_quantity numeric,
    p_unit_name text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_factor numeric := 1;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than zero';
    END IF;

    IF p_unit_name IS NOT NULL AND btrim(p_unit_name) <> '' THEN
        SELECT u.conversion_factor
        INTO v_factor
        FROM public.units u
        WHERE u.product_id = p_product_id
          AND lower(u.unit_name) = lower(p_unit_name)
        LIMIT 1;

        IF v_factor IS NULL THEN
            RAISE EXCEPTION 'Unit % is not configured for product %', p_unit_name, p_product_id;
        END IF;
    END IF;

    RETURN p_quantity * v_factor;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_legacy_inventory_item(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product           public.products%ROWTYPE;
    v_total_qty         numeric := 0;
    v_next_expiry       date;
    v_avg_cost          numeric;
    v_avg_selling       numeric;
BEGIN
    SELECT *
    INTO v_product
    FROM public.products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT
        COALESCE(SUM(b.quantity), 0),
        MIN(b.expiry_date) FILTER (WHERE b.quantity > 0 AND b.status IN ('active', 'quarantined')),
        AVG(NULLIF(b.purchase_price, 0)) FILTER (WHERE b.quantity > 0),
        AVG(NULLIF(b.selling_price, 0)) FILTER (WHERE b.quantity > 0)
    INTO v_total_qty, v_next_expiry, v_avg_cost, v_avg_selling
    FROM public.batches b
    WHERE b.product_id = p_product_id;

    INSERT INTO public.inventory_items (
        id,
        name,
        sku,
        category,
        quantity,
        unit,
        cost_price,
        selling_price,
        expiry_date,
        is_controlled,
        reorder_level,
        minimum_order_quantity,
        generic_name,
        description,
        tenant_id,
        created_at,
        updated_at
    )
    VALUES (
        v_product.id,
        v_product.medicine_name,
        v_product.product_code,
        v_product.category,
        GREATEST(v_total_qty, 0)::integer,
        v_product.unit_type,
        COALESCE(v_avg_cost, 0),
        COALESCE(v_avg_selling, 0),
        v_next_expiry,
        v_product.controlled_drug,
        GREATEST(v_product.reorder_level, 0)::integer,
        GREATEST(v_product.pack_size, 1),
        v_product.generic_name,
        v_product.notes,
        v_product.tenant_id,
        v_product.created_at,
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        sku = EXCLUDED.sku,
        category = EXCLUDED.category,
        quantity = EXCLUDED.quantity,
        unit = EXCLUDED.unit,
        cost_price = EXCLUDED.cost_price,
        selling_price = EXCLUDED.selling_price,
        expiry_date = EXCLUDED.expiry_date,
        is_controlled = EXCLUDED.is_controlled,
        reorder_level = EXCLUDED.reorder_level,
        minimum_order_quantity = EXCLUDED.minimum_order_quantity,
        generic_name = EXCLUDED.generic_name,
        description = EXCLUDED.description,
        tenant_id = EXCLUDED.tenant_id,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_legacy_item_batch(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch      public.batches%ROWTYPE;
    v_supplier   text;
    v_status     text;
BEGIN
    SELECT *
    INTO v_batch
    FROM public.batches
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT s.supplier_name INTO v_supplier
    FROM public.suppliers s
    WHERE s.id = v_batch.supplier_id;

    v_status := CASE v_batch.status
        WHEN 'active' THEN 'active'
        WHEN 'quarantined' THEN 'quarantined'
        WHEN 'recalled' THEN 'quarantined'
        WHEN 'expired' THEN 'disposed'
        WHEN 'depleted' THEN 'depleted'
        ELSE 'active'
    END;

    INSERT INTO public.item_batches (
        id,
        item_id,
        batch_number,
        quantity,
        expiry_date,
        purchase_date,
        supplier,
        cost_price,
        status,
        location,
        created_at,
        updated_at,
        tenant_id
    )
    VALUES (
        v_batch.id,
        v_batch.product_id,
        v_batch.batch_number,
        GREATEST(v_batch.quantity, 0)::integer,
        v_batch.expiry_date,
        v_batch.manufacturing_date,
        v_supplier,
        v_batch.purchase_price,
        v_status,
        NULL,
        v_batch.created_at,
        v_batch.updated_at,
        v_batch.tenant_id
    )
    ON CONFLICT (id) DO UPDATE
    SET
        item_id = EXCLUDED.item_id,
        batch_number = EXCLUDED.batch_number,
        quantity = EXCLUDED.quantity,
        expiry_date = EXCLUDED.expiry_date,
        purchase_date = EXCLUDED.purchase_date,
        supplier = EXCLUDED.supplier,
        cost_price = EXCLUDED.cost_price,
        status = EXCLUDED.status,
        updated_at = now(),
        tenant_id = EXCLUDED.tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_inventory_for_batch(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch      public.batches%ROWTYPE;
    v_unit       text;
BEGIN
    SELECT *
    INTO v_batch
    FROM public.batches
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT p.unit_type INTO v_unit
    FROM public.products p
    WHERE p.id = v_batch.product_id;

    INSERT INTO public.inventory (
        tenant_id,
        product_id,
        batch_id,
        quantity_available,
        unit_type,
        created_at,
        updated_at
    )
    VALUES (
        v_batch.tenant_id,
        v_batch.product_id,
        v_batch.id,
        GREATEST(v_batch.quantity, 0),
        COALESCE(v_unit, 'unit'),
        now(),
        now()
    )
    ON CONFLICT (batch_id) DO UPDATE
    SET
        tenant_id = EXCLUDED.tenant_id,
        product_id = EXCLUDED.product_id,
        quantity_available = EXCLUDED.quantity_available,
        unit_type = EXCLUDED.unit_type,
        updated_at = now();

    PERFORM public.sync_legacy_item_batch(v_batch.id);
    PERFORM public.sync_legacy_inventory_item(v_batch.product_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_product_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.units (tenant_id, product_id, unit_name, conversion_factor, is_base)
    VALUES (NEW.tenant_id, NEW.id, NEW.unit_type, 1, true)
    ON CONFLICT (tenant_id, product_id, unit_name) DO UPDATE
    SET conversion_factor = 1,
        is_base = true,
        updated_at = now();

    PERFORM public.sync_legacy_inventory_item(NEW.id);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_batch_inventory_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.inventory WHERE batch_id = OLD.id;
        DELETE FROM public.item_batches WHERE id = OLD.id;
        PERFORM public.sync_legacy_inventory_item(OLD.product_id);
        RETURN OLD;
    END IF;

    PERFORM public.sync_inventory_for_batch(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_sync ON public.products;
CREATE TRIGGER trg_products_sync
AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_product_sync();

DROP TRIGGER IF EXISTS trg_batches_sync ON public.batches;
CREATE TRIGGER trg_batches_sync
AFTER INSERT OR UPDATE OR DELETE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION public.handle_batch_inventory_sync();

-- ----------------------------------------------------------------------------
-- 15) Number generators for GRN and purchase invoices
-- ----------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.grn_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.purchase_invoice_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_grn_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.grn_number IS NULL OR btrim(NEW.grn_number) = '' THEN
        NEW.grn_number := 'GRN-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.grn_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grn_number ON public.grn;
CREATE TRIGGER trg_grn_number
BEFORE INSERT ON public.grn
FOR EACH ROW
EXECUTE FUNCTION public.generate_grn_number();

-- ----------------------------------------------------------------------------
-- 16) Inventory business service functions (RPC-ready)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_grn(
    p_grn_id uuid,
    p_received_by uuid DEFAULT auth.uid(),
    p_generate_invoice boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_grn               public.grn%ROWTYPE;
    v_item              record;
    v_batch_id          uuid;
    v_invoice_id        uuid;
    v_total_amount      numeric(14,2) := 0;
    v_total_tax         numeric(14,2) := 0;
    v_line_total        numeric(14,2);
    v_ordered_qty       numeric(14,3) := 0;
    v_received_qty      numeric(14,3) := 0;
    v_invoice_number    text;
BEGIN
    IF NOT public.user_has_permission('inventory.add') AND NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION 'Permission denied: missing inventory.add';
    END IF;

    SELECT *
    INTO v_grn
    FROM public.grn
    WHERE id = p_grn_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'GRN % not found', p_grn_id;
    END IF;

    IF v_grn.status = 'Cancelled' THEN
        RAISE EXCEPTION 'Cancelled GRN cannot be confirmed';
    END IF;

    IF v_grn.status = 'Confirmed' THEN
        RETURN jsonb_build_object(
            'grn_id', v_grn.id,
            'status', v_grn.status,
            'message', 'GRN already confirmed'
        );
    END IF;

    UPDATE public.grn
    SET status = 'Confirmed',
        received_by = COALESCE(p_received_by, auth.uid()),
        confirmed_at = now(),
        updated_at = now()
    WHERE id = p_grn_id;

    FOR v_item IN
        SELECT gi.*
        FROM public.grn_items gi
        WHERE gi.grn_id = p_grn_id
    LOOP
        INSERT INTO public.batches (
            tenant_id,
            product_id,
            batch_number,
            expiry_date,
            manufacturing_date,
            purchase_price,
            selling_price,
            supplier_id,
            grn_id,
            quantity,
            status
        )
        VALUES (
            v_grn.tenant_id,
            v_item.product_id,
            v_item.batch_number,
            v_item.expiry_date,
            v_item.manufacturing_date,
            v_item.purchase_price,
            v_item.selling_price,
            v_grn.supplier_id,
            v_grn.id,
            v_item.quantity_received,
            CASE WHEN v_item.expiry_date < current_date THEN 'expired' ELSE 'active' END
        )
        ON CONFLICT (tenant_id, product_id, batch_number) DO UPDATE
        SET
            expiry_date = EXCLUDED.expiry_date,
            manufacturing_date = EXCLUDED.manufacturing_date,
            purchase_price = EXCLUDED.purchase_price,
            selling_price = EXCLUDED.selling_price,
            supplier_id = EXCLUDED.supplier_id,
            grn_id = EXCLUDED.grn_id,
            quantity = public.batches.quantity + EXCLUDED.quantity,
            status = CASE
                        WHEN EXCLUDED.expiry_date < current_date THEN 'expired'
                        WHEN public.batches.quantity + EXCLUDED.quantity = 0 THEN 'depleted'
                        ELSE 'active'
                     END,
            updated_at = now()
        RETURNING id INTO v_batch_id;

        v_line_total := ((v_item.purchase_price * v_item.quantity_received) - v_item.discount + v_item.tax)::numeric(14,2);
        v_total_amount := v_total_amount + GREATEST(v_line_total, 0);
        v_total_tax := v_total_tax + v_item.tax;

        INSERT INTO public.stock_movements (
            tenant_id,
            product_id,
            batch_id,
            action_type,
            quantity_change,
            reference_id,
            reference_type,
            performed_by,
            metadata
        )
        VALUES (
            v_grn.tenant_id,
            v_item.product_id,
            v_batch_id,
            'GRN',
            v_item.quantity_received,
            v_grn.id,
            'GRN',
            COALESCE(p_received_by, auth.uid()),
            jsonb_build_object(
                'grn_number', v_grn.grn_number,
                'batch_number', v_item.batch_number,
                'purchase_price', v_item.purchase_price,
                'selling_price', v_item.selling_price
            )
        );
    END LOOP;

    IF p_generate_invoice THEN
        v_invoice_number := 'PINV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.purchase_invoice_seq')::text, 6, '0');

        INSERT INTO public.purchase_invoices (
            tenant_id,
            invoice_number,
            supplier_id,
            grn_id,
            invoice_date,
            total_amount,
            tax,
            payment_status,
            outstanding_balance
        )
        VALUES (
            v_grn.tenant_id,
            v_invoice_number,
            v_grn.supplier_id,
            v_grn.id,
            v_grn.received_date,
            v_total_amount,
            v_total_tax,
            'unpaid',
            v_total_amount
        )
        ON CONFLICT (grn_id) DO UPDATE
        SET
            total_amount = EXCLUDED.total_amount,
            tax = EXCLUDED.tax,
            outstanding_balance = EXCLUDED.outstanding_balance,
            updated_at = now()
        RETURNING id INTO v_invoice_id;
    END IF;

    IF v_grn.purchase_order_id IS NOT NULL THEN
        SELECT COALESCE(SUM(poi.quantity), 0)
        INTO v_ordered_qty
        FROM public.purchase_order_items poi
        WHERE poi.purchase_order_id = v_grn.purchase_order_id;

        SELECT COALESCE(SUM(gi.quantity_received), 0)
        INTO v_received_qty
        FROM public.grn g
        JOIN public.grn_items gi ON gi.grn_id = g.id
        WHERE g.purchase_order_id = v_grn.purchase_order_id
          AND g.status = 'Confirmed';

        UPDATE public.purchase_orders
        SET status = CASE
                        WHEN v_received_qty = 0 THEN 'Ordered'::public.purchase_order_status_enum
                        WHEN v_received_qty < v_ordered_qty THEN 'Partially Received'::public.purchase_order_status_enum
                        ELSE 'Completed'::public.purchase_order_status_enum
                     END,
            updated_at = now()
        WHERE id = v_grn.purchase_order_id;
    END IF;

    RETURN jsonb_build_object(
        'grn_id', v_grn.id,
        'status', 'Confirmed',
        'invoice_id', v_invoice_id,
        'total_amount', v_total_amount,
        'tax', v_total_tax
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_stock_adjustment(
    p_product_id uuid,
    p_batch_id uuid,
    p_adjustment_type public.stock_adjustment_type_enum,
    p_quantity_change numeric,
    p_reason text,
    p_created_by uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch              public.batches%ROWTYPE;
    v_tenant_id          uuid;
    v_delta              numeric;
    v_adjustment_id      uuid;
BEGIN
    IF p_quantity_change IS NULL OR p_quantity_change <= 0 THEN
        RAISE EXCEPTION 'Quantity change must be greater than zero';
    END IF;

    SELECT *
    INTO v_batch
    FROM public.batches
    WHERE id = p_batch_id
      AND product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch % for product % not found', p_batch_id, p_product_id;
    END IF;

    v_tenant_id := v_batch.tenant_id;

    IF p_adjustment_type = 'increase' THEN
        v_delta := p_quantity_change;
    ELSE
        v_delta := -p_quantity_change;
    END IF;

    IF v_batch.quantity + v_delta < 0 THEN
        RAISE EXCEPTION 'Adjustment would create negative stock (current: %, delta: %)', v_batch.quantity, v_delta;
    END IF;

    INSERT INTO public.stock_adjustments (
        tenant_id,
        product_id,
        batch_id,
        adjustment_type,
        quantity_change,
        reason,
        created_by
    )
    VALUES (
        v_tenant_id,
        p_product_id,
        p_batch_id,
        p_adjustment_type,
        p_quantity_change,
        p_reason,
        p_created_by
    )
    RETURNING id INTO v_adjustment_id;

    UPDATE public.batches
    SET quantity = quantity + v_delta,
        status = CASE
                    WHEN quantity + v_delta = 0 THEN 'depleted'
                    WHEN expiry_date < current_date THEN 'expired'
                    ELSE status
                 END,
        updated_at = now()
    WHERE id = p_batch_id;

    INSERT INTO public.stock_movements (
        tenant_id,
        product_id,
        batch_id,
        action_type,
        quantity_change,
        reference_id,
        reference_type,
        performed_by,
        metadata
    )
    VALUES (
        v_tenant_id,
        p_product_id,
        p_batch_id,
        'Adjustment',
        v_delta,
        v_adjustment_id,
        'stock_adjustment',
        p_created_by,
        jsonb_build_object(
            'adjustment_type', p_adjustment_type,
            'reason', p_reason
        )
    );

    PERFORM public.sync_inventory_for_batch(p_batch_id);

    RETURN v_adjustment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_supplier_return(
    p_supplier_id uuid,
    p_product_id uuid,
    p_batch_id uuid,
    p_quantity numeric,
    p_reason text,
    p_created_by uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch          public.batches%ROWTYPE;
    v_return_id      uuid;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Return quantity must be greater than zero';
    END IF;

    SELECT *
    INTO v_batch
    FROM public.batches
    WHERE id = p_batch_id
      AND product_id = p_product_id
      AND supplier_id = p_supplier_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Supplier batch not found for return';
    END IF;

    IF v_batch.quantity < p_quantity THEN
        RAISE EXCEPTION 'Insufficient batch stock for supplier return';
    END IF;

    INSERT INTO public.supplier_returns (
        tenant_id,
        supplier_id,
        product_id,
        batch_id,
        quantity,
        reason,
        created_by
    )
    VALUES (
        v_batch.tenant_id,
        p_supplier_id,
        p_product_id,
        p_batch_id,
        p_quantity,
        p_reason,
        p_created_by
    )
    RETURNING id INTO v_return_id;

    UPDATE public.batches
    SET quantity = quantity - p_quantity,
        status = CASE WHEN quantity - p_quantity = 0 THEN 'depleted' ELSE status END,
        updated_at = now()
    WHERE id = p_batch_id;

    INSERT INTO public.stock_movements (
        tenant_id,
        product_id,
        batch_id,
        action_type,
        quantity_change,
        reference_id,
        reference_type,
        performed_by,
        metadata
    )
    VALUES (
        v_batch.tenant_id,
        p_product_id,
        p_batch_id,
        'Return',
        -p_quantity,
        v_return_id,
        'supplier_return',
        p_created_by,
        jsonb_build_object('reason', p_reason)
    );

    PERFORM public.sync_inventory_for_batch(p_batch_id);

    RETURN v_return_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_customer_return(
    p_sale_id uuid,
    p_product_id uuid,
    p_batch_id uuid,
    p_quantity numeric,
    p_refund_amount numeric,
    p_created_by uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch          public.batches%ROWTYPE;
    v_return_id      uuid;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Return quantity must be greater than zero';
    END IF;

    SELECT *
    INTO v_batch
    FROM public.batches
    WHERE id = p_batch_id
      AND product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch not found for customer return';
    END IF;

    INSERT INTO public.customer_returns (
        tenant_id,
        sale_id,
        product_id,
        batch_id,
        quantity,
        refund_amount,
        created_by
    )
    VALUES (
        v_batch.tenant_id,
        p_sale_id,
        p_product_id,
        p_batch_id,
        p_quantity,
        COALESCE(p_refund_amount, 0),
        p_created_by
    )
    RETURNING id INTO v_return_id;

    UPDATE public.batches
    SET quantity = quantity + p_quantity,
        status = CASE
                    WHEN expiry_date < current_date THEN 'expired'
                    WHEN quantity + p_quantity > 0 AND status = 'depleted' THEN 'active'
                    ELSE status
                 END,
        updated_at = now()
    WHERE id = p_batch_id;

    INSERT INTO public.stock_movements (
        tenant_id,
        product_id,
        batch_id,
        action_type,
        quantity_change,
        reference_id,
        reference_type,
        performed_by,
        metadata
    )
    VALUES (
        v_batch.tenant_id,
        p_product_id,
        p_batch_id,
        'Return',
        p_quantity,
        v_return_id,
        'customer_return',
        p_created_by,
        jsonb_build_object(
            'sale_id', p_sale_id,
            'refund_amount', COALESCE(p_refund_amount, 0)
        )
    );

    PERFORM public.sync_inventory_for_batch(p_batch_id);

    RETURN v_return_id;
END;
$$;

DROP FUNCTION IF EXISTS public.deduct_stock_fefo;
DROP FUNCTION IF EXISTS public.deduct_stock_fefo(uuid, numeric, uuid, text, uuid, public.movement_action_type_enum);

CREATE OR REPLACE FUNCTION public.deduct_stock_fefo(
    p_product_id uuid,
    p_quantity numeric,
    p_reference_id uuid,
    p_reference_type text,
    p_performed_by uuid DEFAULT auth.uid(),
    p_action_type public.movement_action_type_enum DEFAULT 'Sale',
    p_allow_expired boolean DEFAULT false
)
RETURNS TABLE (
    batch_id uuid,
    quantity_deducted numeric,
    expiry_date date,
    error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remaining        numeric := p_quantity;
    v_take             numeric;
    v_available        numeric := 0;
    v_batch            record;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Requested quantity must be greater than zero';
    END IF;

    SELECT COALESCE(SUM(b.quantity), 0)
    INTO v_available
    FROM public.batches b
    WHERE b.product_id = p_product_id
      AND b.status = 'active'
      AND b.quantity > 0
      AND (p_allow_expired OR b.expiry_date >= current_date);

    IF v_available < p_quantity THEN
        batch_id := NULL;
        quantity_deducted := 0;
        expiry_date := NULL;
        error_code := 'INSUFFICIENT_STOCK';
        RETURN NEXT;
        RETURN;
    END IF;

    FOR v_batch IN
        SELECT b.id, b.tenant_id, b.quantity, b.expiry_date
        FROM public.batches b
        WHERE b.product_id = p_product_id
          AND b.status = 'active'
          AND b.quantity > 0
          AND (p_allow_expired OR b.expiry_date >= current_date)
        ORDER BY b.expiry_date ASC, b.created_at ASC
        FOR UPDATE OF b
    LOOP
        EXIT WHEN v_remaining <= 0;

        v_take := LEAST(v_batch.quantity, v_remaining);

        UPDATE public.batches
        SET quantity = quantity - v_take,
            status = CASE
                        WHEN quantity - v_take = 0 THEN 'depleted'
                        WHEN expiry_date < current_date THEN 'expired'
                        ELSE status
                     END,
            updated_at = now()
        WHERE id = v_batch.id;

        INSERT INTO public.stock_movements (
            tenant_id,
            product_id,
            batch_id,
            action_type,
            quantity_change,
            reference_id,
            reference_type,
            performed_by,
            metadata
        )
        VALUES (
            v_batch.tenant_id,
            p_product_id,
            v_batch.id,
            p_action_type,
            -v_take,
            p_reference_id,
            p_reference_type,
            p_performed_by,
            jsonb_build_object(
                'fefo', true,
                'batch_expiry', v_batch.expiry_date
            )
        );

        PERFORM public.sync_inventory_for_batch(v_batch.id);

        v_remaining := v_remaining - v_take;

        batch_id := v_batch.id;
        quantity_deducted := v_take;
        expiry_date := v_batch.expiry_date;
        error_code := NULL;
        RETURN NEXT;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_pos_sale_fefo(
    p_payment_method text,
    p_discount_amount numeric,
    p_tax_rate numeric,
    p_notes text,
    p_cart jsonb,
    p_patient_id uuid DEFAULT NULL,
    p_prescription_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id                uuid;
    v_tenant_id              uuid;
    v_tx                     public.sale_transactions%ROWTYPE;
    v_item                   jsonb;
    v_alloc                  record;
    v_product                public.products%ROWTYPE;
    v_product_id_text        text;
    v_product_id             uuid;
    v_requested_qty          numeric;
    v_base_qty               numeric;
    v_unit_name              text;
    v_unit_price             numeric;
    v_line_subtotal          numeric;
    v_subtotal               numeric := 0;
    v_after_discount         numeric := 0;
    v_tax_amount             numeric := 0;
    v_total                  numeric := 0;
    v_sale_item_id           uuid;
    v_primary_batch_id       uuid;
    v_allocations            jsonb := '[]'::jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT public.user_has_permission('sales.create') THEN
        RAISE EXCEPTION 'Permission denied: missing sales.create';
    END IF;

    IF p_payment_method NOT IN ('cash', 'card', 'split') THEN
        RAISE EXCEPTION 'Invalid payment method';
    END IF;

    SELECT u.tenant_id
    INTO v_tenant_id
    FROM public.users u
    WHERE u.id = v_user_id;

    v_tenant_id := COALESCE(v_tenant_id, public.current_tenant_id());

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
    LOOP
        v_requested_qty := COALESCE((v_item ->> 'quantity')::numeric, 0);
        v_unit_price := COALESCE((v_item ->> 'unit_price')::numeric, 0);
        v_line_subtotal := COALESCE((v_item ->> 'subtotal')::numeric, v_requested_qty * v_unit_price);

        IF v_requested_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero';
        END IF;

        v_subtotal := v_subtotal + v_line_subtotal;
    END LOOP;

    v_after_discount := GREATEST(v_subtotal - COALESCE(p_discount_amount, 0), 0);
    v_tax_amount := ROUND(v_after_discount * (COALESCE(p_tax_rate, 0) / 100.0), 2);
    v_total := v_after_discount + v_tax_amount;

    INSERT INTO public.sale_transactions (
        payment_method,
        subtotal,
        discount_amount,
        tax_rate,
        tax_amount,
        total,
        notes,
        sold_by,
        tenant_id,
        status,
        patient_id,
        prescription_id
    )
    VALUES (
        p_payment_method,
        v_subtotal,
        COALESCE(p_discount_amount, 0),
        COALESCE(p_tax_rate, 0),
        v_tax_amount,
        v_total,
        COALESCE(p_notes, 'POS Sale FEFO'),
        v_user_id,
        v_tenant_id,
        'completed',
        p_patient_id,
        p_prescription_id
    )
    RETURNING * INTO v_tx;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
    LOOP
        v_product_id_text := COALESCE(v_item ->> 'product_id', v_item ->> 'item_id');
        IF v_product_id_text IS NULL THEN
            RAISE EXCEPTION 'Missing product_id/item_id in cart payload';
        END IF;

        v_product_id := v_product_id_text::uuid;

        SELECT *
        INTO v_product
        FROM public.products
        WHERE id = v_product_id
          AND tenant_id = v_tenant_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found in tenant %', v_product_id, v_tenant_id;
        END IF;

        v_requested_qty := COALESCE((v_item ->> 'quantity')::numeric, 0);
        IF v_requested_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity for product %', v_product_id;
        END IF;

        IF v_requested_qty <> trunc(v_requested_qty) THEN
            RAISE EXCEPTION 'Sale quantity must be a whole number for sale_items schema';
        END IF;

        v_unit_name := COALESCE(NULLIF(v_item ->> 'unit', ''), v_product.unit_type);
        v_unit_price := COALESCE(
            (v_item ->> 'unit_price')::numeric,
            (
                SELECT b2.selling_price
                FROM public.batches b2
                WHERE b2.product_id = v_product_id
                  AND b2.status = 'active'
                  AND b2.quantity > 0
                ORDER BY b2.expiry_date ASC, b2.created_at ASC
                LIMIT 1
            ),
            0
        );
        v_line_subtotal := COALESCE((v_item ->> 'subtotal')::numeric, v_unit_price * v_requested_qty);
        v_base_qty := public.to_base_units(v_product_id, v_requested_qty, v_unit_name);

        PERFORM public.sync_legacy_inventory_item(v_product_id);

        INSERT INTO public.sale_items (
            transaction_id,
            item_id,
            product_id,
            batch_id,
            item_name,
            item_sku,
            item_unit,
            unit_price,
            quantity,
            subtotal
        )
        VALUES (
            v_tx.id,
            v_product_id,
            v_product_id,
            NULL,
            COALESCE(v_item ->> 'name', v_product.medicine_name),
            COALESCE(v_item ->> 'sku', v_product.product_code),
            v_unit_name,
            v_unit_price,
            v_requested_qty::integer,
            v_line_subtotal
        )
        RETURNING id INTO v_sale_item_id;

        v_primary_batch_id := NULL;

        FOR v_alloc IN
            SELECT *
            FROM public.deduct_stock_fefo(
                v_product_id,
                v_base_qty,
                v_tx.id,
                'sale_transaction',
                v_user_id,
                'Sale',
                false
            )
        LOOP
            IF v_alloc.error_code IS NOT NULL THEN
                -- Rollback transaction and return error JSON
                RAISE EXCEPTION 'INSUFFICIENT_STOCK: product %', v_product_id;
            END IF;

            INSERT INTO public.sale_batch_allocations (
                tenant_id,
                transaction_id,
                sale_item_id,
                product_id,
                batch_id,
                quantity_deducted,
                unit_name
            )
            VALUES (
                v_tenant_id,
                v_tx.id,
                v_sale_item_id,
                v_product_id,
                v_alloc.batch_id,
                v_alloc.quantity_deducted,
                v_unit_name
            );

            IF v_primary_batch_id IS NULL THEN
                v_primary_batch_id := v_alloc.batch_id;
            END IF;

            v_allocations := v_allocations || jsonb_build_array(
                jsonb_build_object(
                    'sale_item_id', v_sale_item_id,
                    'product_id', v_product_id,
                    'batch_id', v_alloc.batch_id,
                    'quantity_deducted', v_alloc.quantity_deducted,
                    'expiry_date', v_alloc.expiry_date
                )
            );
        END LOOP;

        UPDATE public.sale_items
        SET batch_id = v_primary_batch_id
        WHERE id = v_sale_item_id
          AND v_primary_batch_id IS NOT NULL;
    END LOOP;

    RETURN jsonb_build_object(
        'transaction', to_jsonb(v_tx),
        'batch_allocations', v_allocations
    );
END;
$$;

-- Backward-compatible entry point used by existing POS clients.
-- This now delegates to FEFO logic and keeps the original function signature.
CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_payment_method text,
    p_discount_amount numeric,
    p_tax_rate numeric,
    p_notes text,
    p_cart jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        public.process_pos_sale_fefo(
            p_payment_method,
            p_discount_amount,
            p_tax_rate,
            p_notes,
            p_cart,
            NULL,
            NULL
        ) -> 'transaction'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_product_for_barcode(
    p_barcode text
)
RETURNS TABLE (
    product_id uuid,
    product_code text,
    medicine_name text,
    unit_type text,
    fefo_batch_id uuid,
    fefo_batch_number text,
    fefo_expiry date,
    fefo_quantity_available numeric,
    selling_price numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p.id AS product_id,
        p.product_code,
        p.medicine_name,
        p.unit_type,
        b.id AS fefo_batch_id,
        b.batch_number AS fefo_batch_number,
        b.expiry_date AS fefo_expiry,
        b.quantity AS fefo_quantity_available,
        b.selling_price
    FROM public.products p
    LEFT JOIN LATERAL (
        SELECT b1.*
        FROM public.batches b1
        WHERE b1.product_id = p.id
          AND b1.status = 'active'
          AND b1.quantity > 0
          AND b1.expiry_date >= current_date
        ORDER BY b1.expiry_date ASC, b1.created_at ASC
        LIMIT 1
    ) b ON true
    WHERE p.barcode = p_barcode
      AND p.tenant_id = public.current_tenant_id()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.generate_inventory_alerts(
    p_tenant_id uuid DEFAULT public.current_tenant_id(),
    p_expiring_days integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer := 0;
    v_rows integer := 0;
BEGIN
    DELETE FROM public.inventory_alerts ia
    WHERE ia.tenant_id = p_tenant_id
      AND ia.generated_by_system = true
      AND ia.resolved_at IS NULL
      AND ia.alert_type IN ('low_stock', 'out_of_stock', 'expiring_soon', 'reorder_level', 'expired_stock');

    WITH product_stock AS (
        SELECT
            p.id AS product_id,
            p.tenant_id,
            p.medicine_name,
            p.minimum_stock_level,
            p.reorder_level,
            COALESCE(SUM(b.quantity) FILTER (WHERE b.status IN ('active', 'quarantined')), 0) AS total_qty
        FROM public.products p
        LEFT JOIN public.batches b ON b.product_id = p.id
        WHERE p.tenant_id = p_tenant_id
        GROUP BY p.id, p.tenant_id, p.medicine_name, p.minimum_stock_level, p.reorder_level
    )
    INSERT INTO public.inventory_alerts (
        tenant_id,
        alert_type,
        severity,
        product_id,
        batch_id,
        message,
        generated_by_system
    )
    SELECT
        ps.tenant_id,
        CASE
            WHEN ps.total_qty = 0 THEN 'out_of_stock'
            WHEN ps.total_qty <= ps.minimum_stock_level THEN 'low_stock'
            ELSE 'reorder_level'
        END AS alert_type,
        CASE
            WHEN ps.total_qty = 0 THEN 'critical'
            WHEN ps.total_qty <= ps.minimum_stock_level THEN 'warning'
            ELSE 'info'
        END AS severity,
        ps.product_id,
        NULL::uuid,
        CASE
            WHEN ps.total_qty = 0 THEN ps.medicine_name || ' is out of stock'
            WHEN ps.total_qty <= ps.minimum_stock_level THEN ps.medicine_name || ' is below minimum stock level'
            ELSE ps.medicine_name || ' reached reorder level'
        END AS message,
        true
    FROM product_stock ps
    WHERE ps.total_qty = 0
       OR ps.total_qty <= ps.minimum_stock_level
       OR ps.total_qty <= ps.reorder_level
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;

    INSERT INTO public.inventory_alerts (
        tenant_id,
        alert_type,
        severity,
        product_id,
        batch_id,
        message,
        generated_by_system
    )
    SELECT
        b.tenant_id,
        CASE WHEN b.expiry_date < current_date THEN 'expired_stock' ELSE 'expiring_soon' END,
        CASE WHEN b.expiry_date < current_date THEN 'critical' ELSE 'warning' END,
        b.product_id,
        b.id,
        CASE
            WHEN b.expiry_date < current_date THEN
                p.medicine_name || ' batch ' || b.batch_number || ' is expired'
            ELSE
                p.medicine_name || ' batch ' || b.batch_number || ' expires on ' || b.expiry_date::text
        END,
        true
    FROM public.batches b
    JOIN public.products p ON p.id = b.product_id
    WHERE b.tenant_id = p_tenant_id
      AND b.quantity > 0
      AND b.status IN ('active', 'quarantined', 'expired')
      AND b.expiry_date <= (current_date + make_interval(days => GREATEST(p_expiring_days, 0)))
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;

    RETURN v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 17) Reporting SQL functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.inventory_report_stock_valuation(
    p_tenant_id uuid DEFAULT public.current_tenant_id()
)
RETURNS TABLE (
    product_id uuid,
    product_code text,
    medicine_name text,
    total_quantity numeric,
    average_purchase_price numeric,
    stock_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p.id,
        p.product_code,
        p.medicine_name,
        COALESCE(SUM(b.quantity) FILTER (WHERE b.status IN ('active', 'quarantined')), 0) AS total_quantity,
        COALESCE(AVG(NULLIF(b.purchase_price, 0)) FILTER (WHERE b.quantity > 0), 0) AS average_purchase_price,
        COALESCE(SUM(b.quantity * b.purchase_price) FILTER (WHERE b.status IN ('active', 'quarantined')), 0) AS stock_value
    FROM public.products p
    LEFT JOIN public.batches b ON b.product_id = p.id
    WHERE p.tenant_id = p_tenant_id
    GROUP BY p.id, p.product_code, p.medicine_name
    ORDER BY p.medicine_name;
$$;

CREATE OR REPLACE FUNCTION public.inventory_report_batch(
    p_tenant_id uuid DEFAULT public.current_tenant_id()
)
RETURNS TABLE (
    batch_id uuid,
    product_id uuid,
    product_code text,
    medicine_name text,
    batch_number text,
    expiry_date date,
    purchase_price numeric,
    selling_price numeric,
    quantity numeric,
    status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        b.id,
        p.id,
        p.product_code,
        p.medicine_name,
        b.batch_number,
        b.expiry_date,
        b.purchase_price,
        b.selling_price,
        b.quantity,
        b.status
    FROM public.batches b
    JOIN public.products p ON p.id = b.product_id
    WHERE b.tenant_id = p_tenant_id
    ORDER BY b.expiry_date ASC, p.medicine_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.inventory_report_expiry(
    p_tenant_id uuid DEFAULT public.current_tenant_id(),
    p_days integer DEFAULT 90
)
RETURNS TABLE (
    batch_id uuid,
    product_id uuid,
    medicine_name text,
    batch_number text,
    expiry_date date,
    quantity numeric,
    days_to_expiry integer,
    expiry_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        b.id,
        p.id,
        p.medicine_name,
        b.batch_number,
        b.expiry_date,
        b.quantity,
        (b.expiry_date - current_date)::integer AS days_to_expiry,
        CASE
            WHEN b.expiry_date < current_date THEN 'expired'
            WHEN b.expiry_date <= current_date + make_interval(days => p_days) THEN 'near_expiry'
            ELSE 'ok'
        END AS expiry_status
    FROM public.batches b
    JOIN public.products p ON p.id = b.product_id
    WHERE b.tenant_id = p_tenant_id
      AND b.quantity > 0
      AND b.expiry_date <= current_date + make_interval(days => GREATEST(p_days, 0))
    ORDER BY b.expiry_date ASC;
$$;

CREATE OR REPLACE FUNCTION public.inventory_report_low_stock(
    p_tenant_id uuid DEFAULT public.current_tenant_id()
)
RETURNS TABLE (
    product_id uuid,
    product_code text,
    medicine_name text,
    total_quantity numeric,
    minimum_stock_level numeric,
    reorder_level numeric,
    stock_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH product_stock AS (
        SELECT
            p.id,
            p.product_code,
            p.medicine_name,
            p.minimum_stock_level,
            p.reorder_level,
            COALESCE(SUM(b.quantity) FILTER (WHERE b.status IN ('active', 'quarantined')), 0) AS total_quantity
        FROM public.products p
        LEFT JOIN public.batches b ON b.product_id = p.id
        WHERE p.tenant_id = p_tenant_id
        GROUP BY p.id, p.product_code, p.medicine_name, p.minimum_stock_level, p.reorder_level
    )
    SELECT
        ps.id,
        ps.product_code,
        ps.medicine_name,
        ps.total_quantity,
        ps.minimum_stock_level,
        ps.reorder_level,
        CASE
            WHEN ps.total_quantity = 0 THEN 'out_of_stock'
            WHEN ps.total_quantity <= ps.minimum_stock_level THEN 'low_stock'
            WHEN ps.total_quantity <= ps.reorder_level THEN 'reorder_level'
            ELSE 'ok'
        END AS stock_status
    FROM product_stock ps
    WHERE ps.total_quantity <= ps.reorder_level
    ORDER BY ps.total_quantity ASC, ps.medicine_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.inventory_report_purchase(
    p_tenant_id uuid DEFAULT public.current_tenant_id(),
    p_date_from date DEFAULT NULL,
    p_date_to date DEFAULT NULL
)
RETURNS TABLE (
    grn_id uuid,
    grn_number text,
    received_date date,
    supplier_id uuid,
    supplier_name text,
    total_items bigint,
    total_quantity numeric,
    total_purchase_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        g.id,
        g.grn_number,
        g.received_date,
        s.id,
        s.supplier_name,
        COUNT(gi.id) AS total_items,
        COALESCE(SUM(gi.quantity_received), 0) AS total_quantity,
        COALESCE(SUM((gi.purchase_price * gi.quantity_received) - gi.discount + gi.tax), 0) AS total_purchase_value
    FROM public.grn g
    JOIN public.suppliers s ON s.id = g.supplier_id
    LEFT JOIN public.grn_items gi ON gi.grn_id = g.id
    WHERE g.tenant_id = p_tenant_id
      AND g.status = 'Confirmed'
      AND (p_date_from IS NULL OR g.received_date >= p_date_from)
      AND (p_date_to IS NULL OR g.received_date <= p_date_to)
    GROUP BY g.id, g.grn_number, g.received_date, s.id, s.supplier_name
    ORDER BY g.received_date DESC, g.grn_number DESC;
$$;

CREATE OR REPLACE FUNCTION public.inventory_report_supplier_purchase(
    p_tenant_id uuid DEFAULT public.current_tenant_id(),
    p_date_from date DEFAULT NULL,
    p_date_to date DEFAULT NULL
)
RETURNS TABLE (
    supplier_id uuid,
    supplier_name text,
    grn_count bigint,
    total_quantity numeric,
    total_purchase_value numeric,
    unpaid_balance numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH purchases AS (
        SELECT
            g.supplier_id,
            COUNT(DISTINCT g.id) AS grn_count,
            COALESCE(SUM(gi.quantity_received), 0) AS total_quantity,
            COALESCE(SUM((gi.purchase_price * gi.quantity_received) - gi.discount + gi.tax), 0) AS total_purchase_value
        FROM public.grn g
        LEFT JOIN public.grn_items gi ON gi.grn_id = g.id
        WHERE g.tenant_id = p_tenant_id
          AND g.status = 'Confirmed'
          AND (p_date_from IS NULL OR g.received_date >= p_date_from)
          AND (p_date_to IS NULL OR g.received_date <= p_date_to)
        GROUP BY g.supplier_id
    ),
    balances AS (
        SELECT
            pi.supplier_id,
            COALESCE(SUM(pi.outstanding_balance), 0) AS unpaid_balance
        FROM public.purchase_invoices pi
        WHERE pi.tenant_id = p_tenant_id
          AND pi.payment_status IN ('unpaid', 'partial')
        GROUP BY pi.supplier_id
    )
    SELECT
        s.id,
        s.supplier_name,
        COALESCE(p.grn_count, 0),
        COALESCE(p.total_quantity, 0),
        COALESCE(p.total_purchase_value, 0),
        COALESCE(b.unpaid_balance, 0)
    FROM public.suppliers s
    LEFT JOIN purchases p ON p.supplier_id = s.id
    LEFT JOIN balances b ON b.supplier_id = s.id
    WHERE s.tenant_id = p_tenant_id
    ORDER BY COALESCE(p.total_purchase_value, 0) DESC, s.supplier_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.inventory_report_movements(
    p_tenant_id uuid DEFAULT public.current_tenant_id(),
    p_date_from timestamptz DEFAULT NULL,
    p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
    movement_id uuid,
    created_at timestamptz,
    action_type public.movement_action_type_enum,
    product_id uuid,
    medicine_name text,
    batch_id uuid,
    batch_number text,
    quantity_change numeric,
    reference_type text,
    reference_id uuid,
    performed_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        sm.id,
        sm.created_at,
        sm.action_type,
        sm.product_id,
        p.medicine_name,
        sm.batch_id,
        b.batch_number,
        sm.quantity_change,
        sm.reference_type,
        sm.reference_id,
        sm.performed_by
    FROM public.stock_movements sm
    JOIN public.products p ON p.id = sm.product_id
    LEFT JOIN public.batches b ON b.id = sm.batch_id
    WHERE sm.tenant_id = p_tenant_id
      AND (p_date_from IS NULL OR sm.created_at >= p_date_from)
      AND (p_date_to IS NULL OR sm.created_at <= p_date_to)
    ORDER BY sm.created_at DESC;
$$;

CREATE OR REPLACE VIEW public.inventory_dashboard_alerts AS
SELECT
    ia.id,
    ia.tenant_id,
    ia.alert_type,
    ia.severity,
    ia.product_id,
    p.medicine_name,
    ia.batch_id,
    b.batch_number,
    ia.message,
    ia.is_acknowledged,
    ia.created_at
FROM public.inventory_alerts ia
LEFT JOIN public.products p ON p.id = ia.product_id
LEFT JOIN public.batches b ON b.id = ia.batch_id
WHERE ia.resolved_at IS NULL;

CREATE OR REPLACE VIEW public.supplier_performance_summary AS
WITH stats AS (
    SELECT
        s.id AS supplier_id,
        s.tenant_id,
        s.supplier_name,
        COUNT(DISTINCT po.id) AS total_purchase_orders,
        COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'Confirmed') AS confirmed_grn_count,
        AVG(
            GREATEST(
                0,
                EXTRACT(EPOCH FROM (g.received_date::timestamp - po.expected_delivery_date::timestamp)) / 86400.0
            )
        ) FILTER (
            WHERE po.expected_delivery_date IS NOT NULL
              AND g.received_date IS NOT NULL
        ) AS avg_delivery_delay_days
    FROM public.suppliers s
    LEFT JOIN public.purchase_orders po ON po.supplier_id = s.id
    LEFT JOIN public.grn g ON g.purchase_order_id = po.id
    GROUP BY s.id, s.tenant_id, s.supplier_name
)
SELECT
    st.supplier_id,
    st.tenant_id,
    st.supplier_name,
    st.total_purchase_orders,
    st.confirmed_grn_count,
    COALESCE(st.avg_delivery_delay_days, 0) AS avg_delivery_delay_days,
    CASE
        WHEN st.avg_delivery_delay_days IS NULL THEN 'No data'
        WHEN st.avg_delivery_delay_days <= 1 THEN 'Excellent'
        WHEN st.avg_delivery_delay_days <= 3 THEN 'Good'
        WHEN st.avg_delivery_delay_days <= 7 THEN 'Fair'
        ELSE 'Poor'
    END AS delivery_performance
FROM stats st;

-- ----------------------------------------------------------------------------
-- 18) RLS and permissions
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT unnest(ARRAY[
            'products',
            'suppliers',
            'purchase_orders',
            'grn',
            'batches',
            'inventory',
            'units',
            'purchase_invoices',
            'stock_adjustments',
            'stock_movements',
            'supplier_returns',
            'customer_returns',
            'inventory_alerts',
            'sale_batch_allocations'
        ])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_update" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.%I', t);

        EXECUTE format(
            'CREATE POLICY "tenant_isolation_select" ON public.%I FOR SELECT USING (tenant_id = public.current_tenant_id() OR public.current_user_is_admin())',
            t
        );
        EXECUTE format(
            'CREATE POLICY "tenant_isolation_insert" ON public.%I FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() OR public.current_user_is_admin())',
            t
        );
        EXECUTE format(
            'CREATE POLICY "tenant_isolation_update" ON public.%I FOR UPDATE USING (tenant_id = public.current_tenant_id() OR public.current_user_is_admin()) WITH CHECK (tenant_id = public.current_tenant_id() OR public.current_user_is_admin())',
            t
        );
        EXECUTE format(
            'CREATE POLICY "tenant_isolation_delete" ON public.%I FOR DELETE USING (tenant_id = public.current_tenant_id() OR public.current_user_is_admin())',
            t
        );
    END LOOP;
END $$;

-- Child tables without tenant_id get tenant isolation through parent records.
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.purchase_order_items;
DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.purchase_order_items;
DROP POLICY IF EXISTS "tenant_isolation_update" ON public.purchase_order_items;
DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.purchase_order_items;

CREATE POLICY "tenant_isolation_select" ON public.purchase_order_items
FOR SELECT USING (
    public.current_user_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
          AND po.tenant_id = public.current_tenant_id()
    )
);

CREATE POLICY "tenant_isolation_insert" ON public.purchase_order_items
FOR INSERT WITH CHECK (
    public.current_user_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
          AND po.tenant_id = public.current_tenant_id()
    )
);

CREATE POLICY "tenant_isolation_update" ON public.purchase_order_items
FOR UPDATE
USING (
    public.current_user_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
          AND po.tenant_id = public.current_tenant_id()
    )
)
WITH CHECK (
    public.current_user_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
          AND po.tenant_id = public.current_tenant_id()
    )
);

CREATE POLICY "tenant_isolation_delete" ON public.purchase_order_items
FOR DELETE USING (
    public.current_user_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
          AND po.tenant_id = public.current_tenant_id()
    )
);

ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.grn_items;
DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.grn_items;
DROP POLICY IF EXISTS "tenant_isolation_update" ON public.grn_items;
DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.grn_items;

CREATE POLICY "tenant_isolation_select" ON public.grn_items
FOR SELECT USING (
    public.current_user_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.grn g
        WHERE g.id = grn_items.grn_id
          AND g.tenant_id = public.current_tenant_id()
    )
);

CREATE POLICY "tenant_isolation_insert" ON public.grn_items
FOR INSERT WITH CHECK (
    public.current_user_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.grn g
        WHERE g.id = grn_items.grn_id
          AND g.tenant_id = public.current_tenant_id()
    )
);

CREATE POLICY "tenant_isolation_update" ON public.grn_items
FOR UPDATE
USING (
    public.current_user_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.grn g
        WHERE g.id = grn_items.grn_id
          AND g.tenant_id = public.current_tenant_id()
    )
)
WITH CHECK (
    public.current_user_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.grn g
        WHERE g.id = grn_items.grn_id
          AND g.tenant_id = public.current_tenant_id()
    )
);

CREATE POLICY "tenant_isolation_delete" ON public.grn_items
FOR DELETE USING (
    public.current_user_is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.grn g
        WHERE g.id = grn_items.grn_id
          AND g.tenant_id = public.current_tenant_id()
    )
);

INSERT INTO public.permissions (key, category, description)
VALUES
    ('inventory.products.view',       'Inventory', 'View medicine master and product catalog'),
    ('inventory.products.manage',     'Inventory', 'Create and update products'),
    ('inventory.suppliers.view',      'Inventory', 'View suppliers'),
    ('inventory.suppliers.manage',    'Inventory', 'Create and update suppliers'),
    ('inventory.purchase.manage',     'Inventory', 'Manage purchase orders, GRN, and invoices'),
    ('inventory.batches.manage',      'Inventory', 'Manage batches and expiry statuses'),
    ('inventory.adjustments.manage',  'Inventory', 'Perform stock adjustments'),
    ('inventory.returns.manage',      'Inventory', 'Process supplier and customer returns'),
    ('inventory.movements.view',      'Inventory', 'View inventory movement logs'),
    ('inventory.reports.view',        'Reports',   'View inventory reports and alerts')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON p.key IN (
      'inventory.products.view',
      'inventory.products.manage',
      'inventory.suppliers.view',
      'inventory.suppliers.manage',
      'inventory.purchase.manage',
      'inventory.batches.manage',
      'inventory.adjustments.manage',
      'inventory.returns.manage',
      'inventory.movements.view',
      'inventory.reports.view'
  )
WHERE r.name IN ('Super Admin', 'Admin', 'Manager', 'Pharmacist')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 19) Final alignment refresh for legacy mirrored tables
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_product_id uuid;
BEGIN
    FOR v_product_id IN
        SELECT p.id FROM public.products p
    LOOP
        PERFORM public.sync_legacy_inventory_item(v_product_id);
    END LOOP;
END $$;
