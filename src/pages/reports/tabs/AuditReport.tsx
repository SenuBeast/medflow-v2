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
        if (action.includes('delete') || action.includes('remove')) return 'bg-danger-bg text-danger';
        if (action.includes('create') || action.includes('add')) return 'bg-success-bg text-success';
        if (action.includes('update') || action.includes('edit')) return 'bg-info-bg text-info';
        if (action.includes('approve')) return 'bg-success-bg text-success';
        if (action.includes('reject')) return 'bg-danger-bg text-danger';
        return 'bg-surface text-text-sub';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-text-sub">{data.length} log entries (latest 200)</p>
                <ExportButton
                    filename="medflow-audit-report"
                    headers={['User', 'Action', 'Entity Type', 'Entity ID', 'Timestamp']}
                    rows={exportRows}
                    pdf={{
                        title: 'Audit Log Report',
                        subtitle: 'Chronological activity log for operational and compliance review.',
                        filters,
                        summary: [
                            { label: 'Entries Exported', value: data.length.toString() },
                        ],
                        note: 'Audit data is confidential and should only be shared with authorized personnel.',
                        accentColor: [15, 23, 42],
                    }}
                />
            </div>

            <div className="bg-card rounded-2xl border border-border-dim overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface border-b border-border-main sticky top-0">
                            <tr>
                                {['User', 'Action', 'Entity', 'Entity ID', 'Timestamp'].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-main">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-5 py-3.5"><div className="h-4 bg-surface-dim rounded animate-pulse" /></td></tr>)
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-16 text-center">
                                        <Activity size={32} className="text-text-dim mx-auto mb-3" />
                                        <p className="text-text-dim text-sm">No audit logs in this period</p>
                                    </td>
                                </tr>
                            ) : (
                                data.map(log => (
                                    <tr key={log.id} className="hover:bg-surface-dim transition-colors">
                                        <td className="px-5 py-3.5">
                                            <p className="font-medium text-text-main">{(log.user as { full_name?: string })?.full_name ?? '—'}</p>
                                            <p className="text-xs text-text-dim">{(log.user as { email?: string })?.email}</p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${actionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-text-main capitalize">{log.entity_type}</td>
                                        <td className="px-5 py-3.5 font-mono text-xs text-text-dim max-w-[120px] truncate">{log.entity_id ?? '—'}</td>
                                        <td className="px-5 py-3.5 text-text-main whitespace-nowrap text-xs">
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
                    <div className="w-16 h-16 rounded-2xl bg-surface-dim flex items-center justify-center">
                        <Lock size={28} className="text-text-dim" />
                    </div>
                    <div>
                        <p className="font-bold text-text-main text-lg">Access Restricted</p>
                        <p className="text-text-dim text-sm mt-1">You need <code className="bg-surface-dim px-1.5 py-0.5 rounded text-xs">admin.audit.view</code> permission to view audit logs.</p>
                    </div>
                </div>
            }
        >
            <AuditTable filters={filters} />
        </PermissionGuard>
    );
}
