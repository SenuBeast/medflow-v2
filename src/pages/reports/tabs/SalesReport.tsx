import { DollarSign, Receipt, TrendingUp } from 'lucide-react';
import { useSalesReport } from '../../../hooks/useReports';
import { ExportButton } from '../components/ExportButton';
import { StatusBadge } from '../../../components/ui/Badge';
import type { ReportFilters } from '../../../lib/types';
import { format } from 'date-fns';

interface SalesReportProps { filters: ReportFilters; }

export function SalesReport({ filters }: SalesReportProps) {
    const { data, isLoading } = useSalesReport(filters);

    const txExportRows = (data?.transactions ?? []).map(tx => [
        tx.invoice_number, format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm'),
        tx.seller?.full_name ?? '', (tx.items?.length ?? 0), tx.payment_method, tx.total.toFixed(2), tx.status,
    ]);
    const topExportRows = (data?.topProducts ?? []).map(p => [p.name, p.qty, p.revenue.toFixed(2)]);

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Revenue', value: `$${(data?.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: 'bg-blue-500' },
                    { label: 'Transactions', value: (data?.totalTransactions ?? 0).toString(), icon: Receipt, color: 'bg-emerald-500' },
                    { label: 'Avg. Order Value', value: `$${(data?.avgOrderValue ?? 0).toFixed(2)}`, icon: TrendingUp, color: 'bg-indigo-500' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center gap-3 bg-card border border-border-dim rounded-xl p-4">
                        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
                            <Icon size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-text-sub font-medium">{label}</p>
                            <p className="text-xl font-bold text-text-main">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Top Products */}
            <div className="bg-card rounded-2xl border border-border-dim overflow-hidden">
                <div className="px-5 py-4 border-b border-border-dim flex items-center justify-between">
                    <h3 className="font-semibold text-text-main text-sm">Top Products by Revenue</h3>
                    <ExportButton filename="medflow-top-products" headers={['Product', 'Qty Sold', 'Revenue']} rows={topExportRows} label="Export" />
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-surface-dim border-b border-border-dim">
                        <tr>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-text-sub uppercase tracking-wide">#</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-text-sub uppercase tracking-wide">Product</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-text-sub uppercase tracking-wide">Qty Sold</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-text-sub uppercase tracking-wide">Revenue</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={4} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                        ) : (data?.topProducts ?? []).length === 0 ? (
                            <tr><td colSpan={4} className="px-5 py-10 text-center text-text-dim text-sm">No sales in this period</td></tr>
                        ) : (
                            (data?.topProducts ?? []).map((p, i) => (
                                <tr key={p.name} className="hover:bg-surface-dim/60 transition-colors">
                                    <td className="px-5 py-3 text-text-dim font-mono text-xs w-8">{i + 1}</td>
                                    <td className="px-5 py-3 font-medium text-text-main">{p.name}</td>
                                    <td className="px-5 py-3 text-right text-text-sub">{p.qty}</td>
                                    <td className="px-5 py-3 text-right font-bold text-text-main">${p.revenue.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Transaction History */}
            <div className="bg-card rounded-2xl border border-border-dim overflow-hidden">
                <div className="px-5 py-4 border-b border-border-dim flex items-center justify-between">
                    <h3 className="font-semibold text-text-main text-sm">All Transactions</h3>
                    <ExportButton filename="medflow-sales-report" headers={['Invoice', 'Date', 'Staff', 'Items', 'Payment', 'Total', 'Status']} rows={txExportRows} />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-dim border-b border-border-dim">
                            <tr>
                                {['Invoice #', 'Date & Time', 'Staff', 'Items', 'Payment', 'Total', 'Status'].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                            ) : (data?.transactions ?? []).length === 0 ? (
                                <tr><td colSpan={7} className="px-5 py-12 text-center text-text-dim text-sm">No transactions in this period</td></tr>
                            ) : (
                                (data?.transactions ?? []).map(tx => (
                                    <tr key={tx.id} className="hover:bg-surface-dim/60 transition-colors">
                                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-600">{tx.invoice_number}</td>
                                        <td className="px-5 py-3.5 text-text-sub whitespace-nowrap">{format(new Date(tx.created_at), 'MMM d, yyyy · HH:mm')}</td>
                                        <td className="px-5 py-3.5 text-text-sub">{tx.seller?.full_name ?? '—'}</td>
                                        <td className="px-5 py-3.5 text-text-sub">{tx.items?.length ?? 0}</td>
                                        <td className="px-5 py-3.5 capitalize text-text-sub">{tx.payment_method}</td>
                                        <td className="px-5 py-3.5 font-bold text-text-main">${tx.total.toFixed(2)}</td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={tx.status as 'completed' | 'refunded' | 'partial_refund'} />
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
