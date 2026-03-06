-- ═══════════════════════════════════════════════════════════════════════════
-- MedFlow v2 — Schema Migration
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Enable UUID extension ───────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Roles ───────────────────────────────────────────────────────────────────
create table if not exists public.roles (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  description text not null default '',
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Permissions ─────────────────────────────────────────────────────────────
create table if not exists public.permissions (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,
  category    text not null,
  description text not null default ''
);

-- ─── Role Permissions (join table) ───────────────────────────────────────────
create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ─── Users ───────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role_id     uuid not null references public.roles(id) on delete restrict,
  company_id  uuid,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Inventory Items ─────────────────────────────────────────────────────────
create table if not exists public.inventory_items (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  sku           text,
  category      text,
  quantity      integer not null default 0 check (quantity >= 0),
  unit          text not null default 'units',
  cost_price    numeric(10,2),
  selling_price numeric(10,2),
  expiry_date   date,
  is_controlled boolean not null default false,
  reorder_level integer not null default 10,
  company_id    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Sales ───────────────────────────────────────────────────────────────────
create table if not exists public.sales (
  id          uuid primary key default uuid_generate_v4(),
  item_id     uuid references public.inventory_items(id) on delete set null,
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(10,2) not null,
  total_price numeric(10,2) not null,
  sold_by     uuid references public.users(id) on delete set null,
  sale_date   timestamptz not null default now(),
  company_id  uuid,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ─── Stock Counts ────────────────────────────────────────────────────────────
create table if not exists public.stock_counts (
  id           uuid primary key default uuid_generate_v4(),
  performed_by uuid references public.users(id) on delete set null,
  approved_by  uuid references public.users(id) on delete set null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes        text,
  created_at   timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_users_role_id on public.users(role_id);
create index if not exists idx_inventory_items_company on public.inventory_items(company_id);
create index if not exists idx_sales_item_id on public.sales(item_id);
create index if not exists idx_sales_sold_by on public.sales(sold_by);
create index if not exists idx_role_permissions_role_id on public.role_permissions(role_id);
