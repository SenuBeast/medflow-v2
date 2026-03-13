import { AlertTriangle, CalendarX } from 'lucide-react';
import { useExpiryReport } from '../../../hooks/useReports';
import { ExportButton } from '../components/ExportButton';
import type { ReportFilters } from '../../../lib/types';
import { clsx } from 'clsx';
import { format } from 'date-fns';

interface ExpiryReportProps { filters: ReportFilters; onFiltersChange: (f: ReportFilters) => void; }

export function ExpiryReport({ filters, onFiltersChange }: ExpiryReportProps) {
    const { data = [], isLoading } = useExpiryReport(filters);
    const window = filters.expiryWindow ?? 30;

    const exportRows = data.map(r => [r.item_name, r.item_sku, r.batch_number, r.quantity, r.expiry_date, r.days_to_expiry, r.status]);

    return (
        <div className="space-y-4">
            {/* Window Tabs */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-surface-dim/50 border border-border-dim/50 p-1 rounded-2xl">
                    {([30, 60, 90, 'expired'] as const).map(w => {
                        const isActive = window === w;
                        return (
                            <button
                                key={w}
                                onClick={() => onFiltersChange({ ...filters, expiryWindow: w })}
                                className={clsx(
                                    'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap',
                                    isActive
                                        ? 'bg-text-main text-text-inverse shadow-md scale-[1.02]'
                                        : 'text-text-dim hover:text-text-main hover:bg-surface-elevated/50'
                                )}
                            >
                                {w === 'expired' ? '🚫 Expired' : `⚠️ Next ${w} days`}
                            </button>
                        );
                    })}
                </div>
                <ExportButton
                    filename={`medflow-expiry-${window}d`}
                    headers={['Product', 'SKU', 'Batch', 'Qty', 'Expiry Date', 'Days Remaining', 'Status']}
                    rows={exportRows}
                />
            </div>

            {/* Critical banner */}
            {window === 'expired' && data.length > 0 && (
                <div className="flex items-center gap-3 p-4 bg-danger-bg border border-danger-border rounded-xl">
                    <CalendarX size={18} className="text-danger shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-danger">{data.length} expired batch{data.length > 1 ? 'es' : ''} found</p>
                        <p className="text-xs text-danger mt-0.5">These items should be quarantined or disposed immediately.</p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border-dim overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface border-b border-border-main sticky top-0">
                            <tr>
                                {['Product', 'Batch #', 'Quantity', 'Expiry Date', 'Days Remaining', 'Severity'].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-main">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-5 py-3.5"><div className="h-4 bg-surface-dim rounded animate-pulse" /></td></tr>)
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center">
                                        <AlertTriangle size={32} className="text-text-dim mx-auto mb-3" />
                                        <p className="text-text-dim text-sm">
                                            {window === 'expired' ? 'No expired batches found — great!' : `No batches expiring in the next ${window} days`}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                data.map(row => (
                                    <tr key={row.id} className={clsx('hover:bg-surface-dim transition-colors',
                                        row.status === 'expired' && 'bg-danger-bg',
                                        row.status === 'critical' && 'bg-warning-bg')}>
                                        <td className="px-5 py-3.5">
                                            <p className="font-medium text-text-main">{row.item_name}</p>
                                            {row.item_sku && <p className="text-xs text-text-dim font-mono">{row.item_sku}</p>}
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-xs text-text-main">{row.batch_number}</td>
                                        <td className="px-5 py-3.5 font-semibold text-text-main">{row.quantity}</td>
                                        <td className="px-5 py-3.5 text-text-main whitespace-nowrap">{format(new Date(row.expiry_date), 'MMM d, yyyy')}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={clsx('font-bold',
                                                row.status === 'expired' ? 'text-danger' :
                                                    row.status === 'critical' ? 'text-warning' : 'text-text-main')}>
                                                {row.days_to_expiry < 0 ? `${Math.abs(row.days_to_expiry)}d ago` : `${row.days_to_expiry}d`}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full',
                                                row.status === 'expired' ? 'bg-danger-bg text-danger' :
                                                    row.status === 'critical' ? 'bg-warning-bg text-warning' :
                                                        row.status === 'warning' ? 'bg-warning-bg text-warning' :
                                                            'bg-success-bg text-success')}>
                                                {row.status === 'expired' ? 'Expired' : row.status === 'critical' ? 'Critical' : row.status === 'warning' ? 'Warning' : 'OK'}
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
