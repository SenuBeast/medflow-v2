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
        <span className="ml-1 text-text-dim">{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
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

            {/* Sub-filter + Export */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex gap-1 bg-surface-dim/50 border border-border-dim/50 p-1 rounded-2xl">
                    {(['all', 'low', 'out'] as StockFilter[]).map(f => {
                        const isActive = stockFilter === f;
                        return (
                            <button
                                key={f}
                                onClick={() => setStockFilter(f)}
                                className={clsx(
                                    'px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-200',
                                    isActive
                                        ? 'bg-text-main text-text-inverse shadow-sm scale-[1.02]'
                                        : 'text-text-dim hover:text-text-main hover:bg-surface-elevated/50'
                                )}
                            >
                                {f === 'all' ? 'All Items' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
                            </button>
                        );
                    })}
                </div>
                <ExportButton
                    filename="medflow-inventory-report"
                    headers={['Name', 'SKU', 'Category', 'Stock', 'Unit', 'Reorder Lvl', 'Cost Price', 'Sell Price', 'Total Value', 'Status']}
                    rows={exportRows}
                    pdf={{
                        title: 'Inventory Position Report',
                        subtitle: 'Current stock levels, valuation, and replenishment status.',
                        filters,
                        summary: [
                            { label: 'Total Items', value: data.length.toString() },
                            { label: 'Low Stock', value: lowCount.toString() },
                            { label: 'Out of Stock', value: outCount.toString() },
                            { label: 'Inventory Value', value: `$${totalValue.toFixed(2)}` },
                        ],
                    }}
                />
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border-dim overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface border-b border-border-main sticky top-0">
                            <tr>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('name')}>
                                    Product {renderSortIcon('name')}
                                </th>
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide">Category</th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('total_stock')}>
                                    Stock {renderSortIcon('total_stock')}
                                </th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide">Reorder At</th>
                                <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('total_value')}>
                                    Value {renderSortIcon('total_value')}
                                </th>
                                <th className="text-center px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-main">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i}><td colSpan={6} className="px-5 py-3.5"><div className="h-4 bg-surface-dim rounded animate-pulse" /></td></tr>
                                ))
                            ) : displayed.length === 0 ? (
                                <tr><td colSpan={6} className="px-5 py-12 text-center text-text-dim text-sm">No items match the current filters</td></tr>
                            ) : (
                                displayed.map(row => (
                                    <tr key={row.id} className={clsx('hover:bg-surface-dim transition-colors', row.status === 'out' && 'bg-danger-bg', row.status === 'low' && 'bg-warning-bg')}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-text-main">{row.name}</span>
                                                {row.is_controlled && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-danger-bg text-danger rounded">CD</span>}
                                            </div>
                                            {row.sku && <p className="text-xs text-text-dim font-mono">{row.sku}</p>}
                                        </td>
                                        <td className="px-5 py-3.5 text-text-sub text-xs">{row.category ?? '—'}</td>
                                        <td className="px-5 py-3.5 text-right font-semibold text-text-main">{row.total_stock} <span className="text-text-dim font-normal text-xs">{row.unit}</span></td>
                                        <td className="px-5 py-3.5 text-right text-text-main">{row.minimum_order_quantity}</td>
                                        <td className="px-5 py-3.5 text-right font-semibold text-text-main">${row.total_value.toFixed(2)}</td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full',
                                                row.status === 'ok' ? 'bg-success-bg text-success' :
                                                    row.status === 'low' ? 'bg-warning-bg text-warning' :
                                                        'bg-danger-bg text-danger')}>
                                                {row.status === 'ok' ? 'OK' : row.status === 'low' ? 'Low Stock' : 'Out of Stock'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {displayed.length > 0 && (
                            <tfoot className="bg-surface-dim border-t border-border-dim">
                                <tr>
                                    <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-text-sub uppercase">Total Inventory Value</td>
                                    <td className="px-5 py-3 text-right font-bold text-text-main">${totalValue.toFixed(2)}</td>
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
