-- ═══════════════════════════════════════════════════════════════════════════
-- MedFlow v2 — Migration 009: Atomic POS Sale Transaction
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure audit_logs table exists if not already present
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    action text not null,
    entity_type text,
    entity_id uuid,
    user_id uuid references public.users(id) on delete set null,
    details jsonb,
    created_at timestamptz not null default now()
);

-- Enable RLS just in case for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_audit_logs_insert" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_audit_logs_select" ON public.audit_logs FOR SELECT USING (current_user_is_admin());

-- ─── ATOMIC POS SALE RPC ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_payment_method text,
    p_discount_amount numeric,
    p_tax_rate numeric,
    p_notes text,
    p_cart jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER   -- Run with elevated privileges to bypass RLS internally during transaction
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_company_id uuid;
    v_tx sale_transactions;
    v_subtotal numeric := 0;
    v_total numeric := 0;
    v_tax_amount numeric := 0;
    v_after_discount numeric := 0;
    v_item jsonb;
    v_batch record;
BEGIN
    -- 1. Identify User and Validate Permissions
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT user_has_permission('sales.create') THEN
        RAISE EXCEPTION 'Permission denied: Missing sales.create';
    END IF;

    SELECT company_id INTO v_company_id FROM users WHERE id = v_user_id;

    -- 2. Calculate Subtotal from cart items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
    LOOP
        IF (v_item->>'quantity')::integer <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero.';
        END IF;
        v_subtotal := v_subtotal + (v_item->>'subtotal')::numeric;
    END LOOP;

    -- Apply discount and calculate tax
    v_after_discount := GREATEST(0, v_subtotal - p_discount_amount);
    v_tax_amount := v_after_discount * (p_tax_rate / 100.0);
    v_total := v_after_discount + v_tax_amount;

    -- 3. Create Transaction Header
    INSERT INTO sale_transactions (
        payment_method,
        subtotal,
        discount_amount,
        tax_rate,
        tax_amount,
        total,
        notes,
        sold_by,
        company_id,
        status
    ) VALUES (
        p_payment_method,
        v_subtotal,
        p_discount_amount,
        p_tax_rate,
        v_tax_amount,
        v_total,
        COALESCE(p_notes, 'POS Sale'),
        v_user_id,
        v_company_id,
        'completed'
    ) RETURNING * INTO v_tx;

    -- 4. Process Line Items and Deduct Inventory Automatically
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
    LOOP
        -- ATOMIC LOCK: Lock the specific inventory batch so no other sale can modify it concurrently
        SELECT * INTO v_batch 
        FROM item_batches 
        WHERE id = (v_item->>'batch_id')::uuid 
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Batch ID % not found', v_item->>'batch_id';
        END IF;

        -- Prevent negative inventory
        IF v_batch.quantity < (v_item->>'quantity')::integer THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: % (Requested: %, Available: %)', 
                v_item->>'name', v_item->>'quantity', v_batch.quantity;
        END IF;

        -- Insert Line Item
        INSERT INTO sale_items (
            transaction_id,
            item_id,
            batch_id,
            item_name,
            item_sku,
            item_unit,
            unit_price,
            quantity,
            subtotal
        ) VALUES (
            v_tx.id,
            (v_item->>'item_id')::uuid,
            (v_item->>'batch_id')::uuid,
            v_item->>'name',
            v_item->>'sku',
            v_item->>'unit',
            (v_item->>'unit_price')::numeric,
            (v_item->>'quantity')::integer,
            (v_item->>'subtotal')::numeric
        );

        -- Deduct Stock securely
        UPDATE item_batches 
        SET 
            quantity = quantity - (v_item->>'quantity')::integer,
            updated_at = now()
        WHERE id = (v_item->>'batch_id')::uuid;

        -- Record Audit Log for the deduction
        INSERT INTO audit_logs (
            action,
            entity_type,
            entity_id,
            user_id,
            details
        ) VALUES (
            'sale_stock_deduct',
            'item_batch',
            (v_item->>'batch_id')::uuid,
            v_user_id,
            jsonb_build_object(
                'previous_quantity', v_batch.quantity,
                'new_quantity', v_batch.quantity - (v_item->>'quantity')::integer,
                'delta', -(v_item->>'quantity')::integer,
                'transaction_id', v_tx.id,
                'source', 'POS'
            )
        );
    END LOOP;

    -- 5. Return the created sale_transactions JSON object
    RETURN to_jsonb(v_tx);
END;
$$;
