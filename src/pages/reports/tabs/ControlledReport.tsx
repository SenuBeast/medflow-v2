import { ShieldAlert, Lock } from 'lucide-react';
import { useControlledReport } from '../../../hooks/useReports';
import { ExportButton } from '../components/ExportButton';
import { PermissionGuard } from '../../../components/auth/Guards';
import { PERMISSIONS } from '../../../lib/constants';
import type { ReportFilters } from '../../../lib/types';
import { differenceInDays, format } from 'date-fns';
import { clsx } from 'clsx';

interface ControlledReportProps { filters: ReportFilters; }

function ControlledTable({ filters }: ControlledReportProps) {
    const { data = [], isLoading } = useControlledReport(filters);

    const rows = data.flatMap(item =>
        (item.batches ?? []).filter(b => b.status === 'active' && b.quantity > 0).map(batch => ({
            id: batch.id,
            name: item.name,
            sku: item.sku,
            batch: batch.batch_number,
            qty: batch.quantity,
            unit: item.unit,
            cost_price: item.cost_price,
            expiry_date: batch.expiry_date,
            days_left: differenceInDays(new Date(batch.expiry_date), new Date()),
        }))
    );

    const exportRows = rows.map(r => [r.name, r.sku, r.batch, r.qty, r.unit, r.cost_price, r.expiry_date, r.days_left]);

    return (
        <div className="space-y-4">
            {/* Warning Banner */}
            <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                <ShieldAlert size={20} className="text-red-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-red-800">Controlled Substances Report — Restricted Access</p>
                    <p className="text-xs text-red-600 mt-0.5">
                        This report is audited. Access and exports are logged for compliance purposes. Handle all information in accordance with regulatory requirements.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-sm text-text-sub">{data.length} controlled substance{data.length !== 1 ? 's' : ''} · {rows.length} active batches</p>
                <ExportButton
                    filename="medflow-controlled-report"
                    headers={['Product', 'SKU', 'Batch', 'Qty', 'Unit', 'Cost Price', 'Expiry Date', 'Days Remaining']}
                    rows={exportRows}
                />
            </div>

            <div className="bg-card rounded-2xl border border-red-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-red-50 border-b border-red-100 sticky top-0">
                            <tr>
                                {['Product', 'SKU', 'Batch #', 'Quantity', 'Expiry Date', 'Days Left'].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-red-800 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-50/50">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-5 py-3.5"><div className="h-4 bg-red-50 rounded animate-pulse" /></td></tr>)
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={6} className="px-5 py-12 text-center text-text-dim text-sm">No active controlled substance batches</td></tr>
                            ) : (
                                rows.map(row => (
                                    <tr key={row.id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert size={13} className="text-red-500 shrink-0" />
                                                <span className="font-semibold text-text-main">{row.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-xs text-text-sub">{row.sku ?? '—'}</td>
                                        <td className="px-5 py-3.5 font-mono text-xs text-text-sub">{row.batch}</td>
                                        <td className="px-5 py-3.5 font-bold text-text-main">{row.qty} <span className="text-text-dim font-normal text-xs">{row.unit}</span></td>
                                        <td className="px-5 py-3.5 text-text-sub">{format(new Date(row.expiry_date), 'MMM d, yyyy')}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={clsx('text-xs font-semibold',
                                                row.days_left < 0 ? 'text-red-600' : row.days_left <= 30 ? 'text-amber-600' : 'text-text-sub')}>
                                                {row.days_left < 0 ? 'EXPIRED' : `${row.days_left}d`}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export function ControlledReport({ filters }: ControlledReportProps) {
    return (
        <PermissionGuard
            permission={PERMISSIONS.INVENTORY_CONTROLLED_VIEW}
            fallback={
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                        <Lock size={28} className="text-red-500" />
                    </div>
                    <div>
                        <p className="font-bold text-text-main text-lg">Access Restricted</p>
                        <p className="text-text-dim text-sm mt-1">You need <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">inventory.controlled.view</code> permission to view this report.</p>
                    </div>
                </div>
            }
        >
            <ControlledTable filters={filters} />
        </PermissionGuard>
    );
}
