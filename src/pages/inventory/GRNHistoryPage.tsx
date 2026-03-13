import { Fragment, useMemo, useState } from 'react';
import { Calendar, FilePlus2, Search, ChevronDown, ChevronUp, ReceiptText, PackageOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { GrnReceiveForm } from '../../components/inventory/GrnReceiveForm';
import { PermissionGuard } from '../../components/auth/Guards';
import { PERMISSIONS } from '../../lib/constants';
import { useInventory, useSuppliers, useCreateGrnReceipt } from '../../hooks/useInventory';
import { useCancelGrn, useConfirmGrn, useGrnHistory, type GrnHistoryEntry, type GrnStatus } from '../../hooks/useGrn';

type StatusFilter = 'all' | GrnStatus;

function currency(value: number | null | undefined): string {
    return `$${Number(value ?? 0).toFixed(2)}`;
}

function statusBadge(status: GrnStatus): string {
    if (status === 'Confirmed') return 'bg-success-bg text-success';
    if (status === 'Cancelled') return 'bg-danger-bg text-danger';
    return 'bg-warning-bg text-warning';
}

function invoiceBadge(status: string | null): string {
    if (status === 'paid') return 'bg-success-bg text-success';
    if (status === 'partial') return 'bg-warning-bg text-warning';
    if (status === 'unpaid') return 'bg-danger-bg text-danger';
    return 'bg-surface text-text-dim';
}

function GrnRowDetails({ row }: { row: GrnHistoryEntry }) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg border border-border-dim/40 bg-surface px-3 py-2">
                    <p className="text-text-dim uppercase tracking-wider font-semibold">Items</p>
                    <p className="text-sm font-bold text-text-main mt-1">{row.item_count}</p>
                </div>
                <div className="rounded-lg border border-border-dim/40 bg-surface px-3 py-2">
                    <p className="text-text-dim uppercase tracking-wider font-semibold">Quantity</p>
                    <p className="text-sm font-bold text-text-main mt-1">{row.total_quantity}</p>
                </div>
                <div className="rounded-lg border border-border-dim/40 bg-surface px-3 py-2">
                    <p className="text-text-dim uppercase tracking-wider font-semibold">Tax</p>
                    <p className="text-sm font-bold text-text-main mt-1">{currency(row.total_tax)}</p>
                </div>
                <div className="rounded-lg border border-border-dim/40 bg-surface px-3 py-2">
                    <p className="text-text-dim uppercase tracking-wider font-semibold">Total</p>
                    <p className="text-sm font-bold text-text-main mt-1">{currency(row.total_amount)}</p>
                </div>
            </div>

            <div className="border border-border-dim/40 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                    <thead className="bg-surface-dim/60 border-b border-border-dim/40">
                        <tr>
                            <th className="text-left px-3 py-2 font-bold text-text-dim uppercase tracking-wider">Product</th>
                            <th className="text-left px-3 py-2 font-bold text-text-dim uppercase tracking-wider">Batch</th>
                            <th className="text-left px-3 py-2 font-bold text-text-dim uppercase tracking-wider">Expiry</th>
                            <th className="text-right px-3 py-2 font-bold text-text-dim uppercase tracking-wider">Qty</th>
                            <th className="text-right px-3 py-2 font-bold text-text-dim uppercase tracking-wider">Purchase</th>
                            <th className="text-right px-3 py-2 font-bold text-text-dim uppercase tracking-wider">Sell</th>
                            <th className="text-right px-3 py-2 font-bold text-text-dim uppercase tracking-wider">Line Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-dim/30 bg-card">
                        {row.items.map((item) => (
                            <tr key={item.id}>
                                <td className="px-3 py-2">
                                    <p className="font-semibold text-text-main">{item.product_name}</p>
                                    <p className="text-text-dim font-mono">{item.product_code ?? 'N/A'}</p>
                                </td>
                                <td className="px-3 py-2 font-mono text-text-sub">{item.batch_number}</td>
                                <td className="px-3 py-2 text-text-sub">{new Date(item.expiry_date).toLocaleDateString()}</td>
                                <td className="px-3 py-2 text-right text-text-main font-semibold">{item.quantity_received}</td>
                                <td className="px-3 py-2 text-right text-text-sub">{currency(item.purchase_price)}</td>
                                <td className="px-3 py-2 text-right text-text-sub">{currency(item.selling_price)}</td>
                                <td className="px-3 py-2 text-right text-text-main font-semibold">{currency(item.line_total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function GRNHistoryPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showReceiveGrn, setShowReceiveGrn] = useState(false);

    const { data: products = [] } = useInventory();
    const { data: suppliers = [] } = useSuppliers();
    const { data: rows = [], isLoading } = useGrnHistory({
        status,
        search,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
    });

    const receiveGrn = useCreateGrnReceipt();
    const confirmGrn = useConfirmGrn();
    const cancelGrn = useCancelGrn();

    const kpis = useMemo(() => {
        const draft = rows.filter((r) => r.status === 'Draft').length;
        const confirmed = rows.filter((r) => r.status === 'Confirmed').length;
        const cancelled = rows.filter((r) => r.status === 'Cancelled').length;
        const totalAmount = rows.reduce((sum, row) => sum + row.total_amount, 0);
        return { draft, confirmed, cancelled, totalAmount };
    }, [rows]);

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-text-main">GRN History</h1>
                    <p className="text-text-sub text-sm mt-0.5">Goods receipt records with invoice linkage</p>
                </div>
                <PermissionGuard permission={PERMISSIONS.INVENTORY_ADD}>
                    <Button variant="primary" icon={<FilePlus2 size={16} />} onClick={() => setShowReceiveGrn(true)}>
                        Receive GRN
                    </Button>
                </PermissionGuard>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-3">
                    <p className="text-xs text-text-dim uppercase tracking-wider font-semibold">Draft</p>
                    <p className="text-xl font-bold text-warning mt-1">{kpis.draft}</p>
                </Card>
                <Card className="p-3">
                    <p className="text-xs text-text-dim uppercase tracking-wider font-semibold">Confirmed</p>
                    <p className="text-xl font-bold text-success mt-1">{kpis.confirmed}</p>
                </Card>
                <Card className="p-3">
                    <p className="text-xs text-text-dim uppercase tracking-wider font-semibold">Cancelled</p>
                    <p className="text-xl font-bold text-danger mt-1">{kpis.cancelled}</p>
                </Card>
                <Card className="p-3">
                    <p className="text-xs text-text-dim uppercase tracking-wider font-semibold">GRN Value</p>
                    <p className="text-xl font-bold text-text-main mt-1">{currency(kpis.totalAmount)}</p>
                </Card>
            </div>

            <Card className="space-y-3">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                        <input
                            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-main text-sm bg-card text-text-main focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand"
                            placeholder="Search GRN number, supplier, invoice, product, batch..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        title="Status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as StatusFilter)}
                        className="px-3 py-2 rounded-xl border border-border-main bg-card text-sm text-text-main"
                    >
                        <option value="all">All statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                    <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-text-dim" />
                        <input
                            type="date"
                            className="px-3 py-2 rounded-xl border border-border-main bg-card text-sm text-text-main"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            title="From date"
                        />
                        <span className="text-text-dim text-xs">to</span>
                        <input
                            type="date"
                            className="px-3 py-2 rounded-xl border border-border-main bg-card text-sm text-text-main"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            title="To date"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-10 text-center text-sm text-text-dim">Loading GRN history...</div>
                ) : rows.length === 0 ? (
                    <div className="py-10 text-center">
                        <PackageOpen size={36} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-text-dim">No GRN records found for the selected filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead>
                                <tr className="border-b border-border-dim">
                                    {['GRN', 'Supplier', 'Received Date', 'Status', 'Quantity', 'Total', 'Invoice', 'Actions'].map((head) => (
                                        <th key={head} className="text-left text-xs font-bold text-text-dim uppercase tracking-wider px-4 py-3">
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dim/40">
                                {rows.map((row) => {
                                    const expanded = expandedId === row.id;
                                    const canConfirm = row.status === 'Draft';
                                    const canCancel = row.status === 'Draft';

                                    return (
                                        <Fragment key={row.id}>
                                            <tr className="hover:bg-surface-dim/40 transition-colors">
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => setExpandedId(expanded ? null : row.id)}
                                                        className="inline-flex items-center gap-2 text-sm font-semibold text-text-main"
                                                    >
                                                        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                        {row.grn_number}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-sub">{row.supplier_name}</td>
                                                <td className="px-4 py-3 text-sm text-text-sub">{new Date(row.received_date).toLocaleDateString()}</td>
                                                <td className="px-4 py-3">
                                                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', statusBadge(row.status))}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-text-main">{row.total_quantity}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-text-main">{currency(row.total_amount)}</td>
                                                <td className="px-4 py-3">
                                                    {row.invoice_number ? (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-mono text-text-main inline-flex items-center gap-1">
                                                                <ReceiptText size={12} />
                                                                {row.invoice_number}
                                                            </p>
                                                            <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', invoiceBadge(row.invoice_payment_status))}>
                                                                {row.invoice_payment_status}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-text-dim">No invoice</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {canConfirm && (
                                                            <PermissionGuard permission={PERMISSIONS.INVENTORY_ADD}>
                                                                <button
                                                                    className="text-[10px] font-bold text-success bg-success-bg px-2.5 py-1 rounded-lg uppercase tracking-wider"
                                                                    onClick={() => confirmGrn.mutate(row.id)}
                                                                >
                                                                    Confirm
                                                                </button>
                                                            </PermissionGuard>
                                                        )}
                                                        {canCancel && (
                                                            <PermissionGuard permission={PERMISSIONS.INVENTORY_ADD}>
                                                                <button
                                                                    className="text-[10px] font-bold text-danger bg-danger-bg px-2.5 py-1 rounded-lg uppercase tracking-wider"
                                                                    onClick={() => {
                                                                        if (window.confirm(`Cancel GRN ${row.grn_number}?`)) {
                                                                            cancelGrn.mutate(row.id);
                                                                        }
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </PermissionGuard>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {expanded && (
                                                <tr className="bg-surface-dim/20">
                                                    <td colSpan={8} className="px-4 py-4">
                                                        <GrnRowDetails row={row} />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {showReceiveGrn && (
                <Modal title="Receive Stock (GRN)" onClose={() => setShowReceiveGrn(false)} size="xl">
                    <GrnReceiveForm
                        items={products}
                        suppliers={suppliers}
                        defaultProductId={null}
                        onSave={async (payload) => {
                            await receiveGrn.mutateAsync(payload);
                            setShowReceiveGrn(false);
                        }}
                        onClose={() => setShowReceiveGrn(false)}
                        loading={receiveGrn.isPending}
                    />
                </Modal>
            )}
        </div>
    );
}
