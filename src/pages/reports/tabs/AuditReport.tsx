import { Lock, Activity } from 'lucide-react';
import { useAuditReport } from '../../../hooks/useReports';
import { ExportButton } from '../components/ExportButton';
import { PermissionGuard } from '../../../components/auth/Guards';
import { PERMISSIONS } from '../../../lib/constants';
import type { ReportFilters } from '../../../lib/types';
import { format } from 'date-fns';

interface AuditReportProps { filters: ReportFilters; }

function AuditTable({ filters }: AuditReportProps) {
    const { data = [], isLoading } = useAuditReport(filters);

    const exportRows = data.map(log => [
        (log.user as { full_name?: string })?.full_name ?? '',
        log.action,
        log.entity_type,
        log.entity_id ?? '',
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
    ]);

    const actionColor = (action: string) => {
        if (action.includes('delete') || action.includes('remove')) return 'bg-red-100 text-red-700';
        if (action.includes('create') || action.includes('add')) return 'bg-green-100 text-green-700';
        if (action.includes('update') || action.includes('edit')) return 'bg-blue-100 text-blue-700';
        if (action.includes('approve')) return 'bg-emerald-100 text-emerald-700';
        if (action.includes('reject')) return 'bg-rose-100 text-rose-700';
        return 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{data.length} log entries (latest 200)</p>
                <ExportButton
                    filename="medflow-audit-report"
                    headers={['User', 'Action', 'Entity Type', 'Entity ID', 'Timestamp']}
                    rows={exportRows}
                />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                            <tr>
                                {['User', 'Action', 'Entity', 'Entity ID', 'Timestamp'].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-16 text-center">
                                        <Activity size={32} className="text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 text-sm">No audit logs in this period</p>
                                    </td>
                                </tr>
                            ) : (
                                data.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <p className="font-medium text-gray-900">{(log.user as { full_name?: string })?.full_name ?? '—'}</p>
                                            <p className="text-xs text-gray-400">{(log.user as { email?: string })?.email}</p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${actionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-600 capitalize">{log.entity_type}</td>
                                        <td className="px-5 py-3.5 font-mono text-xs text-gray-400 max-w-[120px] truncate">{log.entity_id ?? '—'}</td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">
                                            {format(new Date(log.created_at), 'MMM d, yyyy · HH:mm')}
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

export function AuditReport({ filters }: AuditReportProps) {
    return (
        <PermissionGuard
            permission={PERMISSIONS.ADMIN_AUDIT_VIEW}
            fallback={
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <Lock size={28} className="text-gray-400" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-lg">Access Restricted</p>
                        <p className="text-gray-400 text-sm mt-1">You need <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">admin.audit.view</code> permission to view audit logs.</p>
                    </div>
                </div>
            }
        >
            <AuditTable filters={filters} />
        </PermissionGuard>
    );
}
