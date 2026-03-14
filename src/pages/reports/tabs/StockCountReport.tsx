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
                    <div key={label} className="bg-card border border-border-dim rounded-xl p-4">
                        <p className="text-xs text-text-sub font-medium">{label}</p>
                        <p className="text-2xl font-bold text-text-main mt-1">{value}</p>
                    </div>
                ))}
            </div>

            {/* Sessions Table */}
            <div className="bg-card rounded-2xl border border-border-dim overflow-hidden">
                <div className="px-5 py-4 border-b border-border-dim flex items-center justify-between">
                    <h3 className="font-semibold text-text-main text-sm">Count Sessions</h3>
                    <ExportButton
                        filename="medflow-stock-count-report"
                        headers={['ID', 'Type', 'Status', 'Created By', 'Date', 'Total Items', 'Variance Items']}
                        rows={exportRows}
                        pdf={{
                            title: 'Stock Count Sessions Report',
                            subtitle: 'Cycle count activity, approvals, and variance overview.',
                            filters,
                            summary: [
                                { label: 'Total Sessions', value: data.length.toString() },
                                { label: 'Approved', value: approvedSessions.length.toString() },
                                { label: 'Variance Items', value: totalVarianceItems.length.toString() },
                            ],
                        }}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface border-b border-border-main">
                            <tr>
                                {['Type', 'Status', 'Created By', 'Date', 'Items', 'Variants', ''].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-main">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-5 py-3.5"><div className="h-4 bg-surface-dim rounded animate-pulse" /></td></tr>)
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center">
                                        <ClipboardCheck size={32} className="text-text-dim mx-auto mb-3" />
                                        <p className="text-text-dim text-sm">No stock count sessions in this period</p>
                                    </td>
                                </tr>
                            ) : (
                                data.map(session => {
                                    const varianceCount = (session.items ?? []).filter(i => i.variance !== null && i.variance !== 0).length;
                                    return (
                                        <tr key={session.id} className="hover:bg-surface-dim transition-colors">
                                            <td className="px-5 py-3.5 capitalize font-medium text-text-main">{session.type}</td>
                                            <td className="px-5 py-3.5">
                                                <StatusBadge status={session.status as 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected'} />
                                            </td>
                                            <td className="px-5 py-3.5 text-text-main">{(session.creator as { full_name?: string })?.full_name ?? '—'}</td>
                                            <td className="px-5 py-3.5 text-text-main whitespace-nowrap">{format(new Date(session.created_at), 'MMM d, yyyy')}</td>
                                            <td className="px-5 py-3.5 text-text-main">{(session.items ?? []).length}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={clsx('font-semibold text-sm', varianceCount > 0 ? 'text-warning' : 'text-text-main')}>
                                                    {varianceCount > 0 ? `${varianceCount} variances` : '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-brand">{session.status === 'approved' ? '✓' : ''}</td>
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
