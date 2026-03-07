// ─── Core Domain Types ───────────────────────────────────────────────────────

export interface Permission {
    id: string;
    key: string;
    category: PermissionCategory;
    description: string;
}

export type PermissionCategory = 'Admin' | 'Inventory' | 'Medical' | 'Sales' | 'Reports';

export interface Role {
    id: string;
    name: string;
    description: string;
    is_system: boolean;
    created_at: string;
    permissions?: Permission[];
}

export interface User {
    id: string;
    email: string;
    full_name: string | null;
    role_id: string;
    company_id: string | null;
    theme_preference: 'light' | 'dark' | 'system';
    is_active: boolean;
    created_at: string;
    role?: Role;
}

export interface Company {
    id: string;
    name: string;
    created_at: string;
}

// ─── Inventory Types ─────────────────────────────────────────────────────────

export interface InventoryItem {
    id: string;
    name: string;
    generic_name?: string | null;
    description?: string | null;
    sku: string | null;
    category: string | null;
    quantity: number;
    unit: string;
    cost_price: number | null;
    selling_price: number | null;
    expiry_date: string | null;
    is_controlled: boolean;
    minimum_order_quantity: number;
    company_id: string | null;
    created_at: string;
    updated_at: string;
    batches?: ItemBatch[];
}

export interface ItemBatch {
    id: string;
    item_id: string;
    batch_number: string;
    quantity: number;
    expiry_date: string;
    purchase_date?: string | null;
    supplier?: string | null;
    cost_price?: number | null;
    status: 'active' | 'quarantined' | 'disposed' | 'depleted';
    location?: string | null;
    created_at: string;
    updated_at: string;
}

export type StockAdjustmentType = 'add' | 'remove' | 'set';

export interface StockAdjustment {
    item_id: string;
    type: StockAdjustmentType;
    quantity: number;
    reason: string;
}

// ─── Sales POS Types ─────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'card' | 'split';
export type TransactionStatus = 'completed' | 'refunded' | 'partial_refund';

export interface SaleTransaction {
    id: string;
    invoice_number: string;
    status: TransactionStatus;
    payment_method: PaymentMethod;
    subtotal: number;
    discount_amount: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    notes: string | null;
    sold_by: string | null;
    company_id: string | null;
    created_at: string;
    updated_at: string;
    // Joined
    seller?: Pick<User, 'id' | 'full_name' | 'email'>;
    items?: SaleItem[];
    refunds?: SaleRefund[];
}

export interface SaleItem {
    id: string;
    transaction_id: string;
    item_id: string;
    batch_id: string | null;
    item_name: string;
    item_sku: string | null;
    item_unit: string | null;
    unit_price: number;
    quantity: number;
    subtotal: number;
    created_at: string;
}

export interface SaleRefund {
    id: string;
    transaction_id: string;
    reason: string;
    refund_type: 'full' | 'partial';
    refund_total: number;
    refund_items: RefundLineItem[] | null;
    performed_by: string | null;
    created_at: string;
    performer?: Pick<User, 'id' | 'full_name' | 'email'>;
}

export interface RefundLineItem {
    item_id: string;
    item_name: string;
    quantity: number;
    amount: number;
}

// Cart types (local state only, not persisted directly)
export interface CartItem {
    item_id: string;
    batch_id: string | null;
    name: string;
    sku: string | null;
    unit: string;
    unit_price: number;
    quantity: number;
    max_quantity: number;  // available stock
    is_controlled: boolean;
    expiry_warning: boolean; // batch expires in < 30 days
    subtotal: number;
}

// Legacy — kept for backward compatibility with old DB records (sales_backup)
export interface Sale {
    id: string;
    item_id: string;
    item_name?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    sold_by: string | null;
    sale_date: string;
    company_id: string | null;
    notes: string | null;
    created_at: string;
    inventory_item?: Pick<InventoryItem, 'name' | 'sku' | 'unit'>;
}

export interface SaleFormData {
    item_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
}

// ─── Stock Count Types ────────────────────────────────────────────────────────

export interface StockCountSession {
    id: string;
    type: 'full' | 'partial' | 'cycle';
    status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
    notes: string | null;
    created_by: string;
    approved_by: string | null;
    approved_at: string | null;
    company_id: string | null;
    created_at: string;
    updated_at: string;
    // Joined relations
    creator?: User;
    approver?: User;
    items?: StockCountItem[];
}

export interface StockCountItem {
    id: string;
    session_id: string;
    item_id: string;
    batch_id: string;
    system_quantity: number;
    physical_count: number | null;
    variance: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // Joined relations
    item?: InventoryItem;
    batch?: ItemBatch;
}

export interface StockCountAuditLog {
    id: string;
    session_id: string;
    action: string;
    performed_by: string;
    details: Record<string, unknown> | null;
    created_at: string;
    // Joined relations
    user?: User;
}

// ─── Auth / Session ───────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
}

// ─── Report Types ─────────────────────────────────────────────────────────────

export interface ReportSummary {
    total_sales: number;
    total_revenue: number;
    low_stock_count: number;
    expiring_soon_count: number;
    controlled_items_count: number;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export type ModalMode = 'create' | 'edit' | 'view';

// ─── Report Filters ───────────────────────────────────────────────────────────

export interface ReportFilters {
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    category?: string;
    controlledOnly?: boolean;
    expiryWindow?: 30 | 60 | 90 | 'expired';
}

export interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    user_id: string | null;
    details?: Record<string, unknown> | null;
    created_at: string;
    user?: {
        full_name: string | null;
        email: string;
    };
}
