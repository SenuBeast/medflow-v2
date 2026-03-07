-- ═══════════════════════════════════════════════════════════════════════════
-- MedFlow v2 — Migration 004: Inventory Batches & Expiry Tracking
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add new tracking fields to the parent inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS generic_name text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS minimum_order_quantity integer default 1;

-- Note: We are keeping the total 'quantity' and 'expiry_date' on inventory_items 
-- for quick dashboard querying and legacy support, but the source of truth 
-- will now be the item_batches table. The quantity on inventory_items should 
-- be updated automatically via Postgres triggers in a production environment, 
-- but for this MVP we will handle syncing in the application layer (Supabase functions/hooks).

-- 2. Create the Item Batches table
CREATE TABLE IF NOT EXISTS public.item_batches (
    id uuid primary key default uuid_generate_v4(),
    item_id uuid not null references public.inventory_items(id) on delete cascade,
    batch_number text not null,
    quantity integer not null default 0 check (quantity >= 0),
    expiry_date date not null,
    purchase_date date,
    supplier text,
    cost_price numeric(10,2),
    status text not null default 'active' check (status in ('active', 'quarantined', 'disposed', 'depleted')),
    location text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Indexes for strict batch queries
CREATE INDEX IF NOT EXISTS idx_item_batches_item_id ON public.item_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_item_batches_status ON public.item_batches(status);
CREATE INDEX IF NOT EXISTS idx_item_batches_expiry ON public.item_batches(expiry_date);

-- 4. Enable RLS on the new table
ALTER TABLE public.item_batches ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for item_batches
-- Ensure the user's company matches the parent item's company, or they have admin rights
DROP POLICY IF EXISTS "Users can view batches of their company items" ON public.item_batches;
CREATE POLICY "Users can view batches of their company items"
    ON public.item_batches FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.inventory_items i 
            WHERE i.id = item_batches.item_id 
            AND (i.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
        )
    );

DROP POLICY IF EXISTS "Users with inventory.add can insert batches" ON public.item_batches;
CREATE POLICY "Users with inventory.add can insert batches"
    ON public.item_batches FOR INSERT
    WITH CHECK (
        user_has_permission('inventory.add') AND
        EXISTS (
            SELECT 1 FROM public.inventory_items i 
            WHERE i.id = item_id 
            AND (i.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
        )
    );

DROP POLICY IF EXISTS "Users with inventory.adjust can update batches" ON public.item_batches;
CREATE POLICY "Users with inventory.adjust can update batches"
    ON public.item_batches FOR UPDATE
    USING (
        user_has_permission('inventory.adjust') AND
        EXISTS (
            SELECT 1 FROM public.inventory_items i 
            WHERE i.id = item_batches.item_id 
            AND (i.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
        )
    );

DROP POLICY IF EXISTS "Users with inventory.expiry.dispose can delete batches" ON public.item_batches;
CREATE POLICY "Users with inventory.expiry.dispose can delete batches"
    ON public.item_batches FOR DELETE
    USING (
        user_has_permission('inventory.expiry.dispose') AND
        EXISTS (
            SELECT 1 FROM public.inventory_items i 
            WHERE i.id = item_batches.item_id 
            AND (i.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) OR current_user_is_admin())
        )
    );

-- 6. Pre-seed a default batch for any existing inventory items so the app doesn't break
INSERT INTO public.item_batches (item_id, batch_number, quantity, expiry_date, cost_price, status)
SELECT 
    id, 
    'LEGACY-' || left(id::text, 8), 
    quantity, 
    COALESCE(expiry_date, current_date + interval '1 year'), 
    cost_price,
    'active'
FROM public.inventory_items
WHERE NOT EXISTS (
    SELECT 1 FROM public.item_batches b WHERE b.item_id = public.inventory_items.id
);
