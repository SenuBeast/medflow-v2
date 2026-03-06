import { useState } from 'react';
import { Package, TrendingDown, AlertCircle } from 'lucide-react';
import { useInventoryReport } from '../../../hooks/useReports';
import { ExportButton } from '../components/ExportButton';
import type { ReportFilters } from '../../../lib/types';
import { clsx } from 'clsx';

type StockFilter = 'all' | 'low' | 'out';

interface InventoryReportProps { filters: ReportFilters; }

export function InventoryReport({ filters }: InventoryReportProps) {
    const { data = [], isLoading } = useInventoryReport(filters);
    const [stockFilter, setStockFilter] = useState<StockFilter>('all');
    const [sortKey, setSortKey] = useState<'name' | 'total_stock' | 'total_value'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const displayed = data
        .filter(r => stockFilter === 'all' ? true : r.status === stockFilter)
        .sort((a, b) => {
            const av = a[sortKey]; const bv = b[sortKey];
            const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
            return sortDir === 'asc' ? cmp : -cmp;
        });

    const totalValue = data.reduce((s, r) => s + r.total_value, 0);
    const lowCount = data.filter(r => r.status === 'low').length;
    const outCount = data.filter(r => r.status === 'out').length;

    const toggleSort = (key: typeof sortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };
    const renderSortIcon = (k: typeof sortKey) => (
        <span className="ml-1 text-gray-400">{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    );

    const exportRows = displayed.map(r => [r.name, r.sku, r.category, r.total_stock, r.unit, r.minimum_order_quantity, r.cost_price, r.selling_price, r.total_value.toFixed(2), r.status]);

    return (
        <div className="space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Items', value: data.length, icon: Package, color: 'bg-blue-500' },
                    { label: 'Low Stock', value: lowCount, icon: TrendingDown, color: 'bg-amber-500' },
                    { label: 'Out of Stock', value: outCount, icon: AlertCircle, color: 'bg-red-500' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
                        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
                            <Icon size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{label}</p>
                            <p className="text-xl font-bold text-gray-900">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sub-filter + Export */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    {(['all', 'low', 'out'] as StockFilter[]).map(f => (
                        <button key={f} onClick={() => setStockFilter(f)}
                            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
                                stockFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                            {f === 'all' ? 'All Items' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
                        </button>
                    ))}
                </div>
                <ExportButton
                    filename="medflow-inventory-report"
                    headers={['Name', 'SKU', 'Category', 'Stock', 'Unit', 'Reorder Lvl', 'Cost Price', 'Sell Price', 'Total Value', 'Status']}
                    rows={exportRows}
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                            <tr>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('name')}>
                                    Product {renderSortIcon('name')}
                                </th>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('total_stock')}>
                                    Stock {renderSortIcon('total_stock')}
                                </th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reorder At</th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('total_value')}>
                                    Value {renderSortIcon('total_value')}
                                </th>
                                <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i}><td colSpan={6} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                                ))
                            ) : displayed.length === 0 ? (
                                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">No items match the current filters</td></tr>
                            ) : (
                                displayed.map(row => (
                                    <tr key={row.id} className={clsx('hover:bg-gray-50/60 transition-colors', row.status === 'out' && 'bg-red-50/40', row.status === 'low' && 'bg-amber-50/40')}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">{row.name}</span>
                                                {row.is_controlled && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded">CD</span>}
                                            </div>
                                            {row.sku && <p className="text-xs text-gray-400 font-mono">{row.sku}</p>}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500 text-xs">{row.category ?? '—'}</td>
                                        <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{row.total_stock} <span className="text-gray-400 font-normal text-xs">{row.unit}</span></td>
                                        <td className="px-5 py-3.5 text-right text-gray-500">{row.minimum_order_quantity}</td>
                                        <td className="px-5 py-3.5 text-right font-semibold text-gray-900">${row.total_value.toFixed(2)}</td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full',
                                                row.status === 'ok' ? 'bg-green-100 text-green-700' :
                                                    row.status === 'low' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700')}>
                                                {row.status === 'ok' ? 'OK' : row.status === 'low' ? 'Low Stock' : 'Out of Stock'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {displayed.length > 0 && (
                            <tfoot className="bg-gray-50 border-t border-gray-100">
                                <tr>
                                    <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total Inventory Value</td>
                                    <td className="px-5 py-3 text-right font-bold text-gray-900">${totalValue.toFixed(2)}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
