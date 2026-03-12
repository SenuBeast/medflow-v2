import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { PermissionGuard } from '../../components/auth/Guards';
import { useStockCountSessions } from '../../hooks/useStockCounts';
import { PERMISSIONS } from '../../lib/constants';
import { Plus, Search, ClipboardList, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { CreateSessionModal } from '../../components/inventory/stock-counts/CreateSessionModal';
import { useNavigate } from 'react-router-dom';

export function StockCountsPage() {
    const { data: sessions = [], isLoading } = useStockCountSessions();
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const navigate = useNavigate();

    const pendingApprovals = sessions.filter(s => s.status === 'submitted').length;
    const inProgressCounts = sessions.filter(s => s.status === 'in_progress' || s.status === 'draft').length;
    const recentlyApproved = sessions.filter(s => s.status === 'approved').length; // simple metric

    const filteredSessions = sessions.filter(s => {
        const matchesSearch =
            (s.notes?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (s.creator?.full_name?.toLowerCase() || '').includes(search.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-text-main">Stock Counts</h1>
                    <p className="text-text-sub text-xs md:text-sm mt-0.5">Manage physical inventory audits and cycle counts</p>
                </div>
                <PermissionGuard permission={PERMISSIONS.STOCK_COUNTS_PERFORM}>
                    <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
                        <span className="hidden sm:inline">New Session</span>
                        <span className="sm:hidden">New</span>
                    </Button>
                </PermissionGuard>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <Card className="p-3 md:p-5 flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <ClipboardList size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <p className="text-xs md:text-sm font-medium text-text-sub">Active Counts</p>
                        <h3 className="text-lg md:text-2xl font-bold text-text-main">{inProgressCounts}</h3>
                    </div>
                </Card>
                <Card className="p-3 md:p-5 flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                        <AlertTriangle size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <p className="text-xs md:text-sm font-medium text-text-sub">Pending Review</p>
                        <h3 className="text-lg md:text-2xl font-bold text-text-main">{pendingApprovals}</h3>
                    </div>
                </Card>
                <Card className="col-span-2 md:col-span-1 p-3 md:p-5 flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                        <CheckCircle size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <p className="text-xs md:text-sm font-medium text-text-sub">Recently Approved</p>
                        <h3 className="text-lg md:text-2xl font-bold text-text-main">{recentlyApproved}</h3>
                    </div>
                </Card>
            </div>

            {/* Sessions — Mobile Card View */}
            <div className="md:hidden space-y-3">
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                    <input
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border-main text-sm bg-surface-dim focus:bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                        placeholder="Search sessions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {isLoading ? (
                    <Card className="p-8 text-center text-text-sub text-sm">Loading sessions...</Card>
                ) : filteredSessions.length === 0 ? (
                    <Card className="p-8 text-center text-text-sub text-sm">No stock count sessions found.</Card>
                ) : (
                    filteredSessions.map((session) => (
                        <Card key={session.id} className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-xs text-text-sub">{session.id.substring(0, 8).toUpperCase()}</span>
                                <StatusBadge status={session.status as "draft" | "in_progress" | "submitted" | "approved" | "rejected"} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-text-dim">Type</span>
                                    <p className="font-medium text-text-main capitalize">{session.type} Count</p>
                                </div>
                                <div>
                                    <span className="text-text-dim">Created By</span>
                                    <p className="font-medium text-text-main truncate">{session.creator?.full_name || 'Unknown'}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-text-dim">Date</span>
                                    <p className="font-medium text-text-main">{format(new Date(session.created_at), 'MMM d, yyyy h:mm a')}</p>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full min-h-[40px]"
                                onClick={() => navigate(`/stock-counts/${session.id}`)}
                            >
                                View Details
                            </Button>
                        </Card>
                    ))
                )}
            </div>

            {/* Sessions — Desktop Table */}
            <Card className="hidden md:flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-border-dim flex items-center justify-between">
                    <div className="relative w-64">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                        <input
                            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-main text-sm bg-surface-dim focus:bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                            placeholder="Search sessions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-text-sub uppercase bg-surface-dim/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 lg:px-6 py-4 font-medium">Session ID</th>
                                <th className="px-4 lg:px-6 py-4 font-medium">Type</th>
                                <th className="px-4 lg:px-6 py-4 font-medium">Status</th>
                                <th className="px-4 lg:px-6 py-4 font-medium">Created By</th>
                                <th className="px-4 lg:px-6 py-4 font-medium">Date Created</th>
                                <th className="px-4 lg:px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-text-sub">
                                        Loading sessions...
                                    </td>
                                </tr>
                            ) : filteredSessions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-text-sub">
                                        No stock count sessions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredSessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-surface-dim/50 transition-colors">
                                        <td className="px-4 lg:px-6 py-4 font-mono text-xs text-text-sub">
                                            {session.id.substring(0, 8).toUpperCase()}
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 capitalize font-medium text-text-main">
                                            {session.type} Count
                                        </td>
                                        <td className="px-4 lg:px-6 py-4">
                                            <StatusBadge status={session.status as "draft" | "in_progress" | "submitted" | "approved" | "rejected"} />
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 text-text-sub">
                                            {session.creator?.full_name || 'Unknown'}
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 text-text-sub">
                                            {format(new Date(session.created_at), 'MMM d, yyyy h:mm a')}
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 text-right">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => navigate(`/stock-counts/${session.id}`)}
                                            >
                                                View Details
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <CreateSessionModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
            />
        </div>
    );
}

