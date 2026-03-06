import { ClipboardCheck } from 'lucide-react';
import { useStockCountReport } from '../../../hooks/useReports';
import { ExportButton } from '../components/ExportButton';
import { StatusBadge } from '../../../components/ui/Badge';
import type { ReportFilters } from '../../../lib/types';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface StockCountReportProps { filters: ReportFilters; }

export function StockCountReport({ filters }: StockCountReportProps) {
    const { data = [], isLoading } = useStockCountReport(filters);

    // Variance summary — only approved sessions
    const approvedSessions = data.filter(s => s.status === 'approved');
    const totalVarianceItems = approvedSessions.flatMap(s =>
        (s.items ?? []).filter(i => i.variance !== null && i.variance !== 0)
    );

    const exportRows = data.map(s => [
        s.id, s.type, s.status,
        (s.creator as { full_name?: string })?.full_name ?? '',
        format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'),
        (s.items ?? []).length,
        (s.items ?? []).filter(i => i.variance !== null && i.variance !== 0).length,
    ]);

    return (
        <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Sessions', value: data.length },
                    { label: 'Approved', value: approvedSessions.length },
                    { label: 'Items with Variance', value: totalVarianceItems.length },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-500 font-medium">{label}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                ))}
            </div>

            {/* Sessions Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">Count Sessions</h3>
                    <ExportButton
                        filename="medflow-stock-count-report"
                        headers={['ID', 'Type', 'Status', 'Created By', 'Date', 'Total Items', 'Variance Items']}
                        rows={exportRows}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {['Type', 'Status', 'Created By', 'Date', 'Items', 'Variants', ''].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center">
                                        <ClipboardCheck size={32} className="text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 text-sm">No stock count sessions in this period</p>
                                    </td>
                                </tr>
                            ) : (
                                data.map(session => {
                                    const varianceCount = (session.items ?? []).filter(i => i.variance !== null && i.variance !== 0).length;
                                    return (
                                        <tr key={session.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-5 py-3.5 capitalize font-medium text-gray-800">{session.type}</td>
                                            <td className="px-5 py-3.5">
                                                <StatusBadge status={session.status as 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected'} />
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-600">{(session.creator as { full_name?: string })?.full_name ?? '—'}</td>
                                            <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{format(new Date(session.created_at), 'MMM d, yyyy')}</td>
                                            <td className="px-5 py-3.5 text-gray-600">{(session.items ?? []).length}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={clsx('font-semibold text-sm', varianceCount > 0 ? 'text-amber-600' : 'text-gray-400')}>
                                                    {varianceCount > 0 ? `${varianceCount} variances` : '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-blue-500">{session.status === 'approved' ? '✓' : ''}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
