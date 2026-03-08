import { useEffect } from 'react';
import { useStockCountAuditLogs } from '../../../hooks/useStockCounts';
import { format } from 'date-fns';
import { X, UserIcon, Activity } from 'lucide-react';
import { clsx } from 'clsx';

interface AuditLogDrawerProps {
    sessionId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function AuditLogDrawer({ sessionId, isOpen, onClose }: AuditLogDrawerProps) {
    const { data: logs, isLoading } = useStockCountAuditLogs(sessionId);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden text-sm">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md flex flex-col bg-card shadow-xl transform transition-transform duration-300 ease-in-out border-l border-border-dim">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-dim bg-surface-dim/50">
                    <div>
                        <h2 className="text-lg font-bold text-text-main">Audit Trail</h2>
                        <p className="text-xs text-text-sub">History for session #{sessionId.substring(0, 8)}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-text-dim hover:text-text-sub hover:bg-gray-100 rounded-full transition-colors"
                        title="Close Audit Trail"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {isLoading ? (
                        <div className="text-center py-10 text-text-sub">Loading audit trail...</div>
                    ) : !logs || logs.length === 0 ? (
                        <div className="text-center py-10 text-text-sub">No logs found for this session.</div>
                    ) : (
                        <div className="relative border-l-2 border-border-dim ml-4 space-y-8">
                            {logs.map((log, index) => {
                                const isLatest = index === 0;
                                return (
                                    <div key={log.id} className="relative pl-6">
                                        <span className={clsx(
                                            "absolute -left-2.5 top-1 h-5 w-5 rounded-full flex items-center justify-center ring-4 ring-white",
                                            isLatest ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-text-dim"
                                        )}>
                                            <Activity size={12} />
                                        </span>

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-text-main capitalize">
                                                    {log.action}
                                                </h3>
                                                <span className="text-xs text-text-sub whitespace-nowrap ml-2">
                                                    {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-surface-dim rounded-lg text-xs text-text-sub">
                                                <UserIcon size={14} className="text-text-dim" />
                                                <span>{log.user?.full_name || 'System User'}</span>
                                            </div>

                                            {log.details && Object.keys(log.details).length > 0 && (
                                                <div className="mt-2 text-xs font-mono bg-slate-800 text-slate-300 p-3 rounded-lg overflow-x-auto shadow-inner">
                                                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

