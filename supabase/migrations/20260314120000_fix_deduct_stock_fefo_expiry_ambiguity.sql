-- Fix ambiguous reference to expiry_date inside deduct_stock_fefo.
-- This migration is compatible with both existing signatures:
-- 1) RETURNS TABLE(batch_id, quantity_deducted, expiry_date)
-- 2) RETURNS TABLE(batch_id, quantity_deducted, expiry_date, error_code)

DO $$
DECLARE
    v_result text;
BEGIN
    SELECT pg_get_function_result(
        'public.deduct_stock_fefo(uuid,numeric,uuid,text,uuid,public.movement_action_type_enum,boolean)'::regprocedure
    )
    INTO v_result;

    IF v_result ILIKE '%error_code%' THEN
        EXECUTE $fn$
        DROP FUNCTION IF EXISTS public.deduct_stock_fefo;
        DROP FUNCTION IF EXISTS public.deduct_stock_fefo(uuid, numeric, uuid, text, uuid, public.movement_action_type_enum, boolean);
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
        AS $body$
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

                UPDATE public.batches AS b
                SET quantity = b.quantity - v_take,
                    status = CASE
                                WHEN b.quantity - v_take = 0 THEN 'depleted'
                                WHEN b.expiry_date < current_date THEN 'expired'
                                ELSE b.status
                             END,
                    updated_at = now()
                WHERE b.id = v_batch.id;

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
        $body$;
        $fn$;
    ELSE
        EXECUTE $fn$
        DROP FUNCTION IF EXISTS public.deduct_stock_fefo;
        DROP FUNCTION IF EXISTS public.deduct_stock_fefo(uuid, numeric, uuid, text, uuid, public.movement_action_type_enum, boolean);
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
            expiry_date date
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $body$
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
                RAISE EXCEPTION 'INSUFFICIENT_STOCK: requested %, available % for product %', p_quantity, v_available, p_product_id;
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

                UPDATE public.batches AS b
                SET quantity = b.quantity - v_take,
                    status = CASE
                                WHEN b.quantity - v_take = 0 THEN 'depleted'
                                WHEN b.expiry_date < current_date THEN 'expired'
                                ELSE b.status
                             END,
                    updated_at = now()
                WHERE b.id = v_batch.id;

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
                RETURN NEXT;
            END LOOP;
        END;
        $body$;
        $fn$;
    END IF;
END $$;
