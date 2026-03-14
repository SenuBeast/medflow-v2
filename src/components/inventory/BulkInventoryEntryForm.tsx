import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import type { InventoryItem, ItemBatch } from '../../lib/types';
import type { GrnReceiptInput, InventorySupplier } from '../../hooks/useInventory';

type BulkRow = {
    id: string;
    product_id: string;
    supplier_id: string;
    supplier_name: string;
    purchase_order_id: string;
    received_date: string;
    batch_number: string;
    manufacturing_date: string;
    expiry_date: string;
    unit_name: string;
    units_per_pack: number;
    pack_count: number;
    loose_units: number;
    direct_quantity: number;
    free_pack_count: number;
    free_loose_units: number;
    purchase_price: number;
    selling_price: number;
    discount_mode: 'percent' | 'amount';
    discount_value: number;
    tax: number;
};

type BatchPayload = Omit<ItemBatch, 'id' | 'created_at' | 'updated_at'>;

type BatchBulkProps = {
    mode: 'batch';
    items: InventoryItem[];
    suppliers: InventorySupplier[];
    defaultProductId?: string | null;
    onSubmit: (rows: BatchPayload[]) => Promise<void>;
    onClose?: () => void;
    loading: boolean;
    initialRows?: number;
};

type GrnBulkProps = {
    mode: 'grn';
    items: InventoryItem[];
    suppliers: InventorySupplier[];
    defaultProductId?: string | null;
    onSubmit: (rows: GrnReceiptInput[]) => Promise<void>;
    onClose?: () => void;
    loading: boolean;
    initialRows?: number;
};

type BulkInventoryEntryFormProps = BatchBulkProps | GrnBulkProps;

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function makeRowId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createRow(defaultProductId?: string | null): BulkRow {
    return {
        id: makeRowId(),
        product_id: defaultProductId ?? '',
        supplier_id: '',
        supplier_name: '',
        purchase_order_id: '',
        received_date: todayDate(),
        batch_number: '',
        manufacturing_date: '',
        expiry_date: '',
        unit_name: 'pack',
        units_per_pack: 1,
        pack_count: 0,
        loose_units: 0,
        direct_quantity: 0,
        free_pack_count: 0,
        free_loose_units: 0,
        purchase_price: 0,
        selling_price: 0,
        discount_mode: 'amount',
        discount_value: 0,
        tax: 0,
    };
}

function computePaidQuantity(row: BulkRow) {
    const packBased = (Math.max(0, row.pack_count) * Math.max(1, row.units_per_pack)) + Math.max(0, row.loose_units);
    return packBased > 0 ? packBased : Math.max(0, row.direct_quantity);
}

function computeFreeQuantity(row: BulkRow) {
    return (Math.max(0, row.free_pack_count) * Math.max(1, row.units_per_pack)) + Math.max(0, row.free_loose_units);
}

function computeTotalQuantity(row: BulkRow) {
    return computePaidQuantity(row) + computeFreeQuantity(row);
}

function computeDiscountAmount(row: BulkRow) {
    const lineGross = computePaidQuantity(row) * Math.max(0, Number(row.purchase_price) || 0);
    if (lineGross <= 0) return 0;
    const raw = Math.max(0, Number(row.discount_value) || 0);
    if (row.discount_mode === 'percent') {
        return (Math.min(100, raw) / 100) * lineGross;
    }
    return Math.min(lineGross, raw);
}

export function BulkInventoryEntryForm(props: BulkInventoryEntryFormProps) {
    const {
        mode,
        items,
        suppliers,
        onClose,
        loading,
        defaultProductId,
        initialRows = 8,
    } = props;

    const seededRows = Math.max(1, initialRows);
    const [rows, setRows] = useState<BulkRow[]>(
        Array.from({ length: seededRows }, () => createRow(defaultProductId))
    );
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

    const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

    const updateRow = (id: string, patch: Partial<BulkRow>) => {
        setRows((prev) => prev.map((row) => row.id === id ? { ...row, ...patch } : row));
        if (submitError) setSubmitError(null);
        if (rowErrors[id]) {
            setRowErrors((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    const handleProductChange = (id: string, productId: string) => {
        const item = itemMap.get(productId);
        updateRow(id, {
            product_id: productId,
            units_per_pack: Math.max(1, Number(item?.pack_size ?? 1)),
            purchase_price: Number(item?.cost_price ?? 0),
            selling_price: Number(item?.selling_price ?? 0),
        });
    };

    const removeRow = (id: string) => {
        setRows((prev) => prev.length === 1 ? prev : prev.filter((row) => row.id !== id));
        setRowErrors((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const isRowComplete = (row: BulkRow) => {
        if (!row.product_id) return false;
        if (!row.batch_number.trim()) return false;
        if (!row.expiry_date) return false;
        if (computeTotalQuantity(row) <= 0) return false;
        if (mode === 'grn' && !row.supplier_id && !row.supplier_name.trim()) return false;
        return true;
    };

    const canAddRow = rows.every(isRowComplete);

    const addRow = () => {
        if (!canAddRow) return;
        setRows((prev) => [...prev, createRow(defaultProductId)]);
    };

    const validateRows = () => {
        const errors: Record<string, string> = {};

        rows.forEach((row, index) => {
            if (!row.product_id) {
                errors[row.id] = `Row ${index + 1}: Product is required`;
                return;
            }
            if (!row.batch_number.trim()) {
                errors[row.id] = `Row ${index + 1}: Batch number is required`;
                return;
            }
            if (!row.expiry_date) {
                errors[row.id] = `Row ${index + 1}: Expiry date is required`;
                return;
            }
            if (computeTotalQuantity(row) <= 0) {
                errors[row.id] = `Row ${index + 1}: Total quantity must be greater than zero`;
                return;
            }
            if (mode === 'grn' && !row.supplier_id && !row.supplier_name.trim()) {
                errors[row.id] = `Row ${index + 1}: Select supplier or enter supplier name`;
            }
        });

        setRowErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateRows()) {
            setSubmitError('Please fix the highlighted rows before submitting.');
            return;
        }

        try {
            if (mode === 'batch') {
                const payload: BatchPayload[] = rows.map((row) => ({
                    item_id: row.product_id,
                    batch_number: row.batch_number.trim(),
                    quantity: computeTotalQuantity(row),
                    expiry_date: row.expiry_date,
                    purchase_date: row.manufacturing_date || null,
                    manufacturing_date: row.manufacturing_date || null,
                    supplier: null,
                    supplier_id: row.supplier_id || null,
                    cost_price: Math.max(0, Number(row.purchase_price) || 0),
                    selling_price: Math.max(0, Number(row.selling_price) || 0),
                    unit_name: row.unit_name.trim() || null,
                    units_per_pack: Math.max(1, Number(row.units_per_pack) || 1),
                    status: 'active',
                    location: null,
                }));
                await props.onSubmit(payload);
            } else {
                const payload: GrnReceiptInput[] = rows.map((row) => ({
                    supplier_id: row.supplier_id || null,
                    supplier_name: row.supplier_name.trim() || null,
                    purchase_order_id: row.purchase_order_id.trim() || null,
                    received_date: row.received_date || todayDate(),
                    product_id: row.product_id,
                    batch_number: row.batch_number.trim(),
                    manufacturing_date: row.manufacturing_date || null,
                    expiry_date: row.expiry_date,
                    purchase_price: Math.max(0, Number(row.purchase_price) || 0),
                    selling_price: Math.max(0, Number(row.selling_price) || 0),
                    quantity_received: computeTotalQuantity(row),
                    discount: computeDiscountAmount(row),
                    tax: Math.max(0, Number(row.tax) || 0),
                    unit_name: row.unit_name.trim() || null,
                    units_per_pack: Math.max(1, Number(row.units_per_pack) || 1),
                }));
                await props.onSubmit(payload);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Bulk submit failed';
            setSubmitError(message);
        }
    };

    const inputCls = 'w-full min-w-[120px] px-2 py-1.5 rounded-lg border border-border-main bg-card text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-blue-500/20';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-text-dim">
                    Spreadsheet mode. Fill current rows first, then add more rows.
                </p>
                <Button variant="outline" size="sm" onClick={addRow} disabled={!canAddRow}>
                    + Add New Row
                </Button>
            </div>

            {!canAddRow && (
                <p className="text-xs text-warning">
                    Complete all current rows before adding new ones.
                </p>
            )}

            {submitError && (
                <div className="p-3 bg-danger-bg text-danger text-sm rounded-lg border border-danger/30">
                    {submitError}
                </div>
            )}

            <div className="overflow-auto border border-border-dim rounded-xl max-h-[68vh]">
                <table className="min-w-[2200px] w-full text-xs">
                    <thead className="bg-surface-dim/70 sticky top-0 z-10">
                        <tr className="border-b border-border-dim">
                            <th className="px-2 py-2 text-left">#</th>
                            <th className="px-2 py-2 text-left">Product</th>
                            <th className="px-2 py-2 text-left">Supplier</th>
                            {mode === 'grn' && <th className="px-2 py-2 text-left">New Supplier</th>}
                            {mode === 'grn' && <th className="px-2 py-2 text-left">Received Date</th>}
                            {mode === 'grn' && <th className="px-2 py-2 text-left">PO Ref</th>}
                            <th className="px-2 py-2 text-left">Batch #</th>
                            <th className="px-2 py-2 text-left">MFG</th>
                            <th className="px-2 py-2 text-left">Expiry</th>
                            <th className="px-2 py-2 text-left">Pack Unit</th>
                            <th className="px-2 py-2 text-left">Units/Pack</th>
                            <th className="px-2 py-2 text-left">Paid Packs</th>
                            <th className="px-2 py-2 text-left">Paid Loose</th>
                            <th className="px-2 py-2 text-left">Paid Direct</th>
                            {mode === 'grn' && <th className="px-2 py-2 text-left">Free Packs</th>}
                            {mode === 'grn' && <th className="px-2 py-2 text-left">Free Loose</th>}
                            <th className="px-2 py-2 text-left">Paid Qty</th>
                            {mode === 'grn' && <th className="px-2 py-2 text-left">Free Qty</th>}
                            <th className="px-2 py-2 text-left">Total Qty</th>
                            <th className="px-2 py-2 text-left">Purchase</th>
                            <th className="px-2 py-2 text-left">Selling</th>
                            {mode === 'grn' && <th className="px-2 py-2 text-left">Discount Mode</th>}
                            {mode === 'grn' && <th className="px-2 py-2 text-left">Discount Value</th>}
                            {mode === 'grn' && <th className="px-2 py-2 text-left">Discount Amount</th>}
                            {mode === 'grn' && <th className="px-2 py-2 text-left">Tax</th>}
                            <th className="px-2 py-2 text-left">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-dim/40">
                        {rows.map((row, index) => (
                            <tr key={row.id} className="align-top">
                                <td className="px-2 py-2 font-semibold text-text-sub">{index + 1}</td>
                                <td className="px-2 py-2">
                                    <select
                                        title="Product"
                                        className={inputCls}
                                        value={row.product_id}
                                        onChange={(e) => handleProductChange(row.id, e.target.value)}
                                    >
                                        <option value="">Select</option>
                                        {items.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} ({item.sku ?? 'N/A'})
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-2 py-2">
                                    <select
                                        title="Supplier"
                                        className={inputCls}
                                        value={row.supplier_id}
                                        onChange={(e) => updateRow(row.id, { supplier_id: e.target.value })}
                                    >
                                        <option value="">Select</option>
                                        {suppliers.map((supplier) => (
                                            <option key={supplier.id} value={supplier.id}>
                                                {supplier.supplier_name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                {mode === 'grn' && (
                                    <td className="px-2 py-2">
                                        <input
                                            className={inputCls}
                                            value={row.supplier_name}
                                            onChange={(e) => updateRow(row.id, { supplier_name: e.target.value })}
                                        />
                                    </td>
                                )}
                                {mode === 'grn' && (
                                    <td className="px-2 py-2">
                                        <input
                                            type="date"
                                            className={inputCls}
                                            value={row.received_date}
                                            onChange={(e) => updateRow(row.id, { received_date: e.target.value })}
                                        />
                                    </td>
                                )}
                                {mode === 'grn' && (
                                    <td className="px-2 py-2">
                                        <input
                                            className={inputCls}
                                            value={row.purchase_order_id}
                                            onChange={(e) => updateRow(row.id, { purchase_order_id: e.target.value })}
                                        />
                                    </td>
                                )}
                                <td className="px-2 py-2">
                                    <input
                                        className={inputCls}
                                        value={row.batch_number}
                                        onChange={(e) => updateRow(row.id, { batch_number: e.target.value })}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="date"
                                        className={inputCls}
                                        value={row.manufacturing_date}
                                        onChange={(e) => updateRow(row.id, { manufacturing_date: e.target.value })}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="date"
                                        className={inputCls}
                                        value={row.expiry_date}
                                        onChange={(e) => updateRow(row.id, { expiry_date: e.target.value })}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        className={inputCls}
                                        value={row.unit_name}
                                        onChange={(e) => updateRow(row.id, { unit_name: e.target.value })}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="number"
                                        className={inputCls}
                                        min={1}
                                        value={row.units_per_pack}
                                        onChange={(e) => updateRow(row.id, { units_per_pack: Number(e.target.value) })}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="number"
                                        className={inputCls}
                                        min={0}
                                        value={row.pack_count}
                                        onChange={(e) => updateRow(row.id, { pack_count: Number(e.target.value) })}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="number"
                                        className={inputCls}
                                        min={0}
                                        value={row.loose_units}
                                        onChange={(e) => updateRow(row.id, { loose_units: Number(e.target.value) })}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="number"
                                        className={inputCls}
                                        min={0}
                                        value={row.direct_quantity}
                                        onChange={(e) => updateRow(row.id, { direct_quantity: Number(e.target.value) })}
                                    />
                                </td>
                                {mode === 'grn' && (
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            className={inputCls}
                                            min={0}
                                            value={row.free_pack_count}
                                            onChange={(e) => updateRow(row.id, { free_pack_count: Number(e.target.value) })}
                                        />
                                    </td>
                                )}
                                {mode === 'grn' && (
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            className={inputCls}
                                            min={0}
                                            value={row.free_loose_units}
                                            onChange={(e) => updateRow(row.id, { free_loose_units: Number(e.target.value) })}
                                        />
                                    </td>
                                )}
                                <td className="px-2 py-2">
                                    <div className="px-2 py-1.5 rounded-lg border border-border-main bg-surface text-text-main font-semibold">
                                        {computePaidQuantity(row)}
                                    </div>
                                </td>
                                {mode === 'grn' && (
                                    <td className="px-2 py-2">
                                        <div className="px-2 py-1.5 rounded-lg border border-border-main bg-surface text-text-main font-semibold">
                                            {computeFreeQuantity(row)}
                                        </div>
                                    </td>
                                )}
                                <td className="px-2 py-2">
                                    <div className="px-2 py-1.5 rounded-lg border border-border-main bg-surface text-text-main font-semibold">
                                        {computeTotalQuantity(row)}
                                    </div>
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        className={inputCls}
                                        min={0}
                                        value={row.purchase_price}
                                        onChange={(e) => updateRow(row.id, { purchase_price: Number(e.target.value) })}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        className={inputCls}
                                        min={0}
                                        value={row.selling_price}
                                        onChange={(e) => updateRow(row.id, { selling_price: Number(e.target.value) })}
                                    />
                                </td>
                                {mode === 'grn' && (
                                    <td className="px-2 py-2">
                                        <select
                                            title="Discount mode"
                                            className={inputCls}
                                            value={row.discount_mode}
                                            onChange={(e) => updateRow(row.id, { discount_mode: e.target.value as 'percent' | 'amount' })}
                                        >
                                            <option value="amount">Amount</option>
                                            <option value="percent">Percent</option>
                                        </select>
                                    </td>
                                )}
                                {mode === 'grn' && (
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            className={inputCls}
                                            min={0}
                                            step="0.01"
                                            value={row.discount_value}
                                            onChange={(e) => updateRow(row.id, { discount_value: Number(e.target.value) })}
                                        />
                                    </td>
                                )}
                                {mode === 'grn' && (
                                    <td className="px-2 py-2">
                                        <div className="px-2 py-1.5 rounded-lg border border-border-main bg-surface text-text-main font-semibold">
                                            {computeDiscountAmount(row).toFixed(2)}
                                        </div>
                                    </td>
                                )}
                                {mode === 'grn' && (
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            className={inputCls}
                                            min={0}
                                            step="0.01"
                                            value={row.tax}
                                            onChange={(e) => updateRow(row.id, { tax: Number(e.target.value) })}
                                        />
                                    </td>
                                )}
                                <td className="px-2 py-2">
                                    <Button variant="ghost" size="sm" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>
                                        Remove
                                    </Button>
                                    {rowErrors[row.id] && (
                                        <p className="text-[10px] text-danger mt-1 max-w-[180px]">{rowErrors[row.id]}</p>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border-dim">
                {onClose && <Button variant="secondary" onClick={onClose}>Cancel</Button>}
                <Button variant="primary" loading={loading} onClick={handleSubmit}>
                    Submit All Rows
                </Button>
            </div>
        </div>
    );
}

