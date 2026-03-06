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
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Stock Counts</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage physical inventory audits and cycle counts</p>
                </div>
                <PermissionGuard permission={PERMISSIONS.STOCK_COUNTS_PERFORM}>
                    <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
                        New Session
                    </Button>
                </PermissionGuard>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Active Counts</p>
                        <h3 className="text-2xl font-bold text-gray-900">{inProgressCounts}</h3>
                    </div>
                </Card>
                <Card className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Review</p>
                        <h3 className="text-2xl font-bold text-gray-900">{pendingApprovals}</h3>
                    </div>
                </Card>
                <Card className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Recently Approved</p>
                        <h3 className="text-2xl font-bold text-gray-900">{recentlyApproved}</h3>
                    </div>
                </Card>
            </div>

            {/* Sessions Table */}
            <Card className="flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="relative w-64">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                            placeholder="Search sessions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-medium">Session ID</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Created By</th>
                                <th className="px-6 py-4 font-medium">Date Created</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Loading sessions...
                                    </td>
                                </tr>
                            ) : filteredSessions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No stock count sessions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredSessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                            {session.id.substring(0, 8).toUpperCase()}
                                        </td>
                                        <td className="px-6 py-4 capitalize font-medium text-gray-900">
                                            {session.type} Count
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={session.status as "draft" | "in_progress" | "submitted" | "approved" | "rejected"} />
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {session.creator?.full_name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {format(new Date(session.created_at), 'MMM d, yyyy h:mm a')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => navigate(`/inventory/stock-counts/${session.id}`)}
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

