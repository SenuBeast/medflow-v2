-- ═══════════════════════════════════════════════════════════════════════════
-- MedFlow v2 — Row Level Security Policies
-- Run this file safely multiple times — drops existing policies first
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table public.roles           enable row level security;
alter table public.permissions     enable row level security;
alter table public.role_permissions enable row level security;
alter table public.users           enable row level security;
alter table public.inventory_items enable row level security;
alter table public.sales           enable row level security;
alter table public.stock_counts    enable row level security;

-- ─── Drop existing policies (idempotent re-run) ───────────────────────────────
drop policy if exists "roles_select_authenticated"         on public.roles;
drop policy if exists "roles_insert_admin"                 on public.roles;
drop policy if exists "roles_update_admin"                 on public.roles;
drop policy if exists "roles_delete_admin"                 on public.roles;

drop policy if exists "permissions_select_authenticated"   on public.permissions;
drop policy if exists "permissions_insert_admin"           on public.permissions;
drop policy if exists "permissions_update_admin"           on public.permissions;
drop policy if exists "permissions_delete_admin"           on public.permissions;

drop policy if exists "role_permissions_select_authenticated" on public.role_permissions;
drop policy if exists "role_permissions_insert_admin"      on public.role_permissions;
drop policy if exists "role_permissions_delete_admin"      on public.role_permissions;

drop policy if exists "users_select_own"                   on public.users;
drop policy if exists "users_insert_own_or_admin"          on public.users;
drop policy if exists "users_update_admin"                 on public.users;

drop policy if exists "inventory_select"                   on public.inventory_items;
drop policy if exists "inventory_insert"                   on public.inventory_items;
drop policy if exists "inventory_update"                   on public.inventory_items;
drop policy if exists "inventory_delete"                   on public.inventory_items;

drop policy if exists "sales_select"                       on public.sales;
drop policy if exists "sales_insert"                       on public.sales;

drop policy if exists "stock_counts_select"                on public.stock_counts;
drop policy if exists "stock_counts_insert"                on public.stock_counts;
drop policy if exists "stock_counts_update"                on public.stock_counts;

-- ─── Helper: check permission (SECURITY DEFINER bypasses RLS on users) ────────
create or replace function public.user_has_permission(perm_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.role_permissions rp on rp.role_id = u.role_id
    join public.permissions p on p.id = rp.permission_id
    where u.id = auth.uid()
      and p.key = perm_key
  );
$$;

-- ─── Safe admin check for users-table policies (avoids RLS recursion) ─────────
-- Do NOT use user_has_permission() inside users-table policies — it re-queries
-- users and triggers infinite recursion. This function is safe (SECURITY DEFINER).
create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid()
      and r.name in ('Super Admin', 'Admin', 'Pharmacy Manager')
  );
$$;

-- ─── Roles ───────────────────────────────────────────────────────────────────
create policy "roles_select_authenticated"
  on public.roles for select
  to authenticated
  using (true);

create policy "roles_insert_admin"
  on public.roles for insert
  to authenticated
  with check (public.user_has_permission('admin.roles.manage'));

create policy "roles_update_admin"
  on public.roles for update
  to authenticated
  using (public.user_has_permission('admin.roles.manage'))
  with check (public.user_has_permission('admin.roles.manage'));

create policy "roles_delete_admin"
  on public.roles for delete
  to authenticated
  using (
    is_system = false
    and public.user_has_permission('admin.roles.manage')
  );

-- ─── Permissions ─────────────────────────────────────────────────────────────
create policy "permissions_select_authenticated"
  on public.permissions for select
  to authenticated
  using (true);

create policy "permissions_insert_admin"
  on public.permissions for insert
  to authenticated
  with check (public.user_has_permission('admin.permissions.manage'));

create policy "permissions_update_admin"
  on public.permissions for update
  to authenticated
  using (public.user_has_permission('admin.permissions.manage'));

create policy "permissions_delete_admin"
  on public.permissions for delete
  to authenticated
  using (public.user_has_permission('admin.permissions.manage'));

-- ─── Role Permissions ────────────────────────────────────────────────────────
create policy "role_permissions_select_authenticated"
  on public.role_permissions for select
  to authenticated
  using (true);

create policy "role_permissions_insert_admin"
  on public.role_permissions for insert
  to authenticated
  with check (public.user_has_permission('admin.permissions.manage'));

create policy "role_permissions_delete_admin"
  on public.role_permissions for delete
  to authenticated
  using (public.user_has_permission('admin.permissions.manage'));

-- ─── Users ───────────────────────────────────────────────────────────────────
-- ⚠ Use current_user_is_admin() here, NOT user_has_permission() — the latter
--   would query users → trigger this policy → infinite recursion → query hangs.

create policy "users_select_own"
  on public.users for select
  to authenticated
  using (id = auth.uid() or public.current_user_is_admin());

create policy "users_insert_own_or_admin"
  on public.users for insert
  to authenticated
  with check (id = auth.uid() or public.current_user_is_admin());

create policy "users_update_admin"
  on public.users for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ─── Inventory ───────────────────────────────────────────────────────────────
create policy "inventory_select"
  on public.inventory_items for select
  to authenticated
  using (public.user_has_permission('inventory.view'));

create policy "inventory_insert"
  on public.inventory_items for insert
  to authenticated
  with check (public.user_has_permission('inventory.add'));

create policy "inventory_update"
  on public.inventory_items for update
  to authenticated
  using (
    public.user_has_permission('inventory.edit')
    or public.user_has_permission('inventory.adjust')
  )
  with check (
    public.user_has_permission('inventory.edit')
    or public.user_has_permission('inventory.adjust')
  );

create policy "inventory_delete"
  on public.inventory_items for delete
  to authenticated
  using (public.user_has_permission('inventory.edit'));

-- ─── Sales ───────────────────────────────────────────────────────────────────
create policy "sales_select"
  on public.sales for select
  to authenticated
  using (public.user_has_permission('sales.view'));

create policy "sales_insert"
  on public.sales for insert
  to authenticated
  with check (public.user_has_permission('sales.create'));

-- ─── Stock Counts ────────────────────────────────────────────────────────────
create policy "stock_counts_select"
  on public.stock_counts for select
  to authenticated
  using (public.user_has_permission('inventory.view'));

create policy "stock_counts_insert"
  on public.stock_counts for insert
  to authenticated
  with check (public.user_has_permission('stock_counts.perform'));

create policy "stock_counts_update"
  on public.stock_counts for update
  to authenticated
  using (public.user_has_permission('stock_counts.approve'))
  with check (public.user_has_permission('stock_counts.approve'));
