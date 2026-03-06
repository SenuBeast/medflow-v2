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
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    {([30, 60, 90, 'expired'] as const).map(w => (
                        <button key={w} onClick={() => onFiltersChange({ ...filters, expiryWindow: w })}
                            className={clsx('px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                                window === w
                                    ? w === 'expired' ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700')}>
                            {w === 'expired' ? '🚫 Expired' : `⚠️ Next ${w} days`}
                        </button>
                    ))}
                </div>
                <ExportButton
                    filename={`medflow-expiry-${window}d`}
                    headers={['Product', 'SKU', 'Batch', 'Qty', 'Expiry Date', 'Days Remaining', 'Status']}
                    rows={exportRows}
                />
            </div>

            {/* Critical banner */}
            {window === 'expired' && data.length > 0 && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <CalendarX size={18} className="text-red-600 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-red-800">{data.length} expired batch{data.length > 1 ? 'es' : ''} found</p>
                        <p className="text-xs text-red-600 mt-0.5">These items should be quarantined or disposed immediately.</p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                            <tr>
                                {['Product', 'Batch #', 'Quantity', 'Expiry Date', 'Days Remaining', 'Severity'].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center">
                                        <AlertTriangle size={32} className="text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 text-sm">
                                            {window === 'expired' ? 'No expired batches found — great!' : `No batches expiring in the next ${window} days`}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                data.map(row => (
                                    <tr key={row.id} className={clsx('hover:bg-gray-50/60 transition-colors',
                                        row.status === 'expired' && 'bg-red-50/50',
                                        row.status === 'critical' && 'bg-amber-50/40')}>
                                        <td className="px-5 py-3.5">
                                            <p className="font-medium text-gray-900">{row.item_name}</p>
                                            {row.item_sku && <p className="text-xs text-gray-400 font-mono">{row.item_sku}</p>}
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{row.batch_number}</td>
                                        <td className="px-5 py-3.5 font-semibold text-gray-900">{row.quantity}</td>
                                        <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{format(new Date(row.expiry_date), 'MMM d, yyyy')}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={clsx('font-bold',
                                                row.status === 'expired' ? 'text-red-600' :
                                                    row.status === 'critical' ? 'text-amber-600' : 'text-gray-600')}>
                                                {row.days_to_expiry < 0 ? `${Math.abs(row.days_to_expiry)}d ago` : `${row.days_to_expiry}d`}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full',
                                                row.status === 'expired' ? 'bg-red-100 text-red-700' :
                                                    row.status === 'critical' ? 'bg-amber-100 text-amber-700' :
                                                        row.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700')}>
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
