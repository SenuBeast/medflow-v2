import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { useStockCountSession, useUpdateStockCountItem, useSubmitStockCountSession, useApproveStockCountSession } from '../../hooks/useStockCounts';
import { PERMISSIONS } from '../../lib/constants';
import { ArrowLeft, Search, CheckCircle2, XCircle, ShieldAlert, History } from 'lucide-react';
import { format } from 'date-fns';
import { AuditLogDrawer } from '../../components/inventory/stock-counts/AuditLogDrawer';
import { hasPermission } from '../../lib/permissionUtils';

export function StockCountSessionPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: session, isLoading } = useStockCountSession(id!);
    const updateItem = useUpdateStockCountItem();
    const submitSession = useSubmitStockCountSession();
    const approveSession = useApproveStockCountSession();

    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [showAuditLogs, setShowAuditLogs] = useState(false);

    // State to hold local physical_count edits before debounced auto-save or explicit save
    // Normally we might use a robust form library but for a highly dynamic table, local state synced to DB works well.
    const [localCounts, setLocalCounts] = useState<Record<string, string>>({});

    const handleCountChange = (itemId: string, val: string) => {
        setLocalCounts(prev => ({ ...prev, [itemId]: val }));
    };

    const handleSaveItem = async (itemId: string) => {
        const valStr = localCounts[itemId];
        if (valStr && valStr.trim() !== '') {
            const num = parseInt(valStr, 10);
            if (!isNaN(num) && num >= 0) {
                await updateItem.mutateAsync({ id: itemId, physical_count: num });
            }
        }
    };

    const items = session?.items;
    const filteredItems = useMemo(() => {
        if (!items) return [];
        return items.filter(countItem => {
            const searchMatch =
                (countItem.item?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
                (countItem.item?.sku?.toLowerCase() || '').includes(search.toLowerCase()) ||
                (countItem.batch?.batch_number?.toLowerCase() || '').includes(search.toLowerCase());

            const catMatch = filterCategory === 'all' || countItem.item?.category === filterCategory;

            return searchMatch && catMatch;
        });
    }, [items, search, filterCategory]);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        items?.forEach(i => { if (i.item?.category) cats.add(i.item.category); });
        return Array.from(cats);
    }, [items]);

    const isEditable = session?.status === 'draft' || session?.status === 'in_progress';
    const isPendingApproval = session?.status === 'submitted';
    const canPerform = hasPermission(PERMISSIONS.STOCK_COUNTS_PERFORM);
    const canApprove = hasPermission(PERMISSIONS.STOCK_COUNTS_APPROVE);
    const totalCounted = session?.items?.filter(i => i.physical_count !== null).length || 0;
    const progressPct = session?.items?.length ? Math.round((totalCounted / session.items.length) * 100) : 0;

    const progressRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (progressRef.current) {
            progressRef.current.style.width = `${progressPct}%`;
        }
    }, [progressPct]);

    if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading session details...</div>;
    if (!session) return <div className="p-8 text-center text-red-500">Session not found.</div>;

    return (
        <div className="max-w-[1400px] mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <button
                        title="Back to Stock Counts"
                        onClick={() => navigate('/inventory/stock-counts')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500 mt-1"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 font-mono tracking-tight uppercase">
                                Count #{session.id.substring(0, 8)}
                            </h1>
                            <StatusBadge status={session.status as "draft" | "in_progress" | "submitted" | "approved" | "rejected"} />
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            {session.type.charAt(0).toUpperCase() + session.type.slice(1)} Count · Created by {session.creator?.full_name} on {format(new Date(session.created_at), 'PPP')}
                        </p>
                        {session.notes && <p className="text-gray-600 text-sm italic mt-2 bg-gray-50 p-2 rounded">"{session.notes}"</p>}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        icon={<History size={16} />}
                        onClick={() => setShowAuditLogs(true)}
                    >
                        Audit Trail
                    </Button>

                    {isEditable && canPerform && (
                        <Button
                            variant="primary"
                            icon={<CheckCircle2 size={16} />}
                            loading={submitSession.isPending}
                            disabled={totalCounted === 0}
                            onClick={async () => {
                                if (window.confirm("Submit this count for manager approval? You won't be able to edit it afterwards.")) {
                                    await submitSession.mutateAsync(session.id);
                                }
                            }}
                        >
                            Submit Count
                        </Button>
                    )}

                    {isPendingApproval && canApprove && (
                        <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
                            <Button
                                variant="secondary"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                icon={<XCircle size={16} />}
                                onClick={() => approveSession.mutateAsync({ sessionId: session.id, isApproved: false })}
                                loading={approveSession.isPending}
                            >
                                Reject
                            </Button>
                            <Button
                                variant="primary"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                icon={<CheckCircle2 size={16} />}
                                onClick={async () => {
                                    if (window.confirm("Approve this count? This will IMMEDIATELY update your inventory stock levels across all counted batches.")) {
                                        await approveSession.mutateAsync({ sessionId: session.id, isApproved: true });
                                    }
                                }}
                                loading={approveSession.isPending}
                            >
                                Approve & Update Stock
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <Card className="p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">Completion Progress</span>
                    <span className="text-gray-500">{totalCounted} of {session.items?.length || 0} batches counted ({progressPct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                        ref={progressRef}
                        className={`h-2 rounded-full transition-all duration-500 ${progressPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    />
                </div>
            </Card>

            {/* Table Area */}
            <Card className="flex flex-col min-h-[500px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="relative w-72">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                                placeholder="Search by name, SKU, or batch..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {categories.length > 0 && (
                            <select
                                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                title="Filter by Category"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                {/* Main Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 font-medium">Item Details</th>
                                <th className="px-6 py-4 font-medium">Batch info</th>
                                <th className="px-6 py-4 font-medium text-center">System Qty</th>
                                <th className="px-6 py-4 font-medium bg-blue-50/50">Physical Count</th>
                                <th className="px-6 py-4 font-medium text-center">Variance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredItems.map(row => {
                                const physicalValue = localCounts[row.id] !== undefined ? localCounts[row.id] : (row.physical_count?.toString() || '');
                                const variance = row.variance !== undefined ? row.variance : null;

                                return (
                                    <tr key={row.id} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                {row.item?.is_controlled && (
                                                    <span title="Controlled Substance">
                                                        <ShieldAlert size={14} className="text-red-500" />
                                                    </span>
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900">{row.item?.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{row.item?.sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <p className="font-mono text-gray-900">{row.batch?.batch_number}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Exp: {row.batch?.expiry_date ? format(new Date(row.batch.expiry_date), 'MMM yyyy') : 'N/A'}</p>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded bg-gray-100 font-medium text-gray-700">
                                                {row.system_quantity}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 bg-blue-50/10">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    disabled={!isEditable || !canPerform}
                                                    value={physicalValue}
                                                    onChange={(e) => handleCountChange(row.id, e.target.value)}
                                                    onBlur={() => handleSaveItem(row.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur(); // Trigger onBlur save
                                                        }
                                                    }}
                                                    placeholder="Enter count..."
                                                    className="w-28 px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 font-medium"
                                                />
                                                {updateItem.isPending && updateItem.variables?.id === row.id && (
                                                    <span className="text-xs text-blue-500 animate-pulse">Saving...</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {variance === null ? (
                                                <span className="text-gray-300">—</span>
                                            ) : (
                                                <span className={`inline-flex font-bold px-2.5 py-1 rounded-full text-xs ${variance > 0 ? 'bg-emerald-100 text-emerald-700' :
                                                    variance < 0 ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {variance > 0 ? '+' : ''}{variance}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No items matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <AuditLogDrawer
                sessionId={session.id}
                isOpen={showAuditLogs}
                onClose={() => setShowAuditLogs(false)}
            />
        </div>
    );
}

